use crate::{auth::SESSION_COOKIE_NAME, error::AppError, handlers::AppState};
use axum::{
    extract::State,
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Deserialize)]
pub struct LoginPayload {
    pub passphrase: String,
}

#[derive(Debug, Serialize)]
pub struct AuthStatusResponse {
    pub authenticated: bool,
    pub max_upload_size_mb: usize,
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginPayload>,
) -> Result<Response, AppError> {
    if !state.auth_service.verify_passphrase(&payload.passphrase) {
        return Err(AppError::Unauthorized("Invalid passphrase".to_string()));
    }

    let token = state.auth_service.create_session_token();
    let cookie_value = format!(
        "{}={}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400",
        SESSION_COOKIE_NAME, token
    );

    let mut response = Json(json!({ "authenticated": true })).into_response();
    response.headers_mut().insert(
        header::SET_COOKIE,
        cookie_value
            .parse()
            .map_err(|_| AppError::Configuration("Failed to format cookie header".to_string()))?,
    );

    Ok(response)
}

pub async fn auth_status(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    let authenticated = match crate::auth::AuthService::extract_token_from_headers(&headers) {
        Some(token) => state.auth_service.verify_session_token(&token),
        None => false,
    };
    let max_upload_size_mb = state.config.max_upload_size_bytes / (1024 * 1024);

    (
        StatusCode::OK,
        Json(AuthStatusResponse {
            authenticated,
            max_upload_size_mb,
        }),
    )
}
