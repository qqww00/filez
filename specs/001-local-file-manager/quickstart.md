# Quickstart & Verification Guide: Local Network File Manager

**Feature**: `001-local-file-manager`  
**Date**: 2026-10-23  
**Status**: Ready for Implementation  

---

## 1. Prerequisites & Environment

- **Rust**: Stable toolchain (`rustc 1.75+`, `cargo`)
- **Node.js**: `v18.x` or newer and `npm`
- **Operating System**: Linux, macOS, or Windows (development laptop)
- **Wi-Fi Network**: Shared LAN connection for laptop and mobile phone testing

---

## 2. Development Setup

### Step A: Prepare a Test Root Directory
```bash
mkdir -p /tmp/filez_test/photos /tmp/filez_test/docs
echo "Hello from Filez" > /tmp/filez_test/docs/readme.txt
```

### Step B: Start Backend API (Development)
```bash
# In repository root
cargo run -- \
  --root /tmp/filez_test \
  --host 127.0.0.1 \
  --port 3000 \
  --passphrase "localpass"
```

### Step C: Start Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
# Vite runs on http://localhost:5173 with proxy to http://localhost:3000/api
```

---

## 3. Production Build & Local Network Deployment

### Step A: Build Static Frontend Assets
```bash
cd frontend
npm run build
# Compiles React SPA into frontend/dist/
```

### Step B: Build & Launch Single Binary
```bash
cd ..
cargo build --release

# Run bound to all interfaces for LAN Wi-Fi access:
./target/release/filez \
  --root /home/dev/shared \
  --host 0.0.0.0 \
  --port 3000 \
  --max-upload-mb 100 \
  --passphrase "wifipass"
```

The server displays its LAN discovery banner:
```text
========================================================
  Filez - Local Network File Manager
--------------------------------------------------------
  Local access:   http://localhost:3000
  Network access: http://192.168.1.150:3000
  Passphrase:     wifipass
  Root directory: /home/dev/shared
========================================================
```

---

## 4. End-to-End Validation Scenarios

### Scenario 1: Authentication & Browse
1. Open phone browser to `http://192.168.1.150:3000`.
2. Verify that the login screen is displayed and no directory listing is shown.
3. Enter passphrase `"wifipass"` and submit.
4. Verify redirection to the root directory listing displaying folders (`photos/`, `docs/`) with sizes and modification times.
5. Tap on `docs/` and verify the breadcrumb navigation updates to `Root > docs`.

### Scenario 2: Multi-File Upload & Persistence
1. Inside `photos/`, tap the **Upload** button.
2. Select 2 photos from the phone camera roll.
3. Observe upload progress indicator and success notification.
4. Verify files appear immediately in the UI.
5. In the laptop terminal, stop the server (`Ctrl+C`) and restart it.
6. Refresh phone browser; verify uploaded photos remain visible and downloadable.

### Scenario 3: Copy File & Overwrite Protection
1. Select `docs/readme.txt` and trigger **Copy**.
2. Select destination `photos/`.
3. Verify `photos/readme.txt` is created with identical content.
4. Attempt to copy `docs/readme.txt` into `photos/` again without overwrite flag.
5. Verify that the operation is rejected with a `409 Conflict` notice.

### Scenario 4: Delete File with Confirmation
1. In `photos/`, tap **Delete** on `readme.txt`.
2. Verify an explicit confirmation modal appears (`"Are you sure you want to delete readme.txt?"`).
3. Tap **Cancel** -> Verify file remains.
4. Tap **Delete** again and click **Confirm** -> Verify file is permanently removed from disk and UI.

### Scenario 5: Sandbox & Path Traversal Security Test (CLI / cURL)
Execute automated attacks against the running API:
```bash
# 1. Attempt traversal to /etc/passwd
curl -i "http://localhost:3000/api/files?path=../../../../etc/passwd" \
  -H "Cookie: filez_session=<valid_cookie>"
# EXPECTED: 400 Bad Request or 403 Forbidden

# 2. Attempt encoded traversal
curl -i "http://localhost:3000/api/files?path=..%2F..%2Fetc%2Fpasswd" \
  -H "Cookie: filez_session=<valid_cookie>"
# EXPECTED: 400 Bad Request or 403 Forbidden

# 3. Attempt unauthenticated deletion
curl -i -X DELETE "http://localhost:3000/api/files?path=photos/photo1.jpg"
# EXPECTED: 401 Unauthorized
```
All attacks must be blocked fail-closed.
