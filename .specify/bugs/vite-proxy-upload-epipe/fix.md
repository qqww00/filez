# Bug Fix: Resolve Vite Proxy EPIPE and Session Invalidation on Aborted Uploads

- **Slug**: vite-proxy-upload-epipe
- **Fixed**: 2026-10-23
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Eliminated sudden session expiration across server restarts by deriving HMAC keys deterministically from configured passphrases, configured Vite dev proxy to route directly to `127.0.0.1` with graceful aborted-connection handling, and enhanced frontend upload error recovery to auto-prompt for re-authentication on 401/502 errors.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/auth.rs` | modified | Derived HMAC key deterministically from the passphrase using HMAC-SHA256 with a static salt so server restarts preserve valid user sessions. Added unit test for session persistence across restarts. |
| `frontend/vite.config.ts` | modified | Updated proxy target from `localhost` to `127.0.0.1:3000` and added `proxy.on('error')` to gracefully respond with structured JSON rather than unhandled EPIPE error logs. |
| `frontend/src/pages/FileManagerPage.tsx` | modified | Added recovery in `handleUpload` for 401 and 502 proxy errors: checks auth status and automatically pops up `LoginModal` instead of leaving the user stranded. |
| `tests/api_integration.rs` | modified | Added `test_upload_endpoint_unauthenticated_returns_401` integration test. |

## Diff Highlights

```rust
// src/auth.rs
pub fn new(passphrase: String) -> Self {
    let mut key = [0u8; 32];
    let mut mac = <HmacSha256 as Mac>::new_from_slice(b"filez_session_secret_seed_v1")
        .expect("valid key length");
    mac.update(passphrase.as_bytes());
    let result = mac.finalize().into_bytes();
    key.copy_from_slice(&result[0..32]);

    Self {
        passphrase: Arc::new(passphrase),
        hmac_key: key,
    }
}
```

```typescript
// frontend/vite.config.ts
proxy: {
  '/api': {
    target: 'http://127.0.0.1:3000',
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('error', (err, _req, res) => {
        if ('writeHead' in res && !res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              code: 'PROXY_ERROR',
              message: `Backend proxy connection error: ${err.message}`,
            })
          );
        }
      });
    },
  },
}
```

## Tests Added or Updated

- `src/auth.rs::test_session_token_persists_across_instances_with_same_passphrase` — Verifies that session cookies signed by one server process instance remain valid in subsequent instances with the same passphrase, and are rejected if the passphrase differs.
- `tests/api_integration.rs::test_upload_endpoint_unauthenticated_returns_401` — Verifies that unauthenticated upload attempts return HTTP 401 with code `UNAUTHORIZED`.

## Local Verification

- Commands run:
  - `cargo test` → 36 passed (25 unit, 8 integration, 3 security), 0 failed.
  - `cargo clippy -- -D warnings` → Clean, 0 warnings.
  - `cargo fmt --check` → Clean formatting.
  - `npm run build` → TypeScript and Vite assets bundle built cleanly.

## Deviations from Assessment

None.

## Follow-ups

- Run `/speckit-bug-test slug=vite-proxy-upload-epipe` to validate and generate the verification report.
