# Data Model: Local Network File Manager

**Feature**: `001-local-file-manager`  
**Date**: 2026-10-23  
**Status**: Completed  

---

## 1. Domain Entities & Schemas

### `DirectoryEntry`
Represents an individual file or directory item within the managed filesystem hierarchy.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Base filename or directory name (e.g., `"photo.jpg"`) |
| `path` | `string` | Relative path from the managed root (e.g., `"photos/photo.jpg"`) |
| `is_dir` | `boolean` | `true` if directory, `false` if regular file |
| `size_bytes` | `u64` | File size in bytes (0 for directories) |
| `modified_at` | `string` | ISO 8601 formatted timestamp of last modification |
| `is_symlink` | `boolean` | Indicates whether the entry is a symbolic link |

### `DirectoryListing`
Represents the contents of a requested directory, complete with navigation aids.

| Field | Type | Description |
|-------|------|-------------|
| `current_path` | `string` | Normal relative path of the directory (`""` for root) |
| `breadcrumbs` | `Breadcrumb[]` | Ordered segments for hierarchy navigation back to root |
| `entries` | `DirectoryEntry[]` | List of items (directories sorted first, then alphabetically) |
| `total_files` | `usize` | Count of regular files in this listing |
| `total_dirs` | `usize` | Count of subdirectories in this listing |

### `Breadcrumb`
Represents a navigable path segment in the UI.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Segment display label (e.g., `"Root"`, `"Documents"`, `"2026"`) |
| `path` | `string` | Target relative path string for navigation |

### `CopyFileRequest`
Payload sent by client when copying a file.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `source_path` | `string` | Relative path of the file to copy | Must exist and be a regular file inside root |
| `destination_path` | `string` | Target relative directory or file path | Must reside strictly inside root; cannot equal source |
| `overwrite` | `boolean` | Whether to overwrite if target exists | Default: `false`. If `false` and target exists, reject with 409 Conflict |

### `UploadResult`
Summary returned to the client after processing one or more uploaded files.

| Field | Type | Description |
|-------|------|-------------|
| `uploaded` | `UploadedFileSummary[]` | Successfully saved files with name, relative path, and byte size |
| `failures` | `FailedFileSummary[]` | Any individual files that failed validation or writing |

### `ApiError`
Standard structured error format returned by all API endpoints on failure.

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | Machine-readable error code (e.g., `"PATH_TRAVERSAL"`, `"NOT_FOUND"`) |
| `message` | `string` | Safe, human-readable description for client display |

---

## 2. Validation Rules & Invariants

1. **Path Safety Invariant**:
   - Every `path`, `source_path`, and `destination_path` must satisfy:
     - No null bytes (`\0`) or ASCII control characters (0x00–0x1F).
     - No path segments containing literal `..` or leading `/`.
     - Canonicalized path MUST start with canonical root path prefix.
2. **Atomic Write Invariant**:
   - Files are written to scratch temporary names first (`.filez_tmp_<uuid>`).
   - Renamed into destination only when the full stream completes and passes byte limit checks.
3. **Overwrite Protection**:
   - Mutations (upload, copy) targeting existing files require explicit `overwrite=true`; otherwise return `409 Conflict`.
