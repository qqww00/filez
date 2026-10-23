# Bug Fix: Configure Axum Request Body Limit for Multipart Uploads

- **Slug**: upload-multipart-error
- **Fixed**: 2026-10-23
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Configured Axum's `DefaultBodyLimit` on `/api/upload` to permit payloads up to the configured `--max-upload-mb` threshold, preventing premature stream cutoff at Axum's default 2 MiB limit, and added proper mapping for `PAYLOAD_TOO_LARGE` errors.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/handlers/mod.rs` | modified | Applied `DefaultBodyLimit::max(upload_limit)` to the `/api/upload` route. |
| `src/handlers/files.rs` | modified | Mapped `MultipartError` with `StatusCode::PAYLOAD_TOO_LARGE` to `AppError::PayloadTooLarge`. |
| `src/fs/operations.rs` | modified | Handled `PAYLOAD_TOO_LARGE` status when reading field chunks in `save_field_atomic`. |
| `frontend/src/api/client.ts` | modified | Avoided injecting empty headers object for `FormData` uploads in `apiFetch`. |
| `tests/common/mod.rs` | modified | Added `with_max_upload_size` helper for testing upload size constraints. |
| `tests/api_integration.rs` | modified | Added regression tests verifying uploads > 2 MiB succeed and payloads exceeding limits return 413. |

## Diff Highlights

```rust
// src/handlers/mod.rs
.route(
    "/api/upload",
    post(files::upload_files).layer(DefaultBodyLimit::max(upload_limit)),
)
```

```rust
// src/handlers/files.rs
while let Some(field) = multipart.next_field().await.map_err(|e| {
    if e.status() == axum::http::StatusCode::PAYLOAD_TOO_LARGE {
        AppError::PayloadTooLarge(format!(
            "Upload exceeds maximum allowed size of {} MB",
            max_size / (1024 * 1024)
        ))
    } else {
        AppError::InvalidPath(format!("Multipart stream error: {}", e))
    }
})?
```

## Tests Added or Updated

- `tests/api_integration.rs::test_upload_endpoint_exceeds_2mb_default_limit` — Verifies that a 3 MiB file upload streams and saves to disk without hitting Axum's default 2 MiB limit.
- `tests/api_integration.rs::test_upload_endpoint_exceeds_configured_max_limit_returns_413` — Verifies that uploading a payload exceeding the configured maximum size returns HTTP 413 with error code `PAYLOAD_TOO_LARGE`.

## Local Verification

- Commands run:
  - `cargo test` → 34 passed (24 unit tests, 7 integration tests, 3 security tests), 0 failed.
  - `cargo clippy -- -D warnings` → Clean, 0 warnings.
  - `cargo fmt --check` → Clean, code formatted per style guidelines.
  - `npm run build` → Vite + TypeScript production build succeeded into `frontend/dist/`.
- Manual checks:
  - Validated that 3 MiB multipart payload uploads successfully to disk with matching byte length.
  - Validated that requests exceeding max size cleanly yield `HTTP 413 Payload Too Large`.

## Deviations from Assessment

None. The remediation followed the assessment's preferred implementation.

## Follow-ups

- Run `/speckit-bug-test slug=upload-multipart-error` to execute the formal verification workflow.
