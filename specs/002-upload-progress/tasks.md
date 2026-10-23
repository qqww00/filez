# Tasks: Intuitive File Upload Progress

**Feature**: `002-upload-progress`
**Specification**: [spec.md](file:///home/dev/src/filez/specs/002-upload-progress/spec.md)
**Implementation Plan**: [plan.md](file:///home/dev/src/filez/specs/002-upload-progress/plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Define TypeScript models, data contracts, and calculation utility functions for upload tracking.

- [X] T001 [P] Create upload state and event interfaces (`UploadItem`, `UploadBatch`, `UploadItemStatus`, `UploadProgressEvent`) in `frontend/src/types/upload.ts`
- [X] T002 [P] Create transfer metrics calculation helpers (`formatBytes`, `formatDuration`, and Exponential Moving Average `calculateSmoothedSpeed`) in `frontend/src/utils/progress.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core XHR progress streaming client and base styling that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Implement `uploadSingleFileWithProgress` using browser `XMLHttpRequest` with upload `ProgressEvent` listeners and `AbortSignal` support in `frontend/src/api/files.ts`
- [X] T004 [P] Define CSS custom properties, progress bar animations, and status badge styling in `frontend/src/index.css`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Real-Time Single File Upload Progress (Priority: P1) 🎯 MVP

**Goal**: Deliver real-time visual progress feedback (percentage, transferred volume, speed, ETA) for single file uploads, automatically refreshing directory listings upon completion.

**Independent Test**: Upload a single file (e.g., 30 MB+) and verify that the progress bar advances smoothly from 0% to 100%, displays real-time byte counters and transfer speed, and refreshes the file list upon server completion.

### Implementation for User Story 1

- [X] T005 [P] [US1] Create accessible `ProgressBar` component with ARIA attributes (`role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`) in `frontend/src/components/ProgressBar.tsx`
- [X] T006 [US1] Implement single-file upload lifecycle management and progress state updates in `frontend/src/hooks/useUploadManager.ts`
- [X] T007 [US1] Integrate `useUploadManager` into `frontend/src/pages/FileManagerPage.tsx` and connect `UploadButton.tsx` to initiate single uploads with active progress feedback
- [X] T008 [US1] Connect upload completion events in `frontend/src/pages/FileManagerPage.tsx` to automatically trigger `refreshFiles()` when files are uploaded to the currently viewed directory

**Checkpoint**: User Story 1 is fully functional and delivers an independently testable MVP.

---

## Phase 4: User Story 2 - Multi-File Queue with Individual and Aggregate Progress (Priority: P2)

**Goal**: Support batch uploads of multiple files with an aggregate summary ("Uploading file X of N - Y%") and an itemized breakdown of per-file statuses (`queued`, `uploading`, `completed`, `failed`).

**Independent Test**: Select 3 or more files for upload simultaneously; observe sequential execution, individual item status badges transitioning from `queued` to `uploading` to `completed`, and aggregate progress advancing accurately.

### Implementation for User Story 2

- [X] T009 [P] [US2] Create `UploadProgressItem` component rendering file name, formatted size, status badge, progress bar, speed, and ETA in `frontend/src/components/UploadProgressItem.tsx`
- [X] T010 [US2] Implement sequential queue processing and aggregate batch progress calculations in `frontend/src/hooks/useUploadManager.ts`
- [X] T011 [US2] Implement expandable/collapsible queue list displaying all batch items in `frontend/src/components/UploadProgressDrawer.tsx`
- [X] T012 [US2] Update `frontend/src/components/UploadButton.tsx` to accept multiple files and feed the entire array into `enqueueFiles`

**Checkpoint**: User Stories 1 and 2 work seamlessly together for single and multi-file workflows.

---

## Phase 5: User Story 3 - Non-Blocking Floating Drawer with Cancellation and Error Handling (Priority: P3)

**Goal**: Provide a persistent, non-blocking drawer anchored at the bottom-right that allows users to navigate folders during uploads, cancel active transfers via `xhr.abort()`, and display isolated error messages for failed items.

**Independent Test**: Start an upload, navigate across directory subfolders while the upload continues in the background, click cancel and verify immediate transfer termination without orphaned `.part` files, and test network drop simulation to observe clear error badges.

### Implementation for User Story 3

- [X] T013 [P] [US3] Add cancellation handlers (`cancelItem`, `cancelAll`) with synchronous `xhr.abort()` and status transition to `cancelled` in `frontend/src/hooks/useUploadManager.ts`
- [X] T014 [P] [US3] Implement floating drawer layout with minimize, expand, and dismiss controls in `frontend/src/components/UploadProgressDrawer.tsx`
- [X] T015 [US3] Implement window `beforeunload` warning listener in `frontend/src/hooks/useUploadManager.ts` to prevent accidental page closing during active transfers
- [X] T016 [US3] Wire floating drawer state into `frontend/src/pages/FileManagerPage.tsx` ensuring directory navigation does not reset or abort ongoing uploads
- [X] T017 [US3] Add error state rendering and descriptive error badges for failed items in `frontend/src/components/UploadProgressItem.tsx`

**Checkpoint**: All three user stories are fully functional, providing complete control and resilient error handling.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Responsive touch improvements, mobile layout optimizations, and end-to-end verification.

- [X] T018 [P] Optimize mobile styles (bottom-docked sheet on viewports < 600px, 44px minimum touch targets) in `frontend/src/index.css`
- [X] T019 Execute end-to-end verification scenarios (single file, batch queue, cancel abort, and mobile viewport) per `specs/002-upload-progress/quickstart.md`
- [X] T020 Run complete project quality checks (`npm run build` in `frontend` and `cargo test` in root)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2 — MVP foundation.
- **User Story 2 (Phase 4)**: Depends on Phase 3 completion.
- **User Story 3 (Phase 5)**: Depends on Phase 4 completion.
- **Polish (Phase 6)**: Depends on all user stories being complete.

### User Story Dependencies

```text
[Phase 1: Setup (T001, T002)]
               |
               v
[Phase 2: Foundational (T003, T004)]
               |
               v
[Phase 3: User Story 1 (T005-T008)] 🎯 MVP
               |
               v
[Phase 4: User Story 2 (T009-T012)]
               |
               v
[Phase 5: User Story 3 (T013-T017)]
               |
               v
[Phase 6: Polish & Validation (T018-T020)]
```

### Parallel Opportunities

- **Phase 1**: `T001` (`types/upload.ts`) and `T002` (`utils/progress.ts`) can run in parallel.
- **Phase 2**: `T004` (CSS styling) can run in parallel with `T003` (`api/files.ts`).
- **Phase 3**: `T005` (`ProgressBar.tsx`) can be developed in parallel with `T006` (`useUploadManager.ts`).
- **Phase 4**: `T009` (`UploadProgressItem.tsx`) can be developed in parallel with `T010` (`useUploadManager.ts`).
- **Phase 5**: `T013` (abort logic) and `T014` (drawer layout) can be developed in parallel.
- **Phase 6**: `T018` (mobile CSS) can run in parallel with verification preparation.

---

## Parallel Example: User Story 1

```bash
# Developer A: UI component
Task: T005 [P] [US1] Create accessible ProgressBar component in frontend/src/components/ProgressBar.tsx

# Developer B: State & Manager Hook
Task: T006 [US1] Implement single-file upload lifecycle management in frontend/src/hooks/useUploadManager.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1 (Setup: Types and calculation utilities).
2. Complete Phase 2 (Foundational: XHR streaming client and CSS tokens).
3. Complete Phase 3 (User Story 1: Single file progress bar and completion refresh).
4. **Validate**: Test single file upload of 30 MB+ file; verify real-time percentage and speed feedback.

### Incremental Delivery
1. Add User Story 2: Expand to multi-file queue and aggregate overview.
2. Add User Story 3: Add floating non-blocking drawer, cancelation via `xhr.abort()`, and error recovery.
3. Polish: Mobile ergonomics and comprehensive verification across desktop and mobile devices.
