# Bug Assessment: Vite Proxy EPIPE and 502 Bad Gateway on Aborted Uploads

- **Slug**: vite-proxy-upload-epipe
- **Created**: 2026-10-23
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

```text
HTTP Error 502: Bad Gateway

10:38:35 PM [vite] http proxy error: /api/upload
Error: write EPIPE
    at afterWriteDispatched (node:internal/stream_base_commons:159:15)
    at writeGeneric (node:internal/stream_base_commons:150:3)
    at Socket._writeGeneric (node:net:966:11)
    at Socket._write (node:net:978:8)
    at doWrite (node:internal/streams/writable:596:12)
    at clearBuffer (node:internal/streams/writable:781:7)
    at Writable.uncork (node:internal/streams/writable:529:7)
    at connectionCorkNT (node:_http_outgoing:976:8)
    at process.processTicksAndRejections (node:internal/process/task_queues:88:21)
```

## Symptom

When uploading a file from the frontend through the Vite dev server proxy (`http://127.0.0.1:5173/api/upload`), the request fails with `HTTP Error 502: Bad Gateway`. The Vite development console prints `http proxy error: /api/upload Error: write EPIPE`.

Expected behavior: If authentication is required or expired, the user should receive a clean `401 Unauthorized` response with structured JSON, allowing the frontend to present the login modal. If the backend is running and authenticated, the upload should stream through to completion.

## Reproduction

1. Start the backend server: `cargo run -- --root ./test_folder --host 127.0.0.1 --port 3000 --passphrase test123`.
2. Start the frontend dev server: `cd frontend && npm run dev`.
3. In a separate terminal, trigger an unauthenticated file upload through the Vite proxy:
   ```bash
   curl -v -F "files=@/tmp/test_5mb.dat" http://127.0.0.1:5173/api/upload?path=
   ```
4. Observe the response and logs:
   - Backend returns `HTTP 401 Unauthorized` immediately upon evaluating `require_auth`.
   - Node.js proxy attempts to continue writing the multipart body stream into the closed upstream TCP socket.
   - Kernel sends TCP `RST`.
   - Vite dev server logs: `[vite] http proxy error: /api/upload?path= Error: write EPIPE`.
   - Client receives: `HTTP 502 Bad Gateway`.

## Suspected Code Paths

- [src/auth.rs:27-48](file:///home/dev/src/filez/src/auth.rs#L27-L48) — `AuthService::new` generates an in-memory HMAC key using system randomness (`SystemTime::now()` nanos and PID). Every backend restart completely invalidates all previously issued session cookies. Users who were previously authenticated become unauthenticated silently until their next request.
- [src/auth.rs:122-140](file:///home/dev/src/filez/src/auth.rs#L122-L140) — `require_auth` middleware checks the session cookie. On auth failure, it returns `(StatusCode::UNAUTHORIZED, body).into_response()` without draining the incoming multipart request body, dropping the connection while the client/proxy is actively streaming.
- [frontend/vite.config.ts:10-16](file:///home/dev/src/filez/frontend/vite.config.ts#L10-L16) — Vite dev server proxy configuration forwards `/api` to `http://localhost:3000` with default error handling. When an upstream socket write aborts prematurely (e.g. `EPIPE` or `ECONNRESET`), Node's `http-proxy` generates a 502 Bad Gateway and logs an unhandled proxy error.
- [frontend/src/hooks/useFiles.ts:22-35](file:///home/dev/src/filez/frontend/src/hooks/useFiles.ts#L22-L35) — Frontend only triggers re-authentication and displays the `LoginModal` when receiving HTTP 401. When Vite proxy swallows 401 and emits 502, the UI displays `HTTP Error 502: Bad Gateway` instead of prompting the user to log back in.

## Root Cause Hypothesis

**Confidence: High**

When an unauthenticated (or session-invalidated) client uploads a file through the Vite dev server proxy, Axum's `require_auth` middleware immediately rejects the request with HTTP 401 Unauthorized before consuming the request body. Because Axum closes the connection while Node's `http-proxy` is in the middle of piping the multipart file data to `localhost:3000`, the operating system issues a broken pipe (`EPIPE`) error on the proxy's outgoing socket. Node's `http-proxy` interprets this broken upstream pipe as a proxy failure, logs `Error: write EPIPE`, and converts the response into `HTTP 502 Bad Gateway`.

This issue frequently surfaces after restarting the backend because `AuthService::new` randomizes the HMAC secret on every process launch, instantly invalidating active browser cookies while the frontend UI remains open.

## Proposed Remediation

**Preferred**:
1. **Deterministic HMAC Key for Configured Passphrase** ([src/auth.rs](file:///home/dev/src/filez/src/auth.rs)):
   When a pre-shared passphrase is provided (`--passphrase`), derive the HMAC key deterministically from the passphrase using HKDF or HMAC-SHA256 with a static salt (e.g., `b"filez_session_key_v1"`). This ensures server restarts do not abruptly invalidate active user sessions. (For generated 6-digit PINs without a configured passphrase, key generation remains per-session).
2. **Vite Proxy Error & Target Configuration** ([frontend/vite.config.ts](file:///home/dev/src/filez/frontend/vite.config.ts)):
   Update `target` to `http://127.0.0.1:3000` to avoid IPv6/IPv4 DNS resolution roundtrips. Configure proxy error handling to gracefully handle socket write aborts (`EPIPE`/`ECONNRESET`) so that proxy errors don't crash or emit noisy stack traces during aborted uploads.
3. **Frontend 502 Recovery Check** ([frontend/src/pages/FileManagerPage.tsx](file:///home/dev/src/filez/frontend/src/pages/FileManagerPage.tsx)):
   In `handleUpload`, if an upload throws a 502 error or network error, invoke `getAuthStatus()`. If the session is invalid, set `isAuthenticated(false)` to open the `LoginModal` automatically, guiding the user to re-authenticate rather than displaying a dead-end 502 message.

**Alternatives**:
- *Drain entire request bodies in `require_auth`*:
  Before returning 401, read and discard all bytes from `req.into_body()`. *Trade-off*: Wastes server CPU and network bandwidth buffering/discarding potentially gigabytes of unauthenticated uploads, creating a Denial-of-Service vector.

**Files likely to change**:
- `src/auth.rs`
- `frontend/vite.config.ts`
- `frontend/src/pages/FileManagerPage.tsx`
- `tests/api_integration.rs`

**Tests to add or update**:
- Unit test in `src/auth.rs` verifying that identical passphrases generate consistent session tokens across `AuthService` restarts.
- Integration test in `tests/api_integration.rs` verifying that unauthenticated uploads are rejected with 401 without crashing or hanging the server.

## Risks & Considerations

- **Security of Deterministic Key**: Deriving the HMAC key from the passphrase using a cryptographic hash (HMAC-SHA256 with a domain-separated salt) is cryptographically sound for local network usage with pre-shared keys, preventing session forgery without a shared secret.

## Open Questions

- None. The EPIPE behavior and 502 proxy error were reproduced and verified experimentally.
