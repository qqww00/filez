# Implementation Plan: Intuitive File Upload Progress

**Branch**: `002-upload-progress` | **Date**: 2026-10-23 | **Spec**: [spec.md](file:///home/dev/src/filez/specs/002-upload-progress/spec.md)

**Input**: Feature specification from `specs/002-upload-progress/spec.md`

## Summary

Implement an intuitive, real-time file upload progress feedback system for the Filez web application. The technical approach leverages native browser `XMLHttpRequest` upload progress events to stream file data while capturing byte-accurate progress, smoothed transfer speed (Exponential Moving Average), and estimated time remaining (ETA). The UI is anchored as a non-blocking floating drawer at the bottom-right of the viewport (responsive bottom sheet on mobile), supporting multi-file queue visibility, individual and batch cancellation, and persistent operation across directory navigation.

## Technical Context

**Language/Version**: TypeScript 5.2+ (Frontend), Rust 1.75+ (Backend)

**Primary Dependencies**: React 18, Vite, Vanilla CSS / CSS Modules, Axum 0.7, Tokio 1.0

**Storage**: Local filesystem storage sandbox with atomic `.part` staging files

**Testing**: Vitest (`npm test`), React Testing Library, Cargo test (`cargo test`)

**Target Platform**: Modern desktop and mobile browsers (screen width 360px+)

**Project Type**: Web application (Axum backend service + React SPA frontend)

**Performance Goals**:
- Progress UI updates emitted every 250ms–500ms
- Immediate visual indicator display (< 200ms)
- Upload abort / cancellation execution within 500ms

**Constraints**:
- Zero additional heavy third-party upload libraries (use native XHR streaming)
- Seamless operation while navigating folders in the client SPA
- Multi-gigabyte file support up to configured server limit (10 GB)

**Scale/Scope**: Supports single files up to multi-file batches of 50+ items

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I: Security-First Filesystem Access & Sandbox Containment**: PASS. Upload requests continue targeting validated paths within the configured root directory without altering server-side boundary checks.
- **Principle II: Rigorous Input & Path Validation**: PASS. Target paths and file names are validated before and during submission; invalid characters and traversal sequences are rejected.
- **Principle III: Architectural Separation of Concerns**: PASS. Clear layer boundaries: network streaming isolated in `api/files.ts`, queue lifecycle state in `hooks/useUploadManager.ts`, and presentation in `components/UploadProgressDrawer.tsx`.
- **Principle IV: Small, Focused Modules & Idiomatic Rust**: PASS. Changes are modular and strictly typed with TypeScript interfaces.
- **Principle V: Disciplined Simplicity (YAGNI)**: PASS. Uses native browser `XMLHttpRequest` with `onprogress` instead of introducing heavy external frameworks or WebSockets.
- **Principle VI: Asynchronous I/O & Predictable File Mutations**: PASS. Aborted transfers drop the TCP connection immediately, triggering backend `.part` cleanup to ensure no partial files persist.

## Project Structure

### Documentation (this feature)

```text
specs/002-upload-progress/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── upload-api.md
│   └── upload-manager.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── api/
│   │   └── files.ts                  # Enhanced with uploadSingleFileWithProgress (XHR + ProgressEvent)
│   ├── types/
│   │   ├── files.ts                  # Shared directory and file types
│   │   └── upload.ts                 # UploadItem, UploadBatch, UploadProgressEvent interfaces
│   ├── hooks/
│   │   ├── useFiles.ts               # Directory navigation and auth state
│   │   └── useUploadManager.ts       # Queue state machine, EMA speed/ETA calculations, & abort logic
│   ├── components/
│   │   ├── UploadButton.tsx          # Triggers file selection and enqueues to useUploadManager
│   │   ├── UploadProgressDrawer.tsx  # Floating bottom drawer / tray with aggregate stats & collapse/expand
│   │   └── UploadProgressItem.tsx    # Individual file row with progress bar & cancel button
│   └── pages/
│       └── FileManagerPage.tsx       # Renders UploadProgressDrawer and connects upload completion to refreshFiles
└── tests/
    └── upload-progress.test.ts       # Unit tests for progress calculations and XHR abort handlers
```

**Structure Decision**: Web application layout utilizing `frontend/src` for client enhancements with zero unnecessary server API modifications.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *None*    | N/A        | N/A                                 |
