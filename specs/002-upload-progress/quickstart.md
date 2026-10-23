# Quickstart & Verification Guide: Intuitive File Upload Progress

**Feature**: `002-upload-progress`
**Date**: 2026-10-23
**Status**: Ready for implementation verification

This guide describes how to validate the real-time upload progress functionality across desktop and mobile scenarios.

---

## 1. Prerequisites & Environment Setup

Ensure the Filez backend and frontend development servers are active:

```bash
# Terminal 1: Backend service with clean test folder
cargo run -- --root ./test_folder --host 127.0.0.1 --port 3000 --passphrase rahasia123

# Terminal 2: Frontend Vite dev server
cd frontend && npm run dev
```

Navigate to `http://localhost:5173` in a web browser and log in with passphrase `rahasia123`.

---

## 2. Test Data Generation

Generate sample test files of various sizes to simulate different network transfer durations:

```bash
# Small file (instant upload)
head -c 100K /dev/urandom > /tmp/test_100k.dat

# Medium file (30 MB - ~2-5 seconds transfer)
head -c 30M /dev/urandom > /tmp/test_30m.dat

# Large file (150 MB - ~10-20 seconds transfer)
head -c 150M /dev/urandom > /tmp/test_150m.dat
```

---

## 3. Validation Scenarios

### Scenario A: Single Large File Upload (User Story 1 - P1)
1. In the Filez web UI, click the **Upload** button.
2. Select `/tmp/test_150m.dat`.
3. **Verify**:
   - The upload progress drawer appears immediately in the bottom-right corner.
   - The progress bar fills smoothly from 0% towards 100%.
   - Real-time metrics display current transferred volume (e.g., `45.2 MB / 150.0 MB`), transfer speed (e.g., `15.2 MB/s`), and ETA (e.g., `7s remaining`).
   - Upon reaching 100%, status changes to `Completed` with a checkmark badge, and `test_150m.dat` appears in the file listing.

### Scenario B: Batch Upload with Queue & Navigation (User Story 2 - P2)
1. Click **Upload** and select multiple files simultaneously (`test_100k.dat`, `test_30m.dat`, `test_150m.dat`).
2. **Verify**:
   - The aggregate progress summary displays "Uploading file 1 of 3 (X%)".
   - The expanded drawer displays all 3 items with their respective status badges (`Uploading`, `Queued`, `Queued`).
   - Click a folder in the file list to navigate into a subdirectory.
   - **Verify**: The progress drawer remains anchored and active; the upload does not abort or freeze when navigating.
   - Each file completes in succession until all 3 are marked `Completed`.

### Scenario C: Upload Cancellation & Abort (User Story 3 - P3)
1. Start uploading `test_150m.dat`.
2. While the progress bar is at ~30%, click the **Cancel** button on the file item or the drawer header.
3. **Verify**:
   - Transfer stops immediately (network transmission halts within 500ms).
   - Item status updates to `Cancelled`.
   - Inspect `./test_folder` on disk: verify no orphaned `.part` file remains.

### Scenario D: Mobile Viewport Responsiveness
1. In Chrome / browser DevTools, switch to responsive device emulation (iPhone SE or 375px width).
2. Start uploading a file.
3. **Verify**:
   - Progress drawer docks neatly at the bottom edge as a bottom sheet.
   - Touch targets (expand, cancel, close buttons) are easily tap-able with minimum 44px height/width.
   - Text does not overflow horizontally.

---

## 4. Automated Testing

Run automated unit and integration tests:

```bash
# Frontend test suite
cd frontend && npm test -- --run

# Rust backend tests
cargo test
```
