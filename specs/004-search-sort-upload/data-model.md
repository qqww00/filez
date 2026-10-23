# Data Model: File Search, Sorting, and Multi-File Upload

**Feature**: `004-search-sort-upload`
**Date**: 2026-10-24
**Status**: Completed

## 1. Entity Relationship Diagram

```text
+-------------------------------------------------------------+
|                       DirectoryListing                      |
+-------------------------------------------------------------+
| current_path: string                                        |
| breadcrumbs: Breadcrumb[]                                   |
| entries: DirectoryEntry[]                                   |
| total_files: number                                         |
| total_dirs: number                                          |
+-------------------------------------------------------------+
                               |
               +---------------+---------------+
               |                               |
               v 1                             v 0..*
+-----------------------------+ +-----------------------------+
|         SortConfig          | |       DirectoryEntry        |
+-----------------------------+ +-----------------------------+
| field: SortField            | | name: string                |
| direction: SortDirection    | | path: string                |
| foldersFirst: boolean       | | is_dir: boolean             |
+-----------------------------+ | size_bytes: number          |
                                | modified_at: string         |
                                | is_symlink: boolean         |
                                +-----------------------------+
                                               ^
                                               |
+-----------------------------+                | 0..*
|         SearchQuery         |                |
+-----------------------------+                |
| query: string               |                |
| path: string                |                |
| isRecursive: boolean        |                |
+-----------------------------+                |
               |                               |
               v 1                             |
+----------------------------------------------+--------------+
|                      SearchResultListing                    |
+-------------------------------------------------------------+
| query: string                                               |
| search_root: string                                         |
| results: SearchResultEntry[]                                |
| total_matches: number                                       |
| is_truncated: boolean                                       |
+-------------------------------------------------------------+
```

---

## 2. Entity Specifications

### `SortConfig`
Represents client-side sorting preferences applied to directory listings and search results.

| Field | Type | Allowed Values | Description |
|---|---|---|---|
| `field` | `SortField` | `'name' \| 'size' \| 'date' \| 'type'` | Active sort attribute |
| `direction` | `SortDirection` | `'asc' \| 'desc'` | Sort direction |
| `foldersFirst` | `boolean` | `true \| false` | Whether folders group before files (default: `true`) |

### `SearchQuery`
Represents an active search filter or recursive backend query.

| Field | Type | Description |
|---|---|---|
| `query` | `string` | Search keyword/substring entered by user (trimmed) |
| `path` | `string` | Base relative directory path for the search scope |
| `isRecursive` | `boolean` | `true` if deep subtree search is enabled; `false` for in-folder filter |

### `SearchResultEntry`
Represents an item matched by search (compatible with `DirectoryEntry`).

| Field | Type | Description |
|---|---|---|
| `name` | `string` | File or directory name |
| `path` | `string` | Relative path inside sandbox from root (e.g., `photos/vacation/sunset.jpg`) |
| `is_dir` | `boolean` | `true` if entry is a directory |
| `size_bytes` | `number` | File size in bytes (0 for directories) |
| `modified_at` | `string` | ISO-8601 formatted modification timestamp |
| `is_symlink` | `boolean` | `true` if entry is a valid sandbox symlink |
| `relative_folder` | `string` | Parent directory relative to search root for easy location context |

### `SearchResultListing`
Server response payload for `GET /api/files/search`.

| Field | Type | Description |
|---|---|---|
| `query` | `string` | The executed search term |
| `search_root` | `string` | The directory subtree searched |
| `results` | `SearchResultEntry[]` | Array of matched entries |
| `total_matches` | `number` | Count of matched items |
| `is_truncated` | `boolean` | `true` if results hit maximum limit (e.g. 500 items) |

### `DragDropState`
Tracks user drag interactions across the file manager viewport.

| Field | Type | Description |
|---|---|---|
| `isDraggingOver` | `boolean` | `true` when files are hovering over the active drop target |
| `dragCounter` | `number` | Integer counter tracking nested element enter/leave events |

---

## 3. Sorting & Search Logic Flow

```text
[ DirectoryListing Loaded ]
            |
            v
[ Search Query Present? ]
     |              |
 (Yes)             (No)
     |              |
     v              v
[ Filter Entries ]  [ All Directory Entries ]
     |              |
     +-------+------+
             |
             v
[ Apply foldersFirst Grouping ]
     |
     +--> Group A: Folders (is_dir == true)
     |      |
     |      +--> Sort by SortField (Asc/Desc)
     |      |
     |      +--> Tie-break by name (Asc)
     |
     +--> Group B: Files (is_dir == false)
            |
            +--> Sort by SortField (Asc/Desc)
            |
            +--> Tie-break by name (Asc)
            |
            v
[ Combined Render List: Group A + Group B ]
```
