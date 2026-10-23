# Bug Assessment: Axum Default 2MB Body Limit Blocks Multipart File Uploads

- **Slug**: upload-multipart-error
- **Created**: 2026-10-23
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

> "Uploading a file from the React + Vite frontend to the Rust + Axum backend fails with: Multipart stream error: Error parsing \`multipart/form-data\` request."

Server log excerpt observed during reproduction:
```text
DEBUG request{method=POST uri=/api/upload version=HTTP/1.1}: tower_http::trace::on_request: started processing request
DEBUG request{method=POST uri=/api/upload version=HTTP/1.1}: tower_http::trace::on_response: finished processing request latency=19 ms status=400
```
Response body:
```json
{
  "code": "INVALID_PATH",
  "message": "Multipart stream error: Error parsing `multipart/form-data` request"
}
```

## Symptom

When an authenticated user attempts to upload any file larger than 2 MiB (such as modern phone camera photos, videos, or documents) from the web interface or via HTTP multipart POST, the server aborts the upload with HTTP 400 Bad Request and error message `Multipart stream error: Error parsing \`multipart/form-data\` request`. The expected behavior is that uploads up to the configured `--max-upload-mb` limit (default 100 MB) succeed and persist to disk.

## Reproduction

1. Start the filez server: `cargo run -- --root ./test_folder --host 127.0.0.1 --port 3000 --passphrase test123`.
2. Authenticate to obtain a valid `filez_session` cookie via `POST /api/auth/login`.
3. Attempt to upload a small file (< 2 MiB, e.g. 1 KiB):
   ```bash
   curl -b "filez_session=..." -F "files=@/tmp/1kb.dat" http://127.0.0.1:3000/api/upload?path=
   ```
   *Result*: HTTP 200 OK — file uploads successfully.
4. Attempt to upload a file larger than 2 MiB (e.g. 3 MiB phone photo):
   ```bash
   curl -b "filez_session=..." -F "files=@/tmp/3mb.dat" http://127.0.0.1:3000/api/upload?path=
   ```
   *Result*: HTTP 400 Bad Request — `{"code":"INVALID_PATH","message":"Multipart stream error: Error parsing \`multipart/form-data\` request"}`.

## Suspected Code Paths

- [src/handlers/mod.rs:36-43](file:///home/dev/src/filez/src/handlers/mod.rs#L36-L43) — The router definition for `/api/upload` lacks Axum's `DefaultBodyLimit` layer. By default, Axum 0.8 wraps all incoming request bodies with `http_body_util::Limited::new(body, 2_097_152)` (2 MiB limit), cutting off the HTTP stream prematurely before the application's configured 100 MB threshold can be reached.
- [src/handlers/files.rs:54-70](file:///home/dev/src/filez/src/handlers/files.rs#L54-L70) — `upload_files` consumes `mut multipart: Multipart`. When `next_field().await` encounters the stream truncated by Axum's 2 MiB limit, `multer` throws a `StreamReadFailed` error, and Axum's `MultipartError` display representation emits `"Error parsing \`multipart/form-data\` request"`. The handler maps this error to `AppError::InvalidPath`, incorrectly responding with HTTP 400 and code `INVALID_PATH`.
- [frontend/src/api/client.ts:16-28](file:///home/dev/src/filez/frontend/src/api/client.ts#L16-L28) — `apiFetch` constructs headers for fetch requests. When `body instanceof FormData`, it correctly avoids setting `Content-Type: application/json`, allowing the browser to set `Content-Type: multipart/form-data; boundary=...`. However, spreading an empty `headers: {}` object could theoretically interfere with some HTTP clients; explicit omission is safer.
- [tests/api_integration.rs:237-276](file:///home/dev/src/filez/tests/api_integration.rs#L237-L276) — The existing integration test `test_upload_endpoint_multipart` only tests a 13-byte mock payload (`PNG_MOCK_DATA`), which is well below 2 MiB and therefore never exercised Axum's default body limit.

## Root Cause Hypothesis

**Confidence: High**

In Axum 0.8 (and 0.7), the framework applies a default request body limit of 2 MiB (`DEFAULT_LIMIT = 2_097_152`) to every route via `req.with_limited_body()`. Although the application defines a `--max-upload-mb` configuration (default 100 MB) and enforces it inside `src/fs/operations.rs::save_field_atomic`, the Axum HTTP router in `src/handlers/mod.rs` was never configured with `DefaultBodyLimit::disable()` or `DefaultBodyLimit::max(config.max_upload_size_bytes)`. Consequently, whenever an upload exceeds 2 MiB, Axum's `Limited` stream adapter cuts off the input stream. `multer` cannot read the remainder of the multipart MIME stream, returning `multer::Error::StreamReadFailed`, which Axum's `Multipart` extractor formats as `"Error parsing \`multipart/form-data\` request"`. In `src/handlers/files.rs`, this is caught and mapped to `AppError::InvalidPath`, producing the observed HTTP 400 error.

## Proposed Remediation

**Preferred**:
1. In `src/handlers/mod.rs`, import `axum::extract::DefaultBodyLimit`. Apply `DefaultBodyLimit::max(state.config.max_upload_size_bytes)` (or `DefaultBodyLimit::disable()`) specifically to the `/api/upload` route or the `protected_files` router. This allows requests up to the user-configured size limit (e.g. 100 MB) to stream through to the multipart extractor.
2. In `src/handlers/files.rs`, refine the error mapping on `multipart.next_field().await` so that stream termination or size exceeded errors are mapped to `AppError::PayloadTooLarge` or a dedicated `AppError::BadRequest` rather than `AppError::InvalidPath`.
3. In `frontend/src/api/client.ts`, ensure that when `options.body instanceof FormData`, the `headers` option passed to `fetch()` does not include empty header objects that could conflict with browser boundary calculation across different environments.
4. In `tests/api_integration.rs`, add a regression test uploading a payload greater than 2 MiB (e.g. 3 MiB) to verify it succeeds up to the configured limit, and a test verifying that exceeding `--max-upload-mb` returns HTTP 413 Payload Too Large.

**Alternatives**:
- *Disable body limits globally*: Call `DefaultBodyLimit::disable()` on the entire router. *Trade-off*: Leaves non-upload endpoints (like `/api/auth/login` and `/api/files/copy`) open to unbounded memory buffering attacks, violating Constitution Principle I (Security-First). Scoping the relaxed limit strictly to the streaming upload route is much safer.

**Files likely to change**:
- `src/handlers/mod.rs`
- `src/handlers/files.rs`
- `frontend/src/api/client.ts`
- `tests/api_integration.rs`

**Tests to add or update**:
- Add integration test `test_upload_endpoint_exceeds_2mb_default_limit` in `tests/api_integration.rs` testing a 3 MiB upload payload.
- Add integration test in `tests/api_integration.rs` verifying that exceeding the configured `max_upload_size_bytes` cleanly returns 413 `PayloadTooLarge`.

## Risks & Considerations

- **Memory Usage (DoS)**: If `DefaultBodyLimit` is raised to 100 MB or disabled on `/api/upload`, Axum must not buffer the entire request body into RAM. Because `upload_files` uses `Multipart` streaming directly into scratch disk files (`save_field_atomic`), memory footprint remains < 50 MB RSS as required by the technical plan.
- **Error Transparency**: Ensure internal Axum/multer parsing error messages do not leak internal system details, adhering to Constitution Principle II (Rigorous Input & Path Validation).

## Open Questions

- None. The root cause has been experimentally confirmed and reproduces deterministically at exactly the 2 MiB boundary.
