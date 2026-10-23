# Bug Fix: Increase Default Upload Limit to 10GB and Add Pre-Validation

- **Slug**: upload-size-limit-epipe
- **Fixed**: 2026-10-23
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Raised default upload size limit from 100 MB to 10 GB (10,240 MB) across the backend configuration and Axum body limits, exposed the active limit dynamically to clients via `/api/auth/status`, and added client-side file size pre-validation in the React frontend to prevent wasted network bandwidth and socket write broken pipe errors (`EPIPE`).

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/config.rs` | modified | Updated default `max_upload_mb` from 100 to 10240 (10 GB). |
| `src/handlers/auth.rs` | modified | Added `max_upload_size_mb` to `AuthStatusResponse` and `/api/auth/status`. |
| `src/main.rs` | modified | Displayed active upload limit in the console startup banner. |
| `frontend/src/types/files.ts` | modified | Added `max_upload_size_mb` to `AuthStatus` TypeScript interface. |
| `frontend/src/hooks/useFiles.ts` | modified | Stored and exposed `maxUploadSizeMb` dynamically from server status. |
| `frontend/src/pages/FileManagerPage.tsx` | modified | Added synchronous client-side `file.size` pre-validation before initiating uploads. |
| `tests/api_integration.rs` | modified | Verified `max_upload_size_mb` in integration tests. |
| `README.md` | modified | Documented 10 GB default upload limit and `--max-upload-mb` flag. |

## Diff Highlights

```rust
// src/config.rs
#[arg(long, env = "FILEZ_MAX_UPLOAD_MB", default_value_t = 10240)]
pub max_upload_mb: usize,
```

```typescript
// frontend/src/pages/FileManagerPage.tsx
const maxBytes = maxUploadSizeMb * 1024 * 1024;
for (const file of files) {
  if (file.size > maxBytes) {
    const fileMb = (file.size / (1024 * 1024)).toFixed(1);
    const limitStr = maxUploadSizeMb >= 1024 ? `${(maxUploadSizeMb / 1024).toFixed(0)} GB` : `${maxUploadSizeMb} MB`;
    setLocalError(
      `File "${file.name}" (${fileMb} MB) exceeds maximum upload limit of ${limitStr}. Use --max-upload-mb to configure higher limits.`
    );
    return;
  }
}
```

## Tests Added or Updated

- `tests/api_integration.rs::test_auth_login_success_and_failure` — Verified that `/api/auth/status` accurately exposes `max_upload_size_mb`.
- `src/config.rs::tests::test_config_generates_pin_when_none_provided` — Verified default configuration calculates 10,240 MB (10 GB) limit in bytes.

## Local Verification

- Commands run:
  - `cargo test` → 36 passed (25 unit, 8 integration, 3 security), 0 failed.
  - `cargo clippy -- -D warnings` → Clean, 0 warnings.
  - `cargo fmt --check` → Clean formatting.
  - `npm run build` → Production bundle compiled cleanly into `frontend/dist/`.

## Deviations from Assessment

The default limit was adjusted to 10 GB per explicit user instruction (revised from 100 MB).

## Follow-ups

- Complete `/speckit-bug-test slug=upload-size-limit-epipe`.
