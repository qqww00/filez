# Tasks: Local Network File Manager

**Feature**: `001-local-file-manager`  
**Input**: Feature specification (`spec.md`), implementation plan (`plan.md`), data model (`data-model.md`), API contracts (`contracts/openapi.yaml`), and quickstart guide (`quickstart.md`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, build configuration, and dependency setup.

- [X] T001 Initialize Rust Cargo project with Axum, Tokio, Tower-HTTP, Serde, Clap, Thiserror, SHA2, HMAC, and UUID dependencies in `Cargo.toml`
- [X] T002 [P] Initialize Vite React TypeScript frontend project with dev proxy forwarding `/api` to `http://localhost:3000` in `frontend/package.json`, `frontend/tsconfig.json`, and `frontend/vite.config.ts`
- [X] T003 [P] Create responsive CSS variables, mobile-first reset, and theme styling in `frontend/src/styles/global.css`
- [X] T004 [P] Define TypeScript interfaces for `DirectoryEntry`, `DirectoryListing`, `Breadcrumb`, `CopyFileRequest`, `UploadResult`, and `ApiError` in `frontend/src/types/files.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Implement CLI arguments parsing and runtime configuration for `--root`, `--host`, `--port`, `--max-upload-mb`, and `--passphrase` in `src/config.rs`
- [X] T006 Implement strongly typed error handling and HTTP response mapping for `ApiError` codes (`INVALID_PATH`, `PATH_TRAVERSAL`, `UNAUTHORIZED`, `CONFLICT`, `NOT_FOUND`, `PAYLOAD_TOO_LARGE`, `IO_ERROR`) in `src/error.rs`
- [X] T007 Implement core `PathSandbox` service with canonicalization and boundary verification enforcing that canonicalized path MUST start with canonical root path prefix in `src/fs/sandbox.rs`
- [X] T008 [P] Implement authentication service with constant-time passphrase/PIN verification, HMAC session cookie signing, and verification middleware in `src/auth.rs`
- [X] T009 [P] Implement centralized frontend API client with fetch wrapper, credentials inclusion, and structured error handling in `frontend/src/api/client.ts`
- [X] T010 [P] Setup Axum router assembly, Tower trace middleware, security headers, and health endpoint `GET /api/health` in `src/handlers/health.rs` and `src/handlers/mod.rs`
- [X] T011 Create test fixtures helper for temporary directory sandbox creation in `tests/common/mod.rs`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Authenticate & Browse Files and Directories (Priority: P1) 🎯 MVP

**Goal**: Allow the user to log in with a pre-shared passphrase or PIN, view files and directories with metadata (name, type, size, modified time), navigate subfolders, and return to parent folders.

**Independent Test**: Connect browser or mobile phone to server, enter passphrase, view root directory entries, navigate into subdirectories with breadcrumbs, and return to parent folder.

### Tests for User Story 1
- [X] T012 [P] [US1] Write unit tests for directory listing, item sorting (directories first, then alphabetically), and metadata extraction in `src/fs/operations.rs`
- [X] T013 [P] [US1] Write integration tests for `POST /api/auth/login`, `GET /api/auth/status`, and `GET /api/files` in `tests/api_integration.rs`

### Implementation for User Story 1
- [X] T014 [US1] Implement filesystem directory listing operations producing `DirectoryListing` with `Breadcrumb[]` and `DirectoryEntry[]` in `src/fs/operations.rs`
- [X] T015 [US1] Implement Axum HTTP handlers for authentication (`POST /api/auth/login`, `GET /api/auth/status`) in `src/handlers/auth.rs`
- [X] T016 [US1] Implement Axum HTTP handler for directory listing `GET /api/files?path=` with authentication protection in `src/handlers/files.rs`
- [X] T017 [P] [US1] Implement typed API methods `login`, `getAuthStatus`, and `listFiles` in `frontend/src/api/files.ts`
- [X] T018 [P] [US1] Implement `LoginModal` component for passphrase/PIN entry with error states in `frontend/src/components/LoginModal.tsx`
- [X] T019 [P] [US1] Implement `Breadcrumbs` navigation component with touch-friendly tap targets in `frontend/src/components/Breadcrumbs.tsx`
- [X] T020 [P] [US1] Implement `FileRow` and `FileList` components displaying item icons, name, human-readable size, and modification date with loading and empty states in `frontend/src/components/FileRow.tsx` and `frontend/src/components/FileList.tsx`
- [X] T021 [US1] Implement `useFiles` React hook managing directory path state, loading, error notifications, and authentication state in `frontend/src/hooks/useFiles.ts`
- [X] T022 [US1] Assemble `FileManagerPage` and main application view in `frontend/src/pages/FileManagerPage.tsx` and `frontend/src/App.tsx`

**Checkpoint**: At this point, User Story 1 is fully functional and delivers an independently testable browsing MVP.

---

## Phase 4: User Story 2 - Upload Files from Phone or Desktop (Priority: P1)

**Goal**: Allow uploading single or multiple files from phone or desktop directly into the currently viewed directory on the laptop with size-limit enforcement and persistence across restarts.

**Independent Test**: Select single or multiple files from mobile phone or desktop, upload to target folder, verify progress feedback, verify files appear in directory, and verify files persist on disk across server restart.

### Tests for User Story 2
- [X] T023 [P] [US2] Write unit tests for atomic file writes via temporary files (`.filez_tmp_<uuid>`) and size limit enforcement in `src/fs/operations.rs`
- [X] T024 [P] [US2] Write integration tests for `POST /api/upload?path=` handling multipart streams and 413 Payload Too Large in `tests/api_integration.rs`

### Implementation for User Story 2
- [X] T025 [US2] Implement streaming multipart file writer with atomic rename (`tokio::fs::rename`) and size-limit enforcement in `src/fs/operations.rs`
- [X] T026 [US2] Implement Axum HTTP handler for `POST /api/upload?path=&overwrite=` in `src/handlers/files.rs`
- [X] T027 [P] [US2] Implement `uploadFiles` API method with progress tracking support in `frontend/src/api/files.ts`
- [X] T028 [P] [US2] Implement `UploadButton` component supporting multiple file selection from mobile camera roll or desktop file pickers with progress indicator in `frontend/src/components/UploadButton.tsx`
- [X] T029 [US2] Integrate upload functionality and automatic directory list refresh into `frontend/src/pages/FileManagerPage.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 are functional, completing the core browse-and-upload MVP.

---

## Phase 5: User Story 3 - Delete Files with Explicit Confirmation (Priority: P2)

**Goal**: Allow users to permanently delete regular files through the web interface only after an explicit confirmation dialog.

**Independent Test**: Trigger delete on a file, verify confirmation dialog appears, cancel to verify file is kept, confirm to verify file is removed from disk and UI.

### Tests for User Story 3
- [X] T030 [P] [US3] Write unit and integration tests for file deletion and error handling in `src/fs/operations.rs` and `tests/api_integration.rs`

### Implementation for User Story 3
- [X] T031 [US3] Implement file deletion logic in `src/fs/operations.rs` and Axum handler for `DELETE /api/files?path=` in `src/handlers/files.rs`
- [X] T032 [P] [US3] Implement `deleteFile` API client method in `frontend/src/api/files.ts`
- [X] T033 [P] [US3] Implement `ConfirmDeleteDialog` modal component with accessible keyboard and touch controls in `frontend/src/components/ConfirmDeleteDialog.tsx`
- [X] T034 [US3] Integrate file deletion triggers and confirmation flow in `frontend/src/components/FileRow.tsx` and `frontend/src/pages/FileManagerPage.tsx`

**Checkpoint**: User Stories 1, 2, and 3 work independently and safely.

---

## Phase 6: User Story 4 - Copy Files Between Permitted Directories (Priority: P2)

**Goal**: Allow copying a file to another destination directory within the root with overwrite protection.

**Independent Test**: Select a file, choose a target directory, copy it, verify both copies exist with identical content; attempt copy to existing filename without overwrite to verify 409 Conflict.

### Tests for User Story 4
- [X] T035 [P] [US4] Write unit and integration tests for file copy operations, overwrite prevention, and destination validation in `src/fs/operations.rs` and `tests/api_integration.rs`

### Implementation for User Story 4
- [X] T036 [US4] Implement file copy logic with overwrite protection in `src/fs/operations.rs` and Axum handler for `POST /api/files/copy` in `src/handlers/files.rs`
- [X] T037 [P] [US4] Implement `copyFile` API client method in `frontend/src/api/files.ts`
- [X] T038 [P] [US4] Implement `CopyDialog` component allowing folder destination selection within the managed hierarchy in `frontend/src/components/CopyDialog.tsx`
- [X] T039 [US4] Integrate copy file action into `frontend/src/components/FileRow.tsx` and directory refresh in `frontend/src/pages/FileManagerPage.tsx`

**Checkpoint**: All core file operations (browse, upload, copy, delete) are functional.

---

## Phase 7: User Story 5 - Enforce Filesystem Isolation & Sandbox Boundaries (Priority: P1)

**Goal**: Verify and enforce that no request, path parameter, or symlink can access or mutate files outside the configured root directory.

**Independent Test**: Execute security test suite with `../` traversal, encoded slashes, absolute paths, and external symlinks, ensuring 100% fail-closed rejection.

### Tests & Hardening for User Story 5
- [X] T040 [P] [US5] Write comprehensive path traversal security penetration test suite in `tests/path_traversal.rs`
- [X] T041 [P] [US5] Write symlink escape penetration test suite verifying that symlinks pointing outside root are blocked with 403 Forbidden in `tests/path_traversal.rs`
- [X] T042 [US5] Add secondary defense-in-depth boundary checks to all filesystem handlers before any file descriptor operations in `src/fs/sandbox.rs` and `src/handlers/files.rs`

**Checkpoint**: Sandbox containment strictly verified across all attack vectors.

---

## Phase 8: Polish & Production Integration

**Purpose**: Single-binary packaging, console discovery banner, documentation, and final end-to-end verification.

- [X] T043 [P] Configure Axum static asset serving (`tower_http::services::ServeDir`) with SPA fallback to `frontend/dist/index.html` in `src/main.rs`
- [X] T044 [P] Implement local network IP discovery and startup console banner displaying LAN access URL and PIN in `src/main.rs`
- [X] T045 Run complete quickstart validation suite against both dev server and release binary per `specs/001-local-file-manager/quickstart.md`
- [X] T046 Document build, test, and LAN Wi-Fi deployment instructions in `README.md`

---

## Dependencies & Execution Order

### Phase Dependencies
1. **Setup (Phase 1)**: Can start immediately.
2. **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories.
3. **User Story 1 (Phase 3 - P1)**: Depends on Phase 2 completion.
4. **User Story 2 (Phase 4 - P1)**: Depends on Phase 2 completion; integrates with UI from US1.
5. **User Story 3 (Phase 5 - P2)**: Depends on Phase 2 completion; integrates with UI from US1.
6. **User Story 4 (Phase 6 - P2)**: Depends on Phase 2 completion; integrates with UI from US1.
7. **User Story 5 (Phase 7 - P1)**: Can run in parallel with or immediately following Phase 3-6.
8. **Polish (Phase 8)**: Depends on completion of all user stories.

### User Story Completion Order
`Foundational` → `US1 (Browse & Auth)` → `US2 (Upload)` → `US3 (Delete)` → `US4 (Copy)` → `US5 (Sandbox Hardening)` → `Polish`

---

## Parallel Opportunities

- **Phase 1 (Setup)**: Tasks `T002`, `T003`, and `T004` can run in parallel with `T001`.
- **Phase 2 (Foundational)**: `T008` (auth), `T009` (frontend client), and `T010` (router/middleware) can run in parallel once `T005`-`T007` define config and error types.
- **Phase 3 (US1)**: Tests `T012` and `T013` can run in parallel. Frontend components `T018`, `T019`, and `T020` can run in parallel while backend handlers `T014`-`T016` are built.
- **Phase 4 (US2)**: Tests `T023` and `T024` run in parallel. Frontend `T027` and `T028` run in parallel with backend `T025` and `T026`.
- **Phase 5 (US3)**: Tests `T030` and frontend modal `T033` run in parallel with backend handler `T031`.
- **Phase 6 (US4)**: Tests `T035` and dialog component `T038` run in parallel with backend copy handler `T036`.
- **Phase 7 (US5)**: Penetration tests `T040` and `T041` can run concurrently.
- **Phase 8 (Polish)**: `T043` and `T044` can be implemented concurrently.

---

## Implementation Strategy

### MVP First (User Stories 1 & 2)
1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (US1: Browse & Auth) → Test independently.
3. Complete Phase 4 (US2: Upload) → Test independently.
4. **Validate MVP**: Browse, authenticate, and upload files over local Wi-Fi.

### Incremental Feature Additions
1. Add Phase 5 (US3: Delete with confirmation).
2. Add Phase 6 (US4: Copy files).
3. Add Phase 7 (US5: Security boundary verification).
4. Complete Phase 8 (Polish & Single-binary production build).
