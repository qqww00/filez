# Tasks: Mobile-Responsive User Interface

**Feature**: `005-mobile-responsive-ui`
**Specification**: [spec.md](file:///home/dev/src/filez/specs/005-mobile-responsive-ui/spec.md)
**Implementation Plan**: [plan.md](file:///home/dev/src/filez/specs/005-mobile-responsive-ui/plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish responsive CSS variables, touch sizing tokens, and HTML viewport configuration.

- [X] T001 [P] Define responsive viewport tokens (`--touch-target-min: 44px`, `--touch-target-media: 48px`, `--touch-gap-min: 8px`, `--input-font-size-mobile: 16px`, `--viewport-height: 100dvh`) and root overflow rules in `frontend/src/styles/global.css`
- [X] T002 [P] Update viewport meta tag and title for mobile browser chrome in `frontend/index.html`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core hooks and styling media queries that all responsive user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 [P] Implement `useScrollLock` hook to manage `document.body` overflow locking when modals or drawers are open in `frontend/src/hooks/useScrollLock.ts`
- [X] T004 [P] Establish foundational responsive media queries (`@media (max-width: 640px)` and `@media (max-width: 768px)`) and layout containers in `frontend/src/styles/file-manager.css`

**Checkpoint**: Core responsive design tokens and scroll locking ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Touch-First File Browsing & Navigation (Priority: P1) 🎯 MVP

**Goal**: Deliver touch-friendly directory navigation, horizontal momentum scrolling on breadcrumbs, ellipsis truncation for long filenames without pushing action buttons, and minimum 44×44px touch targets.

**Independent Test**: Load the file manager on mobile viewports (320px–768px), navigate into folders via touch, scroll breadcrumbs horizontally, and verify long filename truncation and >=44px touch targets.

### Implementation for User Story 1

- [X] T005 [P] [US1] Implement horizontal momentum touch scrolling and overflow safety for breadcrumbs in `frontend/src/components/Breadcrumbs.tsx` and `frontend/src/styles/file-manager.css`
- [X] T006 [P] [US1] Update `FileRow` layout for mobile (<640px) with stacked icon/name top tier, ellipsis truncation (`min-width: 0`), and metadata/actions bottom tier in `frontend/src/components/FileRow.tsx` and `frontend/src/styles/file-manager.css`
- [X] T007 [P] [US1] Ensure all primary interactive elements in header, breadcrumbs, and directory rows meet minimum 44×44px touch targets with active tap feedback in `frontend/src/styles/file-manager.css`
- [X] T008 [US1] Update `FileManagerPage` header layout to scale brand title and action buttons compactly on narrow screens in `frontend/src/pages/FileManagerPage.tsx` and `frontend/src/styles/file-manager.css`

**Checkpoint**: User Story 1 is fully functional and delivers an independently testable MVP.

---

## Phase 4: User Story 2 - Mobile-Friendly Search and Sorting Controls (Priority: P2)

**Goal**: Provide a touch-adapted search bar that fits mobile screens, virtual keyboard focus with 16px font size to prevent automatic iOS zoom, responsive subfolder toggle, and an accessible mobile sort selector dropdown.

**Independent Test**: Focus search input on a mobile screen, type query without auto-zoom, clear search with touch, toggle subfolder search, and change sort options via dropdown, verifying instant layout adjustment and no viewport overflow.

### Implementation for User Story 2

- [X] T009 [P] [US2] Update `SearchBar` component with 16px font-size input to prevent iOS auto-zoom, touch-accessible clear button (44×44px), and flexible wrapping in `frontend/src/components/SearchBar.tsx` and `frontend/src/styles/file-manager.css`
- [X] T010 [P] [US2] Enhance `FileList` mobile sort selector (`.mobile-sort-bar`) with minimum 44px height, accessible typography, and smooth directory reordering in `frontend/src/components/FileList.tsx` and `frontend/src/styles/file-manager.css`
- [X] T011 [US2] Integrate search bar mobile wrapping and status indicators into `FileManagerPage` layout in `frontend/src/pages/FileManagerPage.tsx` and `frontend/src/styles/file-manager.css`

**Checkpoint**: User Stories 1 and 2 work seamlessly together on small screens.

---

## Phase 5: User Story 3 - Responsive Modals, Dialogs, and Upload Drawer (Priority: P3)

**Goal**: Adapt confirmation dialogs (Delete, Copy, Login) as responsive cards with safe margins, lock background scrolling when modals are open, dock upload progress drawer to the bottom as an expandable bottom sheet, and scale video player to 100dvh with enlarged 48px controls.

**Independent Test**: Open login, delete confirmation, copy dialog, video player, and file upload progress on a mobile screen, verifying each dialog fits comfortably, scrolls internally if needed, and presents clear action buttons.

### Implementation for User Story 3

- [X] T012 [P] [US3] Update `ConfirmDeleteDialog` with responsive card sizing (`max-width: calc(100vw - 2rem)`), centered touch-friendly action buttons, and safe margins in `frontend/src/components/ConfirmDeleteDialog.tsx` and `frontend/src/styles/file-manager.css`
- [X] T013 [P] [US3] Update `CopyDialog` with max-height 85dvh, internal touch scrolling for folder list, and pinned bottom action buttons in `frontend/src/components/CopyDialog.tsx` and `frontend/src/styles/file-manager.css`
- [X] T014 [P] [US3] Update `LoginModal` with mobile-optimized card styling, 16px passphrase input, and touch submit button in `frontend/src/components/LoginModal.tsx` and `frontend/src/styles/file-manager.css`
- [X] T015 [P] [US3] Update `UploadProgressDrawer` to render as a docked bottom sheet on mobile (<600px) with touch expand/minimize and cancel targets (>=44px) in `frontend/src/components/UploadProgressDrawer.tsx` and `frontend/src/styles/file-manager.css`
- [X] T016 [P] [US3] Optimize `VideoPlayerModal` for mobile (100dvh scaling, 48×48px control buttons, 36px scrubber touch area, landscape orientation support) in `frontend/src/components/VideoPlayerModal.tsx` and `frontend/src/styles/file-manager.css`
- [X] T017 [US3] Integrate `useScrollLock` into `FileManagerPage` for all modal states (delete, copy, video, login) in `frontend/src/pages/FileManagerPage.tsx`

**Checkpoint**: All three user stories are complete, delivering full mobile responsiveness across the entire application.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Test execution, responsive verification across all presets, and clean production build.

- [X] T018 [P] Implement Cucumber step definition assertions for mobile scenarios in `features/step_definitions/steps.js`
- [X] T019 Run Cucumber test suite (`npx cucumber-js`) and Vitest tests (`npm test` in `frontend/`)
- [X] T020 Validate responsive layouts across 320px, 375px, 412px, 768px viewports per `specs/005-mobile-responsive-ui/quickstart.md`
- [X] T021 Verify clean production build with `npm run build` in `frontend/` and `cargo check` in repository root

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Completed.
- **Foundational (Phase 2)**: Completed.
- **User Stories (Phase 3+)**: Completed.
- **Polish (Phase 6)**: Completed.
