# Bug Assessment: 200MB Upload Exceeds Default 100MB Limit Causing Vite Proxy EPIPE

- **Slug**: upload-size-limit-epipe
- **Created**: 2026-10-23
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

> "Upload file txt dengan size 200 bytes berhasil, ketika upload video 200MB gagal: Backend proxy connection error: write EPIPE"

## Symptom

Uploading small files (such as a 200-byte text file) succeeds with HTTP 200 OK. However, uploading a 200 MB video fails with `Backend proxy connection error: write EPIPE`.

Expected behavior: If a file exceeds the configured server upload size limit (default 100 MB), the user should receive an immediate, clear error explaining that the file exceeds the 100 MB limit (preferably checked client-side before transfer, or returning HTTP 413 `PAYLOAD_TOO_LARGE` with guidance on `--max-upload-mb`), rather than an unhandled proxy broken pipe error.

## Reproduction

1. Start Filez with default arguments: `cargo run -- --root ./test_folder --host 127.0.0.1 --port 3000 --passphrase test123`. Note that `--max-upload-mb` defaults to 100.
2. Start the frontend: `cd frontend && npm run dev`.
3. Log in to the web interface.
4. Upload a small file (e.g. 200 bytes `test.txt`):
   - Result: HTTP 200 OK — succeeds immediately.
5. Upload a video file of 200 MB:
   - When the upload stream hits the 100 MB threshold, Axum's `DefaultBodyLimit` cuts off the connection and returns HTTP 413 `Payload Too Large`.
   - Node's Vite proxy continues writing the remaining 100 MB of the video payload to the closed TCP socket, encountering `Error: write EPIPE`.
   - Vite proxy converts the aborted upstream write to `HTTP 502 Bad Gateway` with message `Backend proxy connection error: write EPIPE`, obscuring the underlying 100 MB limit violation.

## Suspected Code Paths

- [src/config.rs:20-23](file:///home/dev/src/filez/src/config.rs#L20-L23) — Default `--max-upload-mb` is set to `100` (`max_upload_size_bytes = 100 * 1024 * 1024`). A 200 MB video exceeds this default threshold by 100 MB.
- [src/handlers/mod.rs:36-41](file:///home/dev/src/filez/src/handlers/mod.rs#L36-L41) — `DefaultBodyLimit::max(upload_limit)` enforces the 100 MB ceiling. Once 100 MB is read, Axum aborts the stream with `LengthLimitError` and closes the TCP connection.
- [frontend/src/components/UploadButton.tsx:19-30](file:///home/dev/src/filez/frontend/src/components/UploadButton.tsx#L19-L30) and [frontend/src/pages/FileManagerPage.tsx:36-55](file:///home/dev/src/filez/frontend/src/pages/FileManagerPage.tsx#L36-L55) — The frontend does not validate `file.size` before initiating the upload because the server does not expose `max_upload_size_mb` in its public status/auth endpoints.
- [src/main.rs:52-72](file:///home/dev/src/filez/src/main.rs#L52-L72) — The startup console banner does not display the active upload size limit or mention the `--max-upload-mb` flag, leaving the user unaware of the 100 MB default ceiling.

## Root Cause Hypothesis

**Confidence: High**

The 200 MB video upload fails because it exceeds Filez's default maximum upload limit of 100 MB (`--max-upload-mb 100`, configured in `src/config.rs`). When the stream exceeds 100 MB, Axum's `DefaultBodyLimit` aborts the incoming stream and closes the socket. Because the client is still sending the rest of the 200 MB payload over the local network, Node's Vite proxy receives `EPIPE` on its upstream socket write and masks the `413 Payload Too Large` response behind a `502 Bad Gateway (Backend proxy connection error: write EPIPE)`.

## Proposed Remediation

**Preferred**:
1. **Client-Side File Size Pre-validation** ([frontend/src/pages/FileManagerPage.tsx](file:///home/dev/src/filez/frontend/src/pages/FileManagerPage.tsx) & [frontend/src/components/UploadButton.tsx](file:///home/dev/src/filez/frontend/src/components/UploadButton.tsx)):
   Expose `max_upload_size_mb` in `AuthStatusResponse` ([src/handlers/auth.rs](file:///home/dev/src/filez/src/handlers/auth.rs)) so the frontend knows the active server limit. Validate `file.size` client-side before starting the upload. If any file exceeds the limit, immediately alert the user with a helpful message:
   `"File '<filename>' (<size> MB) exceeds maximum upload limit of <max> MB. Start the server with --max-upload-mb <MB> to allow larger files."`
   This prevents unnecessary network transfer and eliminates `EPIPE` errors entirely.
2. **Startup Banner Transparency** ([src/main.rs](file:///home/dev/src/filez/src/main.rs)):
   Print the configured upload limit in the startup console banner:
   `"  Max upload:     100 MB (--max-upload-mb)"`
   This informs the user how to configure higher limits for large media.
3. **Documentation Clarification** ([README.md](file:///home/dev/src/filez/README.md)):
   Document `--max-upload-mb` with examples for video uploads (e.g. `--max-upload-mb 500`).

**Alternatives**:
- *Increase default upload limit in `config.rs` from 100 MB to 500 MB or 1 GB*:
  Can be done in tandem, but client-side pre-validation and banner transparency are essential regardless of the default limit to prevent `EPIPE` when *any* file exceeds the limit.

**Files likely to change**:
- `src/handlers/auth.rs`
- `src/main.rs`
- `frontend/src/types/files.ts`
- `frontend/src/hooks/useFiles.ts`
- `frontend/src/pages/FileManagerPage.tsx`
- `README.md`

**Tests to add or update**:
- Test in `tests/api_integration.rs` verifying `/api/auth/status` includes `max_upload_size_mb`.

## Risks & Considerations

- Setting `--max-upload-mb` higher (e.g. 1000 MB) does not increase RAM usage because Filez streams uploads directly to scratch disk files without buffering into memory.

## Open Questions

- None.
