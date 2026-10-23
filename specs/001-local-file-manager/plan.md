# Implementation Plan: Local Network File Manager

**Branch**: `001-local-file-manager` | **Date**: 2026-10-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-local-file-manager/spec.md` and user architectural requirements.

---

## Summary

Build a secure, single-origin local network file manager that runs on the user's laptop and enables file browsing, multi-file uploads, copying, and deletions from mobile and desktop browsers over local Wi-Fi.

The technical approach couples a lightweight, memory-efficient Rust backend (Axum, Tokio, Serde) with a mobile-first React/TypeScript single-page application built using Vite. Filesystem mutations are strictly sandboxed to a configured root directory using canonical path boundary enforcement and atomic temporary file writes. The application is served from a single binary in production, eliminating cross-origin complications and cloud dependencies.

---

## Technical Context

- **Language & Runtime**: Rust stable (`1.75+`), TypeScript (`5.x`), Node.js (`18+` for frontend build).
- **Primary Backend Dependencies**:
  - `axum`: Modular, asynchronous HTTP framework with type-safe routing and extractors.
  - `tokio`: Async runtime for non-blocking network I/O and filesystem operations.
  - `tower` & `tower-http`: Middleware stack (tracing, compression, static file serving `ServeDir`).
  - `serde` & `serde_json`: Strongly typed JSON request/response serialization.
  - `clap`: Command-line argument parsing for configuration flags (`--root`, `--host`, `--port`, `--passphrase`).
  - `thiserror`: Declarative, ergonomic error types.
  - `sha2` & `hmac`: Cryptographic HMAC signing for tamper-proof session cookies.
  - `uuid`: Collision-free unique identifiers for in-flight temporary upload files.
- **Primary Frontend Dependencies**:
  - `react` & `react-dom` (`v18+`): Component-based UI library.
  - `vite`: Fast frontend tooling, development server with API proxy, and production asset bundler.
  - Responsive CSS / CSS Modules: Custom vanilla styling adhering to mobile-first responsive guidelines.
- **Storage**: Local filesystem only; no database, key-value store, or cloud storage.
- **Testing**:
  - Rust unit tests (`cargo test`) for path canonicalization, traversal defense, and file mutations.
  - Rust integration tests for Axum HTTP routes and authentication middleware.
  - Frontend component tests for UI states, upload progress, and confirmation modals.
- **Target Platform**:
  - Server: Developer/user laptop (Linux, macOS, Windows).
  - Client: Mobile browsers (iOS Safari, Android Chrome) and desktop browsers on the local Wi-Fi network.
- **Project Type**: Full-stack web application (Rust API server embedding/serving compiled React static assets).
- **Performance Goals**:
  - Directory listing latency < 50ms for directories with up to 1,000 entries.
  - Streaming upload throughput limited only by local Wi-Fi link speed.
  - Server memory footprint < 50MB RSS during idle and streaming operations.
- **Constraints**:
  - Absolute confinement to configured root directory; zero path traversal or symlink escapes permitted.
  - Fail-closed security architecture: all unauthenticated or malformed requests fail safely.
  - Atomic file writes via temp-file-and-rename to prevent corrupted partial files.
  - No exposure to the public internet.

---

## Constitution Check

*GATE: All principles from [.specify/memory/constitution.md](../../.specify/memory/constitution.md) verified.*

| Principle / Gate | Compliance Status | Implementation Strategy |
|------------------|-------------------|-------------------------|
| **I. Security-First Filesystem Access & Sandbox Containment** | **PASS** | `PathSandbox` service converts configured root to absolute canonical path at startup; every request is canonicalized and validated with `canonical_path.starts_with(&canonical_root)`. Symlinks resolving outside root are rejected. |
| **II. Rigorous Input & Path Validation** | **PASS** | Input strings are checked for null bytes (`\0`), control characters, and forbidden path tokens. Errors return generic structured JSON without leaking host filesystem details. |
| **III. Architectural Separation of Concerns** | **PASS** | Strict separation: `src/config.rs` (configuration), `src/fs/` (pure filesystem logic & sandbox), `src/handlers/` (HTTP transport & Axum extractors). Neither layer leaks abstractions. |
| **IV. Small, Focused Modules & Idiomatic Rust** | **PASS** | Distinct modules with explicit responsibilities; custom error types via `thiserror`; strict adherence to `cargo clippy` and `cargo fmt`. |
| **V. Disciplined Simplicity (YAGNI)** | **PASS** | No database, no ORM, no speculative plugin architectures. Simple pre-shared passphrase/PIN and single-origin static asset serving. |
| **VI. Asynchronous I/O & Predictable File Mutations** | **PASS** | Non-blocking Axum/Tokio streaming for multi-part file uploads. In-flight data writes to scratch temp file, verified for byte limits, and atomically moved via `tokio::fs::rename`. Default conflict policy rejects silent overwrites. |
| **Security & Operational Boundaries** | **PASS** | Local network binding configurable (`127.0.0.1` default for dev, `0.0.0.0` for LAN); upload size limit enforced server-side; LAN discovery banner printed in console. |
| **Quality Gates & Verification** | **PASS** | Unit tests for path sanitization, integration tests for API endpoints, end-to-end verification across mobile scenarios. |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-local-file-manager/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Technical research & decisions (Phase 0)
├── data-model.md        # Domain entities, validation rules, schemas (Phase 1)
├── quickstart.md        # Verification scenarios & run guide (Phase 1)
├── contracts/
│   └── openapi.yaml     # OpenAPI 3.1 specification for REST API (Phase 1)
├── checklists/
│   └── requirements.md  # Requirements quality validation checklist
└── tasks.md             # Actionable task breakdown (Phase 2 - via /speckit-tasks)
```

