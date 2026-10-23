use axum::{
    extract::Request,
    http::{header, HeaderMap, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use hmac::{Hmac, Mac};
use serde_json::json;
use sha2::Sha256;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use subtle::ConstantTimeEq;

type HmacSha256 = Hmac<Sha256>;

pub const SESSION_COOKIE_NAME: &str = "filez_session";
const SESSION_TTL_SECONDS: u64 = 86400; // 24 hours

#[derive(Clone)]
pub struct AuthService {
    passphrase: Arc<String>,
    hmac_key: [u8; 32],
}

impl AuthService {
    pub fn new(passphrase: String) -> Self {
        // Derive HMAC key deterministically from the passphrase using HMAC-SHA256
        // with a domain-separated salt so server restarts preserve valid user sessions.
        let mut key = [0u8; 32];
        let mut mac = <HmacSha256 as Mac>::new_from_slice(b"filez_session_secret_seed_v1")
            .expect("valid key length");
        mac.update(passphrase.as_bytes());
        let result = mac.finalize().into_bytes();
        key.copy_from_slice(&result[0..32]);

        Self {
            passphrase: Arc::new(passphrase),
            hmac_key: key,
        }
    }

    /// Verifies candidate passphrase against configured passphrase in constant time.
    pub fn verify_passphrase(&self, candidate: &str) -> bool {
        let expected = self.passphrase.as_bytes();
        let candidate_bytes = candidate.as_bytes();

        if expected.len() != candidate_bytes.len() {
            return false;
        }

        expected.ct_eq(candidate_bytes).into()
    }

    /// Generates an HMAC-signed session token: `<timestamp>.<hex_hmac>`.
    pub fn create_session_token(&self) -> String {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let sig = self.compute_signature(timestamp);
        format!("{}.{}", timestamp, sig)
    }

    /// Verifies that a session token is valid and not expired.
    pub fn verify_session_token(&self, token: &str) -> bool {
        let parts: Vec<&str> = token.split('.').collect();
        if parts.len() != 2 {
            return false;
        }

        let timestamp: u64 = match parts[0].parse() {
            Ok(t) => t,
            Err(_) => return false,
        };

        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        // Check expiration
        if current_time < timestamp || (current_time - timestamp) > SESSION_TTL_SECONDS {
            return false;
        }

        let expected_sig = self.compute_signature(timestamp);
        expected_sig.as_bytes().ct_eq(parts[1].as_bytes()).into()
    }

    fn compute_signature(&self, timestamp: u64) -> String {
        let mut mac =
            <HmacSha256 as Mac>::new_from_slice(&self.hmac_key).expect("valid key length");
        mac.update(timestamp.to_string().as_bytes());
        hex::encode(mac.finalize().into_bytes())
    }

    /// Extracts the session token from Cookie headers.
    pub fn extract_token_from_headers(headers: &HeaderMap) -> Option<String> {
        let cookie_header = headers.get(header::COOKIE)?.to_str().ok()?;
        for cookie in cookie_header.split(';') {
            let cookie = cookie.trim();
            if let Some(token) = cookie.strip_prefix(&format!("{}=", SESSION_COOKIE_NAME)) {
                return Some(token.to_string());
            }
        }
        None
    }
}

use axum::extract::State;

/// Axum middleware enforcing valid authentication on protected routes.
pub async fn require_auth(
    State(auth_service): State<AuthService>,
    req: Request,
    next: Next,
) -> Result<Response, Response> {
    let token = AuthService::extract_token_from_headers(req.headers());

    if let Some(t) = token {
        if auth_service.verify_session_token(&t) {
            return Ok(next.run(req).await);
        }
    }

    let body = Json(json!({
        "code": "UNAUTHORIZED",
        "message": "Authentication required or session expired"
    }));

    Err((StatusCode::UNAUTHORIZED, body).into_response())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_passphrase_verification() {
        let auth = AuthService::new("secret123".to_string());
        assert!(auth.verify_passphrase("secret123"));
        assert!(!auth.verify_passphrase("wrong"));
        assert!(!auth.verify_passphrase("secret"));
    }

    #[test]
    fn test_session_token_roundtrip() {
        let auth = AuthService::new("secret123".to_string());
        let token = auth.create_session_token();

        assert!(auth.verify_session_token(&token));
    }

    #[test]
    fn test_tampered_session_token() {
        let auth = AuthService::new("secret123".to_string());
        let token = auth.create_session_token();
        let tampered = format!("{}x", token);

        assert!(!auth.verify_session_token(&tampered));
    }

    #[test]
    fn test_cookie_extraction() {
        let mut headers = HeaderMap::new();
        headers.insert(
            header::COOKIE,
            "theme=dark; filez_session=12345.abcdef; lang=en"
                .parse()
                .unwrap(),
        );

        let token = AuthService::extract_token_from_headers(&headers).unwrap();
        assert_eq!(token, "12345.abcdef");
    }

    #[test]
    fn test_session_token_persists_across_instances_with_same_passphrase() {
        let auth1 = AuthService::new("secret123".to_string());
        let token = auth1.create_session_token();

        let auth2 = AuthService::new("secret123".to_string());
        assert!(auth2.verify_session_token(&token));

        let auth3 = AuthService::new("different_passphrase".to_string());
        assert!(!auth3.verify_session_token(&token));
    }
}
