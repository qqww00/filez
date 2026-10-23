# Implementation Plan: File Search, Sorting, and Multi-File Upload

**Branch**: `004-search-sort-upload` | **Date**: 2026-10-24 | **Spec**: [spec.md](file:///home/dev/src/filez/specs/004-search-sort-upload/spec.md)

**Input**: Feature specification from `specs/004-search-sort-upload/spec.md`

## Summary

Implement interactive file and folder search, multi-attribute sorting, and drag-and-drop multi-file upload capabilities for the Filez file manager.
The technical approach combines:
1. **Instant Client-Side Filtering**: Real-time substring filtering of the current folder's listing as keywords are typed, supplemented by a backend recursive subtree search endpoint (`GET /api/files/search`) for deep discovery across nested directories.
2. **Deterministic Multi-Attribute Sorting**: Client-side sorting by Name, Size, Modified Date, and Type, with folders grouped at the top and deterministic secondary tie-breaking by name.
3. **Multi-File Ingestion & Drag-and-Drop**: Visual drop zone overlay supporting drag-and-drop of multiple files directly into the active folder, enqueuing them smoothly into the existing non-blocking upload manager queue.

## Technical Context

**Language/Version**: TypeScript 5.2+ (Frontend), Rust 1.75+ (Backend)

**Primary Dependencies**: React 18, Vite, Vanilla CSS, Axum 0.8, Tokio 1.0

**Storage**: Local filesystem storage sandbox with atomic `.filez_tmp_` staging files

**Testing**: Cargo test (`cargo test`), Vitest (`npm test`), React Testing Library, Vite build verification

**Target Platform**: Modern desktop and mobile browsers (screen widths 360px+)

**Project Type**: Web application (Axum backend service + React SPA frontend)

**Performance Goals**:
- Live in-folder search filtering response time < 100ms
- Sorting of directories with up to 1,000 entries < 100ms
- Recursive subtree search across 5,000 files < 1.5 seconds
- Batch multi-file drag-and-drop queue ingestion < 200ms

**Constraints**:
- Zero external search daemon or indexing dependencies (standard async filesystem traversal)
- Zero external drag-and-drop npm packages (pure HTML5 Drag and Drop API)
- Strict sandbox containment: searches and path operations must never escape configured storage root

**Scale/Scope**: Supports directories with thousands of files and batches of 50+ files per upload

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I: Security-First Filesystem Access & Sandbox Containment**: PASS. Backend recursive search strictly resolves base directories via `PathSandbox::resolve(path)` and ensures all traversed entries remain within `sandbox.canonical_root()`. External symlinks escaping the sandbox are filtered out.
- **Principle II: Rigorous Input & Path Validation**: PASS. Search query strings are validated (empty/whitespace rejected, control characters prohibited). Path parameters are sanitized.
- **Principle III: Architectural Separation of Concerns**: PASS. Handlers in `handlers/files.rs` handle HTTP parsing and response serialization; filesystem traversal logic resides in `fs/operations.rs`; frontend presentation and hooks are strictly decoupled.
- **Principle IV: Small, Focused Modules & Idiomatic Rust**: PASS. Search operations are isolated in cohesive functions returning `Result<T, AppError>` without runtime `unwrap()`.
- **Principle V: Disciplined Simplicity (YAGNI)**: PASS. No heavyweight indexing databases or external libraries. Standard Rust directory iteration and standard browser APIs are utilized.
- **Principle VI: Asynchronous I/O & Predictable File Mutations**: PASS. Search is read-only. File uploads leverage existing atomic `.filez_tmp_` staging and rename operations.

## Project Structure

### Documentation (this feature)

```text
specs/004-search-sort-upload/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── search-api.md
│   ├── sort-and-filter.md
│   └── drag-drop-upload.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── fs/
│   └── operations.rs                 # Add search_directory() with recursive subtree traversal & sandbox bounds
└── handlers/
    └── files.rs                      # Add search_files HTTP handler for GET /api/files/search

frontend/src/
├── api/
│   └── files.ts                      # Add searchFiles() API client call
├── types/
│   └── files.ts                      # Add SearchResultEntry, SearchResultListing, SortConfig interfaces
├── hooks/
│   └── useFileSortAndFilter.ts       # Hook managing search filter, sort field, direction, and persistence
├── components/
│   ├── SearchBar.tsx                 # Search input with live filter, clear button, and recursive toggle
│   ├── SortControls.tsx              # Interactive sort headers and sort selector
│   ├── DropZoneOverlay.tsx           # Drag-and-drop backdrop and drop target container
│   ├── FileList.tsx                  # Updated to render sortable column headers and search results view
│   └── FileRow.tsx                   # Support displaying relative folder path when rendering search results
└── pages/
    └── FileManagerPage.tsx           # Integrate SearchBar, useFileSortAndFilter, and DropZoneOverlay
```

**Structure Decision**: Web application layout enhancing existing `src/fs/operations.rs` and `src/handlers/files.rs` with the search endpoint, and modular React components and hooks in `frontend/src/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *None*    | N/A        | N/A                                 |