### Source Code Layout

```text
filez/
├── Cargo.toml
├── src/
│   ├── main.rs            # Entry point: CLI parsing, logging, LAN banner, server lifecycle
│   ├── config.rs          # Server configuration struct (root, host, port, max_size, auth)
│   ├── auth.rs            # Passphrase verification, HMAC cookie session token generation
│   ├── error.rs           # Strongly typed ApiError and Axum IntoResponse implementation
│   ├── fs/
│   │   ├── mod.rs         # Filesystem operations interface
│   │   ├── sandbox.rs     # Canonical path verification & traversal prevention
│   │   └── operations.rs  # Directory listing, atomic upload writing, copy, delete
│   └── handlers/
│       ├── mod.rs         # Axum router assembly and middleware integration
│       ├── health.rs      # GET /api/health
│       ├── auth.rs        # POST /api/auth/login, GET /api/auth/status
│       └── files.rs       # GET /api/files, POST /api/upload, POST /api/files/copy, DELETE /api/files
├── tests/
│   ├── common/            # Test helpers and temporary directory fixtures
│   ├── path_traversal.rs  # Security boundary tests (path traversal, symlink escapes)
│   └── api_integration.rs # End-to-end Axum route tests with mocked clients
└── frontend/
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts     # Vite config with /api proxy to http://localhost:3000
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── api/
        │   ├── client.ts   # Centralized fetch client with credential and error handling
        │   └── files.ts    # Typed API methods (listFiles, uploadFiles, copyFile, deleteFile)
        ├── types/
        │   └── files.ts    # TypeScript interfaces matching backend models
        ├── hooks/
        │   └── useFiles.ts # React hook for directory state, loading, error, refresh
        ├── components/
        │   ├── Header.tsx
        │   ├── Breadcrumbs.tsx
        │   ├── FileList.tsx
        │   ├── FileRow.tsx
        │   ├── UploadButton.tsx
        │   ├── CopyDialog.tsx
        │   ├── ConfirmDeleteDialog.tsx
        │   └── LoginModal.tsx
        ├── pages/
        │   └── FileManagerPage.tsx
        └── styles/
            ├── global.css
            └── file-manager.css
```

