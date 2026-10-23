# Tasks: In-App Video Media Player with Android Mobile Support

**Feature**: `003-video-player`
**Specification**: [spec.md](file:///home/dev/src/filez/specs/003-video-player/spec.md)
**Implementation Plan**: [plan.md](file:///home/dev/src/filez/specs/003-video-player/plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Media detection helpers, file extension definitions, and TypeScript interfaces.

- [X] T001 [P] Create media utilities (`isVideoFile`, `formatMediaTime`, supported video extensions list) in `frontend/src/utils/media.ts`
- [X] T002 [P] Create video player types and playback state interfaces in `frontend/src/types/media.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend HTTP byte-range streaming endpoint (`GET /api/files/content`) and base modal styles.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Implement backend streaming handler `stream_file_content` with `PathSandbox::resolve` and `tower_http::services::fs::ServeFile` in `src/handlers/files.rs`
- [X] T004 Register `GET /api/files/content` in protected files router in `src/handlers/mod.rs`
- [X] T005 [P] Add backend integration test for `GET /api/files/content` testing full content (200 OK) and byte range request (206 Partial Content) in `tests/api_integration.rs`
- [X] T006 [P] Add video modal CSS animations, backdrop blur, and base player styling in `frontend/src/styles/file-manager.css`

**Checkpoint**: Foundation ready — streaming endpoint and base styling operational.

---

## Phase 3: User Story 1 - Seamless In-App Video Playback (Priority: P1) 🎯 MVP

**Goal**: Clicking any video file row opens an in-app player overlay with playback controls, streaming the video without downloading first.

**Independent Test**: Click an MP4 video in the file list; verify that the player modal opens, playback begins, play/pause and volume respond smoothly, and closing halts all audio.

### Implementation for User Story 1

- [X] T007 [P] [US1] Implement `useVideoPlayer` hook managing HTML5 video lifecycle, play/pause, time updates, and volume in `frontend/src/hooks/useVideoPlayer.ts`
- [X] T008 [P] [US1] Create `VideoPlayerModal` component with header, video element, and transport controls in `frontend/src/components/VideoPlayerModal.tsx`
- [X] T009 [US1] Update `frontend/src/components/FileRow.tsx` to detect video files, display video icon (`🎬`), and trigger playback on row click
- [X] T010 [US1] Mount `VideoPlayerModal` and manage active video state in `frontend/src/pages/FileManagerPage.tsx`

**Checkpoint**: User Story 1 delivers an independently testable MVP for in-app video viewing.

---

## Phase 4: User Story 2 - Mobile & Android Touch Viewport Optimization (Priority: P2)

**Goal**: Full-width responsive player optimized for Android and touchscreens with 48px tap targets, auto-hiding controls (3s idle timer), and fullscreen rotation.

**Independent Test**: On a simulated mobile viewport (360px–414px), open a video; verify that controls auto-hide after 3 seconds of playback, tap targets are >= 48px, and fullscreen toggle expands to full mobile screen.

### Implementation for User Story 2

- [X] T011 [P] [US2] Implement touch-friendly mobile controls overlay with 48px tap targets and auto-hide timer (3s inactivity) in `frontend/src/hooks/useVideoPlayer.ts`
- [X] T012 [P] [US2] Add responsive mobile CSS for full-width portrait and landscape orientation with touch scrubber in `frontend/src/styles/file-manager.css`
- [X] T013 [US2] Implement Fullscreen API toggle with Android webkit fallback in `frontend/src/components/VideoPlayerModal.tsx`

**Checkpoint**: User Stories 1 and 2 deliver high-quality video playback on desktop and Android mobile devices.

---

## Phase 5: User Story 3 - Instant Seeking, Playback Speed & Codec Fallback (Priority: P3)

**Goal**: Timeline scrubbing with byte-range streaming, adjustable playback speeds (`0.5x`–`2.0x`), desktop keyboard shortcuts, and unsupported codec download fallback.

**Independent Test**: Seek to the middle of a large video file and verify sub-second range streaming playback; test changing playback rate to 1.5x; test an unplayable file to verify informative message and direct download button.

### Implementation for User Story 3

- [X] T014 [P] [US3] Implement interactive timeline scrubber with buffer progress and touch drag in `frontend/src/components/VideoPlayerModal.tsx`
- [X] T015 [P] [US3] Add variable playback rate selector (`0.5x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`) in `frontend/src/components/VideoPlayerModal.tsx`
- [X] T016 [US3] Add desktop keyboard shortcuts (Space, Arrows, M, F, Esc) in `frontend/src/components/VideoPlayerModal.tsx`
- [X] T017 [US3] Implement unsupported codec detection and fallback view with direct download button in `frontend/src/components/VideoPlayerModal.tsx`

**Checkpoint**: All user stories functional with full media controls, range scrubbing, and graceful fallbacks.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Touch ergonomics verification, quickstart end-to-end testing, and complete project checks.

- [X] T018 [P] Verify mobile viewport styles on 360px–414px viewports in `frontend/src/index.css`
- [X] T019 Execute quickstart validation scenarios with test video per `specs/003-video-player/quickstart.md`
- [X] T020 Run complete project quality checks (`cargo test`, `cargo clippy -- -D warnings`, and `npm run build`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
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
[Phase 2: Foundational (T003-T006)]
               |
               v
[Phase 3: User Story 1 (T007-T010)] 🎯 MVP
               |
               v
[Phase 4: User Story 2 (T011-T013)]
               |
               v
[Phase 5: User Story 3 (T014-T017)]
               |
               v
[Phase 6: Polish & Validation (T018-T020)]
```

### Parallel Opportunities

- **Phase 1**: `T001` (`utils/media.ts`) and `T002` (`types/media.ts`) can run in parallel.
- **Phase 2**: `T005` (backend tests) and `T006` (CSS styling) can run in parallel with `T003`/`T004`.
- **Phase 3**: `T007` (`useVideoPlayer.ts`) and `T008` (`VideoPlayerModal.tsx`) can be developed in parallel.
- **Phase 4**: `T011` (timer logic) and `T012` (mobile CSS) can run in parallel.
- **Phase 5**: `T014` (scrubber) and `T015` (speed selector) can be developed in parallel.

---

## Parallel Example: User Story 1

```bash
# Developer A: UI component
Task: T008 [P] [US1] Create VideoPlayerModal component in frontend/src/components/VideoPlayerModal.tsx

# Developer B: Media playback state hook
Task: T007 [P] [US1] Implement useVideoPlayer hook in frontend/src/hooks/useVideoPlayer.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1 (Media utils and types).
2. Complete Phase 2 (Backend Range streaming route & base CSS).
3. Complete Phase 3 (Video player modal & FileRow video click handler).
4. **Validate**: Click an MP4 video and verify playback starts smoothly in the browser.

### Incremental Delivery
1. Add User Story 2: Mobile touch auto-hide controls and fullscreen orientation for Android devices.
2. Add User Story 3: Range scrubbing, playback rate selector, keyboard shortcuts, and codec error fallback.
3. Polish: Mobile verification, quickstart end-to-end tests, and automated quality checks.
