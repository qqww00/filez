# Technical Research & Decisions: File Search, Sorting, and Multi-File Upload

**Feature**: `004-search-sort-upload`
**Date**: 2026-10-24
**Status**: Completed

## 1. Search Architecture: Instant Client Filtering & Async Backend Subtree Search

### Context
Users require the ability to quickly locate files and folders by name. In a file manager, two distinct search workflows exist:
1. **Instant In-Folder Filtering**: As a user types into a search input while browsing a folder, they expect immediate feedback filtering the currently loaded items without network roundtrips.
2. **Recursive Subtree Search**: When a target file is deeply nested across subdirectories (e.g., `documents/2026/q3/invoices/client_a.pdf`), client-side filtering of only the current directory cannot find it. A recursive search is required.

### Decision
Implement a hybrid two-tier search mechanism:
1. **Client-Side Live Filter**:
   - Provide an instant search bar in the file manager header/toolbar.
   - Immediately filters the currently loaded `DirectoryListing.entries` in real-time as the user types (case-insensitive substring match).
   - Zero network overhead and sub-millisecond responsiveness.
2. **Backend Recursive Search Endpoint (`GET /api/files/search?path=...&q=...`)**:
   - When the user presses `Enter` or toggles "Search Subfolders" / "Deep Search", the client queries `GET /api/files/search`.
   - The backend validates the `path` parameter against `PathSandbox::resolve(path)`.
   - Performs an asynchronous recursive traversal starting from the resolved directory down to a maximum recursion depth (e.g., 20 levels) and caps results at 500 items to prevent resource exhaustion.
   - Checks symlink targets to ensure they do not escape the sandbox root.
   - Returns a structured array of `SearchResultEntry` objects containing `name`, `path` (relative to root or search folder), `is_dir`, `size_bytes`, and `modified_at`.

### Rationale
- Complies with Principle I (Sandbox Containment) and Principle V (Disciplined Simplicity / YAGNI): Avoids complex external search indexes, SQLite full-text tables, or background watcher processes. Standard directory traversal in Rust over local NVMe/SSD storage easily handles 10,000+ files in under 200ms.
- Delivers instantaneous UX for standard in-folder searches while offering full subtree discovery on demand.

### Alternatives Considered
- *In-memory indexer / SQLite FTS5*: Adds heavy database dependencies, disk cache synchronization problems, and file-watching complexity. Overkill for a local file server.
- *Client-side recursive crawler*: Requires hundreds of HTTP calls to `/api/files` for each folder, causing network congestion and browser freezes.

---

## 2. Multi-Attribute Sorting Architecture (Folders-First & Stable Tie-Breaking)

### Context
Users need to sort files and folders by:
- **Name**: Alphabetical (A-Z, Z-A)
- **Size**: Numerical byte size (smallest to largest, largest to smallest)
- **Modified Date**: ISO-8601 timestamps (newest to oldest, oldest to newest)
- **Type**: Extension/format grouping (e.g., audio, video, image, document, folder)

Additionally, standard operating systems (macOS Finder, Windows Explorer, GNOME Files) group folders together at the top of the list before files by default.

### Decision
1. **Client-Side Responsive Sorting**:
   - Sorting is performed client-side using a dedicated utility/hook (`useFileSortAndFilter`).
   - Interactive column headers in the table allow clicking to toggle sort criteria:
     - First click: Sort by column in default direction (Name: Ascending, Size: Descending, Modified: Descending, Type: Ascending).
     - Second click: Reverse direction.
   - Active sort column and direction are indicated visually with directional icons (`▲` / `▼`).
2. **Folders-First Default**:
   - Directories are grouped before files (`is_dir: true` precedes `is_dir: false`).
   - The chosen sort attribute and direction are applied within the folder group and within the file group independently.
3. **Deterministic Tie-Breaking**:
   - If two entries have identical primary sort values (e.g. identical file sizes or modification dates), the secondary sort key is always case-insensitive `name` in ascending order.
4. **Session Persistence**:
   - Active sort preferences (`sortField`, `sortDirection`) are stored in `sessionStorage` or React state so the user's preference persists across directory navigation.

### Rationale
- Instantaneous: Sorting up to 2,000 items in memory in modern JavaScript engines takes under 5 milliseconds.
- Matches user expectations from desktop operating systems.
- Ensures zero flicker when navigating folders.

---

## 3. HTML5 Drag-and-Drop Batch Ingestion with Visual Drop Zones

### Context
The current upload mechanism requires clicking the "Upload" button and selecting files. Users managing photos, documents, or video libraries expect to drag multiple files directly from their desktop or OS file manager into the web page.

### Decision
1. **Full-Page / Container Drag-and-Drop Target**:
   - Bind `dragenter`, `dragover`, `dragleave`, and `drop` event listeners to the main file container.
   - Track drag depth counters (`dragCounterRef`) to prevent flickering when cursor hovers over child DOM elements during dragging.
   - Render a semi-transparent, animated glassmorphism drop overlay with message: *"Drop files here to upload to [folder_name]"*.
2. **Integration with `useUploadManager`**:
   - Extract files from `e.dataTransfer.files`.
   - Forward files directly into `enqueueFiles(filesArray, currentPath)`.
   - The existing non-blocking `UploadProgressDrawer` immediately activates, showing batch progress, individual progress bars, speed, and ETA.
3. **Multi-File Selection in File Picker**:
   - Ensure `<input type="file" multiple />` is used in `UploadButton.tsx` (already verified present) and handle selection of 50+ files smoothly.
4. **Safety & Fallbacks**:
   - Prevent browser default behavior (`e.preventDefault()`, `e.stopPropagation()`) on drag events to avoid the browser navigating directly to the dropped file URL.
   - Ignore dropped non-file items (e.g., text selections, hyperlinks).

### Rationale
- Native HTML5 Drag and Drop API requires no third-party libraries (aligning with Principle V: YAGNI).
- Reuses the robust `useUploadManager` queue and atomic upload backend without duplication.
- Provides a delightful, modern user experience.
