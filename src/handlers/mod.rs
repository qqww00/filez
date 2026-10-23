pub mod auth;
pub mod files;
pub mod health;

use crate::{
    auth::{require_auth, AuthService},
    config::ServerConfig,
    fs::PathSandbox,
};
use axum::{
    extract::DefaultBodyLimit,
    middleware::from_fn_with_state,
    routing::{delete, get, post},
    Router,
};
use std::sync::Arc;
use tower_http::trace::TraceLayer;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<ServerConfig>,
    pub auth_service: AuthService,
    pub sandbox: PathSandbox,
}

pub fn create_router(
    config: Arc<ServerConfig>,
    auth_service: AuthService,
    sandbox: PathSandbox,
) -> Router {
    let upload_limit = config.max_upload_size_bytes;
    let state = AppState {
        config,
        auth_service: auth_service.clone(),
        sandbox,
    };

    let protected_files = Router::new()
        .route("/api/files", get(files::list_files))
        .route("/api/files/search", get(files::search_files))
        .route("/api/files", delete(files::delete_file_handler))
        .route("/api/files/copy", post(files::copy_file_handler))
        .route("/api/files/content", get(files::stream_file_content))
        .route(
            "/api/upload",
            post(files::upload_files).layer(DefaultBodyLimit::max(upload_limit)),
        )
        .layer(from_fn_with_state(auth_service.clone(), require_auth))
        .with_state(state.clone());

    let public_routes = Router::new()
        .route("/api/health", get(health::health_check))
        .route("/api/auth/login", post(auth::login))
        .route("/api/auth/status", get(auth::auth_status))
        .with_state(state);

    Router::new()
        .merge(public_routes)
        .merge(protected_files)
        .layer(TraceLayer::new_for_http())
}
