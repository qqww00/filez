use crate::{
    error::AppError,
    fs::{copy_file, delete_file, list_directory, save_field_atomic},
    handlers::AppState,
};
use axum::{
    extract::{Multipart, Query, State},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Deserialize)]
pub struct ListFilesQuery {
    pub path: Option<String>,
}

pub async fn list_files(
    State(state): State<AppState>,
    Query(query): Query<ListFilesQuery>,
) -> Result<impl IntoResponse, AppError> {
    let rel_path = query.path.unwrap_or_default();
    let listing = list_directory(&state.sandbox, &rel_path)?;

    Ok(Json(listing))
}

#[derive(Debug, Deserialize)]
pub struct UploadQuery {
    pub path: Option<String>,
    pub overwrite: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct UploadedItem {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
}

#[derive(Debug, Serialize)]
pub struct FailedItem {
    pub name: String,
    pub error: String,
}

#[derive(Debug, Serialize)]
pub struct UploadResult {
    pub uploaded: Vec<UploadedItem>,
    pub failures: Vec<FailedItem>,
}

pub async fn upload_files(
    State(state): State<AppState>,
    Query(query): Query<UploadQuery>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, AppError> {
    let target_dir = query.path.unwrap_or_default();
    let overwrite = query.overwrite.unwrap_or(false);
    let max_size = state.config.max_upload_size_bytes;

    let mut uploaded = Vec::new();
    let mut failures = Vec::new();

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        if e.status() == axum::http::StatusCode::PAYLOAD_TOO_LARGE {
            AppError::PayloadTooLarge(format!(
                "Upload exceeds maximum allowed size of {} MB",
                max_size / (1024 * 1024)
            ))
        } else {
            AppError::InvalidPath(format!("Multipart stream error: {}", e))
        }
    })? {
        let filename = match field.file_name() {
            Some(name) => name.to_string(),
            None => continue,
        };

        if filename.trim().is_empty() {
            continue;
        }

        let saved = save_field_atomic(
            &state.sandbox,
            &target_dir,
            &filename,
            field,
            max_size,
            overwrite,
        )
        .await;

        match saved {
            Ok(size_bytes) => {
                let saved_rel_path = if target_dir.is_empty() {
                    filename.clone()
                } else {
                    format!("{}/{}", target_dir.trim_matches('/'), filename)
                };
                uploaded.push(UploadedItem {
                    name: filename,
                    path: saved_rel_path,
                    size_bytes,
                });
            }
            Err(e) => {
                failures.push(FailedItem {
                    name: filename,
                    error: e.client_message(),
                });
            }
        }
    }

    Ok(Json(UploadResult { uploaded, failures }))
}

#[derive(Debug, Deserialize)]
pub struct CopyPayload {
    pub source_path: String,
    pub destination_path: String,
    pub overwrite: Option<bool>,
}

pub async fn copy_file_handler(
    State(state): State<AppState>,
    Json(payload): Json<CopyPayload>,
) -> Result<impl IntoResponse, AppError> {
    let overwrite = payload.overwrite.unwrap_or(false);
    copy_file(
        &state.sandbox,
        &payload.source_path,
        &payload.destination_path,
        overwrite,
    )?;

    Ok(Json(json!({
        "copied": true,
        "source_path": payload.source_path,
        "destination_path": payload.destination_path
    })))
}

#[derive(Debug, Deserialize)]
pub struct DeleteFileQuery {
    pub path: String,
}

pub async fn delete_file_handler(
    State(state): State<AppState>,
    Query(query): Query<DeleteFileQuery>,
) -> Result<impl IntoResponse, AppError> {
    delete_file(&state.sandbox, &query.path)?;

    Ok(Json(json!({
        "deleted": true,
        "path": query.path
    })))
}

#[derive(Debug, Deserialize)]
pub struct ContentQuery {
    pub path: String,
}

pub async fn stream_file_content(
    State(state): State<AppState>,
    Query(query): Query<ContentQuery>,
    req: axum::extract::Request,
) -> Result<axum::response::Response, AppError> {
    let resolved = state.sandbox.resolve(&query.path)?;
    if !resolved.exists() || !resolved.is_file() {
        return Err(AppError::NotFound("File not found".to_string()));
    }

    let service = tower_http::services::fs::ServeFile::new(resolved);
    let res = match tower::ServiceExt::oneshot(service, req).await {
        Ok(res) => res,
        Err(infallible) => match infallible {},
    };

    Ok(res.into_response())
}
