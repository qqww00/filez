# Tasks: File Search, Sorting, and Multi-File Upload

**Feature**: `004-search-sort-upload`
**Specification**: [spec.md](file:///home/dev/src/filez/specs/004-search-sort-upload/spec.md)
**Implementation Plan**: [plan.md](file:///home/dev/src/filez/specs/004-search-sort-upload/plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Define TypeScript models, backend data structures, and shared types for search, sorting, and batch upload.

- [X] T001 [P] Define search, sort, and drag-and-drop interfaces (`SortField` `'name' | 'size' | 'date' | 'type'`, `SortDirection` `'asc' | 'desc'`, `SortConfig`, `SearchResultEntry`, `SearchResultListing`, `DragDropState`) in `frontend/src/types/files.ts`
- [X] T002 [P] Define Rust search query parameters and response serialization types (`SearchQuery`, `SearchResultEntry`, `SearchResultListing`) in `src/handlers/files.rs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend recursive search traversal, sandbox security enforcement, and styling primitives that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Implement `search_directory` in `src/fs/operations.rs` with recursive subtree traversal, depth capping (max 20 levels), result limit (max 500 entries), case-insensitive substring matching, and strict sandbox root containment
- [X] T004 [P] Add unit tests for `search_directory` in `src/fs/operations.rs` verifying root search, nested folder discovery, empty queries, and path traversal rejection
- [X] T005 Implement `search_files` HTTP handler for `GET /api/files/search` with authentication and parameter validation in `src/handlers/files.rs` and register route in `src/main.rs`
- [X] T006 [P] Add API integration tests in `tests/api_integration.rs` verifying authenticated search requests, 401 unauthorized errors, and sandbox boundary containment
- [X] T007 [P] Define styling for sortable column header arrows, search bar, recursive search toggle, and drag-and-drop overlay in `frontend/src/styles/file-manager.css`

**Checkpoint**: Core search API and styling foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Flexible File and Folder Sorting (Priority: P1) 🎯 MVP

**Goal**: Deliver in-memory multi-attribute sorting for files and folders (by Name, Size, Modified Date, and Type) with folders grouped at the top, ascending/descending toggle with visual indicators, and session persistence.

**Independent Test**: Open a folder containing mixed files and folders, click column headers (Name, Size, Modified), verify folders group at top and entries sort accurately in asc/desc order with persistent preference across folder navigation.

### Implementation for User Story 1

- [X] T008 [P] [US1] Implement sorting comparison and tie-breaking algorithms (`compareEntries` with folders-first grouping and case-insensitive name tie-breaker) in `frontend/src/utils/sorting.ts`
- [X] T009 [US1] Implement `useFileSortAndFilter` hook managing `sortConfig`, `setSortField`, `toggleSortDirection`, and `sessionStorage` persistence in `frontend/src/hooks/useFileSortAndFilter.ts`
- [X] T010 [P] [US1] Update `frontend/src/components/FileList.tsx` to render interactive sortable column headers with directional indicator arrows (`▲`/`▼`)
- [X] T011 [US1] Integrate `useFileSortAndFilter` into `frontend/src/pages/FileManagerPage.tsx` to apply active sorting to directory entries

**Checkpoint**: User Story 1 is fully functional and delivers an independently testable MVP.

---

## Phase 4: User Story 2 - Instant Search and Subtree Discovery (Priority: P2)

**Goal**: Provide real-time in-folder filtering as keywords are typed, along with backend recursive subtree search for discovering deeply nested files and folders, with direct file actions and navigation.

**Independent Test**: Type keywords into the search bar to verify instant filtering; trigger recursive search to find items in subdirectories with relative path context; click a matched folder to navigate or a file to open/preview/play.

### Implementation for User Story 2

- [X] T012 [P] [US2] Implement `searchFiles` client API function for `GET /api/files/search` in `frontend/src/api/files.ts`
- [X] T013 [P] [US2] Create `SearchBar` component with live filter input, clear button, and recursive search toggle in `frontend/src/components/SearchBar.tsx`
- [X] T014 [US2] Expand `useFileSortAndFilter` hook to support instant current-folder substring filtering, recursive search queries, and empty match tracking in `frontend/src/hooks/useFileSortAndFilter.ts`
- [X] T015 [US2] Update `frontend/src/components/FileRow.tsx` and `frontend/src/components/FileList.tsx` to display relative folder location for search results and handle empty search states
- [X] T016 [US2] Integrate `SearchBar` and recursive search state into `frontend/src/pages/FileManagerPage.tsx` with seamless clear and directory navigation resets

**Checkpoint**: User Stories 1 and 2 work seamlessly together for rapid organization and discovery.

---

## Phase 5: User Story 3 - Multi-File Upload and Drag-and-Drop Batch Ingestion (Priority: P3)

**Goal**: Allow users to select multiple files at once via file picker or drag and drop batches of files directly into the file manager window, enqueuing them seamlessly into the upload progress queue.

**Independent Test**: Drag multiple files from desktop onto the file manager drop zone or select multiple files in the file picker, observe visual drop overlay, verify all files are enqueued into the upload queue, and verify directory auto-refreshes upon completion.

### Implementation for User Story 3

- [X] T017 [P] [US3] Create `DropZoneOverlay` component with anti-flicker drag counter tracking (`dragenter`, `dragover`, `dragleave`, `drop`) and visual drop indicator in `frontend/src/components/DropZoneOverlay.tsx`
- [X] T018 [US3] Wrap file container in `frontend/src/pages/FileManagerPage.tsx` with drag-and-drop listener that extracts dropped files and routes them through `handleUpload`
- [X] T019 [US3] Ensure `frontend/src/components/UploadButton.tsx` and `FileManagerPage.tsx` handle multi-file arrays (20+ files) with per-file size validation and error reporting without dropping valid files

**Checkpoint**: All three user stories are fully functional, providing complete control over file sorting, discovery, and batch ingestion.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Responsive touch improvements, mobile layout optimizations, and end-to-end verification.

- [X] T020 [P] Optimize mobile touch targets (minimum 44px) and responsive search/sort layout in `frontend/src/styles/file-manager.css`
- [X] T021 Execute end-to-end verification scenarios per `specs/004-search-sort-upload/quickstart.md`
- [X] T022 Run complete project quality checks (`cargo test` in root and `npm run build` in `frontend/`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2 — MVP foundation.
- **User Story 2 (Phase 4)**: Depends on Phase 2 and integrates with US1 sorting.
- **User Story 3 (Phase 5)**: Depends on Phase 2 and integrates with existing `useUploadManager`.
- **Polish (Phase 6)**: Depends on all user stories being complete.

### User Story Dependencies

```text
[Phase 1: Setup (T001, T002)]
               |
               v
[Phase 2: Foundational (T003-T007)]
               |
               v
[Phase 3: User Story 1 (T008-T011)] 🎯 MVP
               |
               v
[Phase 4: User Story 2 (T012-T016)]
               |
               v
[Phase 5: User Story 3 (T017-T019)]
               |
               v
[Phase 6: Polish & Validation (T020-T022)]
```

### Parallel Opportunities

- **Phase 1**: `T001` (`types/files.ts`) and `T002` (`handlers/files.rs`) can run in parallel.
- **Phase 2**: `T004` (unit tests), `T006` (integration tests), and `T007` (CSS styles) can run in parallel with backend implementation.
- **Phase 3**: `T008` (`sorting.ts`) and `T010` (`FileList.tsx` header UI) can run in parallel.
- **Phase 4**: `T012` (`api/files.ts`) and `T013` (`SearchBar.tsx`) can run in parallel.
- **Phase 5**: `T017` (`DropZoneOverlay.tsx`) can run in parallel with upload validation updates.
- **Phase 6**: `T020` (mobile CSS) can run in parallel with verification preparation.

---

## Parallel Example: User Story 1

```bash
# Developer A: Sorting algorithms & unit logic
Task: T008 [P] [US1] Implement sorting comparison and tie-breaking algorithms in frontend/src/utils/sorting.ts

# Developer B: Table header UI & indicator arrows
Task: T010 [P] [US1] Update FileList.tsx to render interactive sortable column headers in frontend/src/components/FileList.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1 (Setup: Shared types).
2. Complete Phase 2 (Foundational: Backend search infrastructure and styling).
3. Complete Phase 3 (User Story 1: Sorting files and folders with folders at top).
4. **Validate**: Test sorting by Name, Size, Modified Date across directory navigation.

### Incremental Delivery
1. Add User Story 2: Instant in-folder live search + backend recursive search.
2. Add User Story 3: Visual drag-and-drop batch file ingestion.
3. Polish: Touch target optimization and automated verification.
