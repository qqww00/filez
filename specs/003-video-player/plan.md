# Implementation Plan: In-App Video Media Player with Android Mobile Support

**Branch**: `003-video-player` | **Date**: 2026-10-23 | **Spec**: [spec.md](file:///home/dev/src/filez/specs/003-video-player/spec.md)

**Input**: Feature specification from `specs/003-video-player/spec.md`

## Summary

Implement an in-app video media player with specialized Android mobile view support. The backend exposes an authenticated streaming content endpoint (`GET /api/files/content?path=...`) supporting RFC 7233 HTTP byte-range requests (`206 Partial Content`) via `tower-http`'s async `ServeFile` service within the existing `PathSandbox` boundary. The frontend provides a responsive modal video player with custom touch controls, auto-hiding controls (3s idle timeout), 48px mobile touch targets, timeline scrubbing, variable playback rates (`0.5x`–`2.0x`), desktop keyboard shortcuts, and direct download fallback.

## Technical Context

**Language/Version**: Rust 1.75+ (Backend), TypeScript 5.2+ (Frontend)

**Primary Dependencies**:
- Backend: Axum 0.8, Tokio 1.0, Tower-HTTP 0.6 (`features = ["fs"]`)
- Frontend: React 18, Vite, Vanilla CSS

**Storage**: Local sandbox filesystem via `PathSandbox`

**Testing**: Cargo test (`cargo test`), Vitest (`npm test`), Frontend build validation (`npm run build`)

**Target Platform**: Modern desktop browsers & Android mobile browsers (Chrome on Android, Samsung Internet, Firefox Mobile, 360px+ viewport)

**Project Type**: Web application (Axum backend service + React SPA frontend)

**Performance Goals**:
- Video playback initiation < 800ms
- Range-based seek response < 1.2s on files up to 10 GB
- Touch interaction response < 100ms
- Zero server memory buffering (direct async kernel streaming)

**Constraints**:
- Must enforce sandbox containment on all streaming requests
- Must support byte-range requests for seamless scrubbing
- Mobile touch targets must meet the 48x48px accessibility minimum

**Scale/Scope**: Supports streaming files from small preview clips up to multi-gigabyte 10 GB videos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I: Security-First Filesystem Access & Sandbox Containment**: PASS. The file content streaming endpoint rigorously resolves and validates all paths through `state.sandbox.resolve(&rel_path)` before serving, ensuring no traversal outside the sandbox root.
- **Principle II: Rigorous Input & Path Validation**: PASS. Rejects null bytes, relative traversal tokens (`..`), and absolute paths.
- **Principle III: Architectural Separation of Concerns**: PASS. Handlers parse query params and check authorization; `PathSandbox` enforces boundaries; `ServeFile` handles network byte-range streaming; React components handle presentation.
- **Principle IV: Small, Focused Modules & Idiomatic Rust**: PASS. Idiomatic Axum handler with typed errors and clean pattern matching.
- **Principle V: Disciplined Simplicity (YAGNI)**: PASS. Reuses `tower-http`'s built-in `ServeFile` service and native browser HTML5 `<video>` APIs without external video player dependencies or heavy transcoders.
- **Principle VI: Asynchronous I/O & Predictable File Mutations**: PASS. Non-blocking asynchronous file streaming directly from disk via Tokio.

## Project Structure

### Documentation (this feature)

```text
specs/003-video-player/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── content-api.md
│   └── video-player.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── handlers/
│   ├── mod.rs                # Registers GET /api/files/content in protected_files router
│   └── files.rs              # Implements stream_file_content handler with PathSandbox resolution & ServeFile
└── fs/
    └── operations.rs         # Path resolution and file verification

frontend/
├── src/
│   ├── utils/
│   │   └── media.ts          # isVideoFile helper, video extension definitions, and formatting
│   ├── hooks/
│   │   └── useVideoPlayer.ts # Custom playback state machine, auto-hide timer, range seeking, and speed controls
│   ├── components/
│   │   ├── FileRow.tsx       # Distinguishes video files and handles video click interaction
│   │   └── VideoPlayerModal.tsx # Fullscreen/overlay video player with touch-friendly 48px controls
│   ├── styles/
│   │   └── file-manager.css  # Mobile and desktop styles for video player, auto-hiding controls, and touch scrubber
│   └── pages/
│       └── FileManagerPage.tsx # Mounts VideoPlayerModal and handles active video state
└── tests/
    └── api_integration.rs    # Backend integration tests for GET /api/files/content (200 OK & 206 Partial Content)
```

**Structure Decision**: Standard web application layout with Axum backend additions for streaming range support and React component extensions for the video player overlay.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *None*    | N/A        | N/A                                 |
