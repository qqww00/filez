# Implementation Plan: Mobile-Responsive User Interface

**Branch**: `005-mobile-responsive-ui` | **Date**: 2026-10-24 | **Spec**: [spec.md](file:///home/dev/src/filez/specs/005-mobile-responsive-ui/spec.md)

**Input**: Feature specification from `specs/005-mobile-responsive-ui/spec.md`

## Summary

Implement a touch-first, mobile-responsive layout for the Filez web application across smartphone and tablet viewports (320px to 768px). The technical approach focuses on modern, framework-free Vanilla CSS and component ergonomics:
1. **Adaptive Viewport & Layout**: Responsive breakpoints (`@media (max-width: 640px)` and `@media (max-width: 768px)`), dynamic viewport units (`100dvh`), root horizontal scroll prevention (`overflow-x: hidden`), and mobile-optimized typography.
2. **Touch-First Navigation & File Rows**: Horizontal momentum scrolling for directory breadcrumbs, stacked two-tier file rows on mobile with graceful ellipsis name truncation, and minimum 44×44px touch targets compliant with WCAG 2.2 AA.
3. **Mobile Controls, Modals & Bottom Sheets**: 16px input font sizing preventing mobile browser auto-zoom, responsive sorting selector, centered/bottom card modals with background scroll-locking, and a docked bottom sheet for the upload progress drawer.

## Technical Context

**Language/Version**: TypeScript 5.2+ (Frontend), CSS3, Rust 1.75+ (Backend)

**Primary Dependencies**: React 18, Vite, Vanilla CSS (zero external UI utility frameworks)

**Storage**: Local filesystem storage sandbox (no backend storage changes)

**Testing**: Cucumber.js (`@cucumber/cucumber`), Vitest, Chrome DevTools responsive emulation

**Target Platform**: Modern mobile and tablet browsers (Safari iOS 15+, Chrome Android, Firefox Mobile) across screen widths from 320px to 768px

**Project Type**: Web application (Axum backend service + React SPA frontend)

**Performance Goals**:
- 60 fps smooth touch scrolling on mobile lists
- Orientation change and breakpoint recalculation < 300ms
- Zero horizontal window scrollbar across all supported viewports
- 100% of interactive controls meet or exceed 44×44px touch bounding box

**Constraints**:
- Pure Vanilla CSS adhering to disciplined simplicity (YAGNI, Constitution Principle V)
- Backend API contracts remain completely unchanged
- Background scroll must be locked when modal dialogs are open

**Scale/Scope**: Supports directories with thousands of entries smoothly on mobile devices

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I: Security-First Filesystem Access & Sandbox Containment**: PASS. This feature introduces presentation and layout enhancements exclusively on the frontend. No backend file operations, sandbox boundaries, or access controls are altered.
- **Principle II: Rigorous Input & Path Validation**: PASS. Form input validations (search terms, folder paths, authentication passphrases) remain strictly enforced. Mobile input field enhancements (16px font-size to prevent auto-zoom, touch-accessible clear triggers) do not weaken sanitization.
- **Principle III: Architectural Separation of Concerns**: PASS. Clear decoupling is maintained: Rust backend handles HTTP/FS operations; React components manage UI state; Vanilla CSS manages layout, responsive breakpoints, and animations.
- **Principle IV: Small, Focused Modules & Idiomatic Rust**: PASS. Changes are confined to modular React components and organized CSS style sheets. Backend code remains unmodified.
- **Principle V: Disciplined Simplicity (YAGNI)**: PASS. Uses standard CSS media queries, CSS variables, and native browser touch events. No bloated CSS frameworks or external runtime dependencies are introduced.
- **Principle VI: Asynchronous I/O & Predictable File Mutations**: PASS. Uploads, downloads, and mutations continue utilizing established atomic backend primitives and non-blocking asynchronous streaming.

## Project Structure

### Documentation (this feature)

```text
specs/005-mobile-responsive-ui/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md  # Specification quality checklist
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── layout-breakpoints.md
│   └── component-contracts.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
frontend/
├── index.html                               # Enhanced viewport meta & application title
├── src/
│   ├── styles/
│   │   ├── global.css                       # Root overflow prevention, touch token definitions, safe area insets
│   │   └── file-manager.css                 # Responsive media queries, stacked file rows, bottom sheets, modal cards
│   ├── components/
│   │   ├── Breadcrumbs.tsx                  # Horizontal touch momentum scrolling container
│   │   ├── FileList.tsx                     # Mobile sort selector bar & column header toggling
│   │   ├── FileRow.tsx                      # Stacked two-tier layout, ellipsis truncation, >=44px touch targets
│   │   ├── SearchBar.tsx                    # 16px input font size, flex-wrap controls, touch clear button
│   │   ├── UploadButton.tsx                 # Responsive label/icon scaling on mobile header
│   │   ├── UploadProgressDrawer.tsx         # Bottom-sheet docking layout with touch collapse/expand
│   │   ├── VideoPlayerModal.tsx             # 100dvh scaling, enlarged touch scrubbers, 48px control buttons
│   │   ├── ConfirmDeleteDialog.tsx          # Responsive card layout, safe margins, touch-sized action buttons
│   │   └── CopyDialog.tsx                   # Max-height 85dvh, internal touch scrolling, pinned bottom actions
│   └── pages/
│       └── FileManagerPage.tsx              # Modal background scroll-lock management
features/
├── mobile-touch-browsing.feature            # BDD acceptance test suite (touch navigation)
├── mobile-search-and-sorting.feature        # BDD acceptance test suite (search & sorting)
├── mobile-modals-and-upload-drawer.feature  # BDD acceptance test suite (modals & drawer)
└── step_definitions/
    └── steps.js                             # Cucumber.js step definition stubs
```

**Structure Decision**: Enhances frontend React components and style sheets within `frontend/src/` with zero backend footprint.

## Complexity Tracking

*No violations. All Constitution checks passed.*
