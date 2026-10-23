# Technical Research & Architecture Decisions: Local Network File Manager

**Feature**: `001-local-file-manager`  
**Date**: 2026-10-23  
**Status**: Completed  

---

## 1. Backend Web Framework & Concurrency

### Decision: Axum 0.8+ with Tokio Async Runtime
- **Decision**: Build the HTTP backend using Axum on Tokio, paired with `tower` and `tower-http` middleware.
- **Rationale**: 
  - Axum is the modern standard in the Tokio ecosystem, providing zero-cost type-safe extractors, native async streaming, and seamless composability with Tower middleware.
  - Built-in support for streaming request bodies and multipart uploads without loading entire files into memory.
  - Native integration with `tower_http::services::ServeDir` and `tower_http::trace::TraceLayer`.
- **Alternatives Considered**:
  - *Actix-web*: Extremely fast, but has a larger distinct actor/runtime abstraction that adds unnecessary complexity.
  - *Rocket*: Clean syntax, but historical async transitions and ecosystem divergence make Axum better aligned with standard Tokio libraries.

---

## 2. Path Traversal & Filesystem Sandbox Containment

### Decision: Canonical Path Validation and Lexical Boundary Enforcement
- **Decision**: Implement a dedicated `PathSandbox` service in Rust with a two-phase check:
  1. **Lexical Normalization**: Parse user input relative path, verify no null bytes (`\0`), control characters, or absolute path prefixes. Strip or disallow any components containing `..`.
  2. **Canonical Verification**: Resolve the target path against the configured canonical root path using `std::fs::canonicalize`. Verify that the canonical path begins with the canonical root directory prefix:
     `target_canonical.starts_with(&root_canonical)`
  3. **Symlink Resolution Policy**: For existing files and directories, symlinks that point outside the root boundary are rejected with a 403 Forbidden / Not Found error.
- **Rationale**: Strict conformance with Constitution Principle I and Principle II. Guarantees that neither `../` tricks, URL-encoded path separators, nor symlink escapes can access host directories outside the configured folder.
- **Alternatives Considered**:
  - *Pure lexical path normalization*: Prone to symlink escape bypasses where an in-root symlink points to `/etc` or `/home`.
  - *OS chroot / containerization*: Requires root privileges on Linux and lacks portability across macOS/Windows development laptops.

---

## 3. Local Network Authentication & Session Security

### Decision: Pre-shared Passphrase with HMAC Session Cookies
- **Decision**: 
  - Server accepts a configured passphrase via command-line argument (`--passphrase <PASS>`) or environment variable (`FILEZ_PASSPHRASE`).
  - If omitted, the server automatically generates a secure random 6-character alphanumeric PIN and prints it prominently in the laptop terminal at startup.
  - An authentication endpoint `POST /api/auth/login` accepts `{ "passphrase": "..." }`, validates it in constant time, and issues an HTTP-only, `SameSite=Strict` session cookie containing a timestamped HMAC-SHA256 signature.
  - An Axum middleware verifies the session cookie on all `/api/files*` and `/api/upload*` routes.
- **Rationale**:
  - Simple for a single user entering credentials on a phone browser.
  - Does not require a database, external OAuth provider, or local network CA certificate infrastructure.
  - Secure against unauthorized devices connected to the same Wi-Fi.
- **Alternatives Considered**:
  - *HTTP Basic Auth*: Native browser prompts have poor mobile UX, lack clean logout capabilities, and cannot present a custom branding or PIN guidance screen.
  - *URL Query Token (`?token=xyz`)*: Leaks tokens into browser history, referrer headers, and access logs; awkward to re-type on mobile.

---

## 4. Streaming File Uploads & Atomic Mutations

### Decision: Axum Multipart Streaming with Temp File & Atomic Rename
- **Decision**:
  - Ingest multipart file streams using `axum::extract::Multipart`.
  - Stream chunks directly to a temporary file (`.filez_tmp_<uuid>`) inside a designated `.tmp` scratch subfolder within the managed root.
  - Track byte counts dynamically; if a stream exceeds `max_upload_size`, abort immediately, delete the temporary file, and return `413 Payload Too Large`.
  - Upon successful stream completion, atomically move the temporary file to its final destination using `tokio::fs::rename`.
  - For conflict handling: By default, if a file with the destination name already exists, reject the upload/copy with `409 Conflict` unless explicit `overwrite=true` is requested.
- **Rationale**:
  - Streaming avoids holding multi-megabyte (or gigabyte) files in memory, preventing laptop OOM crashes.
  - Atomic rename guarantees that clients or server crashes never leave corrupted, half-uploaded files in the active user directories.
  - Conforms to Constitution Principle VI (Asynchronous I/O & Predictable File Mutations).
- **Alternatives Considered**:
  - *Buffering whole uploads in memory*: Unacceptable memory usage for video or photo batches.
  - *Direct in-place writes to target path*: Leaves corrupted partial files if the Wi-Fi connection drops mid-transfer.

---

## 5. Frontend Architecture & Vite Integration

### Decision: React 18 + TypeScript + Vite + Single-Origin Production Serving
- **Decision**:
  - **Development Mode**: Run Vite on `localhost:5173` with a proxy forwarding `/api` calls to the Axum backend on `localhost:3000`.
  - **Production Mode**: Build the React application into static assets (`frontend/dist`) via `npm run build`. Axum serves these static files from root (`/`) using `tower_http::services::ServeDir`, with a fallback to `index.html` for client routing.
  - **Same-Origin Deployment**: Because the API and frontend share the exact same host and port in production, no CORS headers or complex cross-origin cookies are necessary.
  - **UI/UX Pattern**: Mobile-first responsive layout with breadcrumbs, touch-friendly rows (min 48px tap targets), multi-file upload button with progress indicator, and explicit confirmation modals for file deletions.
- **Rationale**:
  - Keeps development ergonomics fast (Vite HMR) while keeping production deployment to a single unified server process.
  - Zero CORS complications on local Wi-Fi.

---

## 6. Local Network Binding & IP Visibility

### Decision: Dual-Interface Binding with Prominent Terminal Banner
- **Decision**:
  - CLI supports `--host` (default: `127.0.0.1` during dev, or `0.0.0.0` for LAN access) and `--port` (default: `3000`).
  - When bound to `0.0.0.0`, the server queries the local network interfaces (using standard OS socket introspection) and prints a banner in the console:
    ```text
    ========================================================
      Filez - Local Network File Manager
    --------------------------------------------------------
      Local access:   http://localhost:3000
      Network access: http://192.168.1.150:3000
      Passphrase:     492817
      Root directory: /home/dev/shared
    ========================================================
    ```
- **Rationale**:
  - Safe by default (local loopback), but provides frictionless discovery for mobile phone access when LAN access is enabled.
