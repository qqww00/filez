# Filez - Local Network File Manager

A secure, high-performance local network file manager written in Rust and React/TypeScript. It runs on the user's laptop and allows managing files through a web browser on a phone or desktop over local Wi-Fi, without any third-party cloud storage.

## Features

- **Strict Filesystem Sandboxing**: Restricts all file browsing, upload, copy, and deletion operations to a configurable root directory with active defense against path traversal (`../`) and external symlink escapes.
- **Single-Binary Production Deployment**: The compiled React single-page application is served directly by the Axum server on the same origin (no CORS or cloud required).
- **Mobile-First Responsive Interface**: Touch-friendly tap targets (minimum 44px), directory breadcrumbs, and real-time metadata display (file size, modification date).
- **Multi-File Uploads**: Direct streaming multipart upload from mobile camera rolls or desktop browsers with atomic temp-file-and-rename writes.
- **Protected File Mutations**: Accidental overwrite protection on copy and upload; explicit confirmation dialogs before deleting files.
- **Local Network Authentication**: Pre-shared passphrase or auto-generated 6-digit PIN with HMAC session cookie security.

---

## Development Setup

### 1. Backend (Rust API Server)
```bash
# Run with a local test directory bound to loopback:
cargo run -- --root ./test_storage --host 127.0.0.1 --port 3000 --passphrase "secret123"
```

### 2. Frontend (Vite Dev Server)
```bash
cd frontend
npm install
npm run dev
# Access http://localhost:5173 (proxies /api requests to http://localhost:3000)
```

---

## Production Build & LAN Wi-Fi Deployment

### 1. Build the Frontend SPA
```bash
cd frontend
npm run build
# Compiles into frontend/dist/
```

### 2. Build the Rust Binary
```bash
cd ..
cargo build --release
```

### 3. Launch for Local Wi-Fi Access
```bash
./target/release/filez \
  --root /home/dev/shared \
  --host 0.0.0.0 \
  --port 3000 \
  --max-upload-mb 10240
```

The server inspects the host network interface and displays a discovery banner:
```text
========================================================
  Filez - Local Network File Manager
--------------------------------------------------------
  Local access:   http://localhost:3000
  Network access: http://192.168.1.150:3000
  Root directory: /home/dev/shared
  Max upload:     10 GB (--max-upload-mb)
  Generated PIN:  492817 (use to unlock on phone)
========================================================
```

Open `http://192.168.1.150:3000` from any phone or device connected to the same Wi-Fi network and enter the PIN to manage your files.

---

## Testing & Quality Gates

Run the automated test suite and formatting checks:

```bash
# Format check
cargo fmt --check

# Clippy linter
cargo clippy -- -D warnings

# Unit, integration, and security penetration tests
cargo test

# Frontend type checking and build
cd frontend && npm run build
```
