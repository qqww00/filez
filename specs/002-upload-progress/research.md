# Technical Research & Decisions: Intuitive Upload Progress

**Feature**: `002-upload-progress`
**Date**: 2026-10-23
**Status**: Completed

## 1. Browser Upload Progress Tracking API

### Context
Standard browser `fetch()` does not support upload progress tracking via standard event listeners because request body streaming in `fetch` is either unsupported or lacks granular progress notifications in mainstream browsers. We need real-time byte-level progress reporting, status transitions, and abort/cancellation support.

### Decision
Use native browser `XMLHttpRequest` (`XHR`) specifically for file uploads, encapsulated inside `frontend/src/api/files.ts` (function `uploadFilesWithProgress`).

### Rationale
- `xhr.upload.addEventListener('progress', ...)` provides precise `loaded` and `total` byte counts directly from the browser's network layer.
- `xhr.abort()` cleanly terminates outgoing TCP streams immediately, fulfilling the requirement for sub-500ms upload cancellation.
- Zero external dependencies required; keeps the frontend bundle lightweight and robust without pulling in third-party libraries like Axios or Uppy.
- Fully compatible with credentials and existing cookie-based session authentication (`xhr.withCredentials = true`).

### Alternatives Considered
- `fetch()` with `ReadableStream` upload body: Not widely supported across mobile and desktop browsers; lacks direct upload progress events.
- Heavy third-party upload libraries (e.g., Uppy, Dropzone, Axios): Add significant bundle overhead and opinions that conflict with Filez's minimalist, custom UI design system.

---

## 2. Transfer Speed & ETA Calculation Algorithm

### Context
Displaying raw byte changes at high event frequencies causes UI jitter and erratic speed/ETA spikes (e.g., jumping between 0 MB/s and 100 MB/s). An intuitive progress UI requires smooth, human-readable numbers.

### Decision
Implement a low-pass filter / moving average tracker for transfer speed:
1. Record timestamp and bytes loaded at discrete measurement points (every 250ms–500ms).
2. Calculate instantaneous speed: `instantSpeed = deltaBytes / deltaTime`.
3. Compute smoothed speed using Exponential Moving Average (EMA):
   `smoothedSpeed = alpha * instantSpeed + (1 - alpha) * previousSpeed` (with `alpha = 0.3`).
4. Calculate ETA: `remainingBytes = totalBytes - loadedBytes`, `etaSeconds = Math.round(remainingBytes / smoothedSpeed)`.
5. Format duration into intuitive strings: `< 5s`, `42s remaining`, `2m 15s remaining`.

### Rationale
- Eliminates visual flicker in the speed and ETA text displays.
- Gracefully handles initial connection ramp-up without displaying dividing-by-zero or infinite estimates.

### Alternatives Considered
- Simple total average (`totalLoaded / totalTime`): Sluggish to adapt if transfer speed slows down or speeds up mid-transfer.
- Raw instantaneous speed (`deltaBytes / deltaMs` on every progress event): Too noisy; causes continuous flickering on UI text renders.

---

## 3. Queue Architecture & Upload Concurrency

### Context
When a user selects multiple files, the application must handle them reliably without overloading local network bandwidth or crashing backend memory limits.

### Decision
Implement a sequential upload queue (concurrency = 1) managed by a centralized React hook (`useUploadManager`):
1. User selects $N$ files; a single `UploadBatch` is created with $N$ `UploadItem` records.
2. The queue processes items sequentially. As each file completes, the next queued file begins immediately.
3. Aggregate statistics (overall batch percentage, total transferred bytes across all files, overall elapsed time and ETA) are updated dynamically alongside individual file progress.

### Rationale
- Prevents network socket contention and proxy connection errors (`EPIPE` / `ECONNRESET`) on local network servers.
- Simplifies error recovery: if file 2 fails, files 3, 4, and 5 can proceed smoothly.
- Provides predictable UX: users can see exactly which file is currently writing to disk.

### Alternatives Considered
- Unlimited concurrent uploads: Saturates local HTTP connections and server I/O, leading to dropped connections and proxy timeouts for large files.
- Arbitrary parallel batches: Adds race condition risks and confusing UI states when users navigate directories.

---

## 4. Non-Blocking Floating UI & Navigation Persistence

### Context
Users should not be blocked by a modal dialog while waiting for gigabyte-scale uploads. They must be able to navigate directories and inspect other files while uploads proceed.

### Decision
1. Position an upload progress tray / drawer (`UploadProgressDrawer`) anchored at the bottom-right corner of the application layout (expanding to a full-width bottom sheet on viewports < 600px).
2. Maintain upload queue state at the top level of the authenticated view so that folder navigation (`navigateTo(path)`) does not unmount or cancel active uploads.
3. Automatically refresh the current directory listing if the completed upload target matches the currently viewed directory.
4. Add a `window.addEventListener('beforeunload', ...)` guard that prompts the user with standard browser warnings if they attempt to reload or close the tab while uploads are active.

### Rationale
- Satisfies requirements FR-006, FR-011, and FR-012.
- Adheres to modern web app ergonomics (inspired by Google Drive, Dropbox, and Nextcloud).
- Clean separation between directory navigation state and background transfer state.
