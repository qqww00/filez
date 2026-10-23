use axum::{response::IntoResponse, Json};
use serde_json::json;

pub async fn health_check() -> impl IntoResponse {
    Json(json!({
        "status": "ok",
        "version": env!("CARGO_PKG_VERSION")
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_health_check_returns_ok() {
        let resp = health_check().await.into_response();
        assert_eq!(resp.status(), axum::http::StatusCode::OK);
    }
}
