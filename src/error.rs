use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct ApiError {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("Path traversal detected: {0}")]
    PathTraversal(String),

    #[error("Unauthorized access: {0}")]
    Unauthorized(String),

    #[error("Resource not found: {0}")]
    NotFound(String),

    #[error("File conflict: {0}")]
    Conflict(String),

    #[error("Payload too large: {0}")]
    PayloadTooLarge(String),

    #[error("Filesystem error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Configuration error: {0}")]
    Configuration(String),
}

impl AppError {
    pub fn status_code(&self) -> StatusCode {
        match self {
            AppError::InvalidPath(_) => StatusCode::BAD_REQUEST,
            AppError::PathTraversal(_) => StatusCode::FORBIDDEN,
            AppError::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::Conflict(_) => StatusCode::CONFLICT,
            AppError::PayloadTooLarge(_) => StatusCode::PAYLOAD_TOO_LARGE,
            AppError::Io(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::Configuration(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    pub fn code(&self) -> &'static str {
        match self {
            AppError::InvalidPath(_) => "INVALID_PATH",
            AppError::PathTraversal(_) => "PATH_TRAVERSAL",
            AppError::Unauthorized(_) => "UNAUTHORIZED",
            AppError::NotFound(_) => "NOT_FOUND",
            AppError::Conflict(_) => "CONFLICT",
            AppError::PayloadTooLarge(_) => "PAYLOAD_TOO_LARGE",
            AppError::Io(_) => "IO_ERROR",
            AppError::Configuration(_) => "CONFIG_ERROR",
        }
    }

    pub fn client_message(&self) -> String {
        match self {
            AppError::InvalidPath(msg) => msg.clone(),
            AppError::PathTraversal(_) => {
                "Access denied: destination outside root directory".to_string()
            }
            AppError::Unauthorized(msg) => msg.clone(),
            AppError::NotFound(msg) => msg.clone(),
            AppError::Conflict(msg) => msg.clone(),
            AppError::PayloadTooLarge(msg) => msg.clone(),
            AppError::Io(_) => "Filesystem operation failed".to_string(),
            AppError::Configuration(msg) => msg.clone(),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let body = Json(ApiError {
            code: self.code().to_string(),
            message: self.client_message(),
        });

        (status, body).into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_status_codes() {
        assert_eq!(
            AppError::InvalidPath("bad".into()).status_code(),
            StatusCode::BAD_REQUEST
        );
        assert_eq!(
            AppError::PathTraversal("bad".into()).status_code(),
            StatusCode::FORBIDDEN
        );
        assert_eq!(
            AppError::Unauthorized("bad".into()).status_code(),
            StatusCode::UNAUTHORIZED
        );
        assert_eq!(
            AppError::NotFound("bad".into()).status_code(),
            StatusCode::NOT_FOUND
        );
        assert_eq!(
            AppError::Conflict("bad".into()).status_code(),
            StatusCode::CONFLICT
        );
        assert_eq!(
            AppError::PayloadTooLarge("bad".into()).status_code(),
            StatusCode::PAYLOAD_TOO_LARGE
        );
    }

    #[test]
    fn test_error_codes() {
        assert_eq!(
            AppError::PathTraversal("bad".into()).code(),
            "PATH_TRAVERSAL"
        );
        assert_eq!(AppError::Unauthorized("bad".into()).code(), "UNAUTHORIZED");
    }

    #[test]
    fn test_path_traversal_does_not_leak_internal_paths() {
        let err = AppError::PathTraversal("/sensitive/internal/path".into());
        assert_eq!(
            err.client_message(),
            "Access denied: destination outside root directory"
        );
    }
}