**Structure Decision**: 
The full-stack web application structure cleanly isolates the Rust backend in `src/` and the React frontend in `frontend/`. 
In development, Vite provides instant hot-module replacement while proxying requests to the Axum backend. 
In production, `frontend/dist` is compiled once and served by Axum as static assets on the exact same origin, guaranteeing zero CORS overhead and a single deployable server.

---

## Complexity Tracking

> **No Constitution violations detected.** The architecture strictly avoids unnecessary complexity, speculative abstractions, databases, and external cloud dependencies.

| Component | Selected Approach | Simpler Alternative Rejected Because |
|-----------|-------------------|--------------------------------------|
| Authentication | Pre-shared passphrase with HMAC cookie | HTTP Basic Auth provides poor mobile UX and cannot render a custom PIN/login screen. |
| File Uploads | Streaming multipart with atomic rename | Buffering whole files in RAM causes OOM crashes for large media files; direct in-place writes risk corrupting files on dropped Wi-Fi connections. |
| Path Sandboxing | Canonicalization + prefix validation | Lexical-only normalization fails to prevent symlink traversal attacks. |

---

## Phased Implementation Strategy

### Phase 1: Core Backend & Filesystem Sandbox
- Initialize Cargo project with dependencies (`axum`, `tokio`, `serde`, `clap`, `thiserror`, `tower-http`).
- Implement `config.rs` for CLI arguments and environment variable parsing.
- Implement `fs/sandbox.rs` with canonical path resolution and traversal rejection.
- Implement `fs/operations.rs` for directory listing, atomic write, copy, and delete.
- Write unit tests covering sandbox boundaries, `../` traversal tricks, and symlink defenses.

### Phase 2: REST API & Authentication Middleware
- Implement `error.rs` mapping domain errors to clean, non-leaking JSON error responses.
- Implement `auth.rs` for passphrase validation, HMAC cookie generation, and Axum middleware.
- Implement handlers: `/api/health`, `/api/auth/login`, `/api/files`, `/api/upload`, `/api/files/copy`.
- Write Axum integration tests validating status codes, headers, and authentication gates.

### Phase 3: Frontend Client Application
- Initialize Vite React TypeScript project in `frontend/`.
- Configure TypeScript interfaces in `types/files.ts` matching backend JSON models.
- Implement centralized API client (`api/client.ts`, `api/files.ts`).
- Build responsive UI components: `Header`, `Breadcrumbs`, `FileList`, `FileRow`, `UploadButton`, `ConfirmDeleteDialog`, `CopyDialog`, `LoginModal`.
- Implement responsive CSS styling optimized for 360px+ mobile screens and desktop viewports.

### Phase 4: Production Integration & Asset Serving
- Configure Axum to serve static assets from `frontend/dist` with SPA fallback to `index.html`.
- Add local network IP detection and discovery banner printing to stdout at startup.
- Verify production build workflow (`npm run build` followed by `cargo build --release`).

### Phase 5: Verification & End-to-End Validation
- Execute all verification scenarios from `quickstart.md`.
- Verify mobile browser connectivity over real Wi-Fi network.
- Confirm automated test coverage for success cases, failure cases, and security boundaries.

---

## Technical Risks & Mitigations

1. **Risk: Local Network Discovery Friction**
   - *Issue*: Mobile users might not know the laptop's current local Wi-Fi IP address.
   - *Mitigation*: The backend dynamically inspects local network interfaces on startup and logs a prominent console banner with the exact URL (`http://192.168.x.x:3000`) and the access PIN.
2. **Risk: Mobile Browser Upload Timeouts on Large Files**
   - *Issue*: Transferring large video files over Wi-Fi can trigger browser socket timeouts if the server does not stream chunks immediately.
   - *Mitigation*: Axum streams multipart chunks directly to disk without intermediate buffering, maintaining active socket flow.
3. **Risk: Concurrent File Name Collisions**
   - *Issue*: Two simultaneous uploads or copies with identical names could overwrite each other.
   - *Mitigation*: Uploads write to unique UUID temporary filenames first and perform an atomic check-and-rename step. Default overwrite behavior requires explicit client opt-in.
