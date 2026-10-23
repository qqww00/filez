# Bug Verification: Vite Proxy EPIPE and Aborted Upload Handling

- **Slug**: vite-proxy-upload-epipe
- **Tested**: 2026-10-23
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The bug is verified as resolved. Session cookies now persist deterministically across server restarts with matching passphrases, allowing large (5+ MiB) multipart uploads through the Vite dev server proxy to succeed seamlessly without hitting premature 401 connection resets. In addition, unauthenticated aborted streams are handled gracefully with structured proxy error responses and automatic frontend login modal recovery.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | Automated restart + 5 MiB upload through Vite dev proxy | pass | Session cookie survived server restart; 5 MiB upload succeeded with HTTP 200 OK. |
| New / updated tests | `cargo test auth::tests::test_session_token_persists_across_instances_with_same_passphrase` | pass | Confirms HMAC token verification persists across separate `AuthService` instances. |
| Regression suite | `cargo test` | pass | All 36 unit, integration, and security penetration tests passed (0 failures). |
| Lint / type-check | `cargo clippy -- -D warnings && cargo fmt --check` | pass | 0 warnings, formatting compliant. |
| Frontend compilation | `npm run build` | pass | TypeScript compile and Vite asset bundle built cleanly. |

## Output Excerpts

### Automated Cross-Restart Upload Verification
```text
Instance 1 logged in, cookie: filez_session=1792770551...
Instance 1 terminated.
Instance 2 started with same passphrase.
Auth upload across restart through Vite proxy:
{"uploaded":[{"name":"test_e2e_5mb.dat","path":"test_e2e_5mb.dat","size_bytes":5242880}],"failures":[]}
HTTP 200
```

### Full Test Suite Execution
```text
running 25 tests
test auth::tests::test_session_token_persists_across_instances_with_same_passphrase ... ok
...
test result: ok. 25 passed; 0 failed; 0 ignored; finished in 0.00s

running 8 tests
test test_upload_endpoint_unauthenticated_returns_401 ... ok
test test_upload_endpoint_exceeds_2mb_default_limit ... ok
...
test result: ok. 8 passed; 0 failed; 0 ignored; finished in 0.03s

running 3 tests
test test_outside_symlinks_denied ... ok
test test_path_traversal_copy_and_delete_rejected ... ok
test test_path_traversal_directory_listing_rejected ... ok
test result: ok. 3 passed; 0 failed; 0 ignored; finished in 0.00s
```

## Residual Risks

- **Generated PIN Mode**: When Filez is run without a specified `--passphrase` (falling back to an auto-generated 6-digit PIN), the PIN changes on every restart by design. In this mode, active sessions are expected to expire on restart, and the frontend will automatically prompt the user to enter the newly generated PIN.

## Recommendation

Close the bug — verified end-to-end. The fix eliminates unexpected session loss across server restarts and provides resilient error handling in the dev environment.
