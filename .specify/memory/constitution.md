<!--
Sync Impact Report:
- Version change: Unratified Template -> 1.0.0
- Modified principles:
  - [PRINCIPLE_1_NAME] -> I. Security-First Filesystem Access & Sandbox Containment
  - [PRINCIPLE_2_NAME] -> II. Rigorous Input & Path Validation
  - [PRINCIPLE_3_NAME] -> III. Architectural Separation of Concerns
  - [PRINCIPLE_4_NAME] -> IV. Small, Focused Modules & Idiomatic Rust
  - [PRINCIPLE_5_NAME] -> V. Disciplined Simplicity (YAGNI)
  - Added: VI. Asynchronous I/O & Predictable File Mutations
- Added sections:
  - Security & Operational Boundaries (replaces [SECTION_2_NAME])
  - Quality Gates & Verification (replaces [SECTION_3_NAME])
- Removed sections:
  - None
- Follow-up TODOs:
  - None
-->

# Filez Constitution

## Core Principles

### I. Security-First Filesystem Access & Sandbox Containment
- Filesystem access MUST be fail-closed and strictly constrained to the configured root directory.
- Path traversal outside the root directory (via `..`, symlinks, relative aliases, or absolute paths) MUST be actively prevented and rejected before any file operations occur.
- Canonical path resolution and boundary checks MUST occur on all paths prior to file access.
- *Rationale*: A local network file manager exposes direct disk access over the network. Absolute containment within the designated root directory is critical to protecting host system integrity.

### II. Rigorous Input & Path Validation
- All user-controlled paths, filenames, headers, and query parameters MUST be rigorously validated and sanitized before processing.
- Prohibit path separators within single-name inputs, null bytes (`\0`), control characters, and OS-reserved filenames.
- Unsupported or malformed inputs MUST yield deterministic client error responses (4xx) without exposing internal filesystem details or stack traces.
- *Rationale*: Comprehensive validation at the boundary eliminates entire classes of injection, traversal, and file-corruption attacks.

### III. Architectural Separation of Concerns
- The codebase MUST maintain strict separation across three core layers:
  1. **HTTP Handlers**: Parse requests, extract validated parameters, map domain results to HTTP status codes/responses, and handle network protocols.
  2. **File Operations**: Encapsulate pure filesystem logic, directory traversal, streaming, and mutation semantics independent of HTTP frameworks.
  3. **Configuration**: Centrally load, validate, and provide immutable application configuration (root path, bind addresses, permissions, size limits).
- Layers MUST communicate via explicit contracts and typed boundaries; HTTP handlers MUST NOT directly invoke unchecked raw OS file primitives.
- *Rationale*: Clean separation enables independent testing, isolates security-critical filesystem logic from web framework churn, and simplifies security auditing.

### IV. Small, Focused Modules & Idiomatic Rust
- Modules MUST be small, cohesive, and have a single, explicit responsibility.
- Code MUST follow idiomatic Rust best practices: enforce `clippy` and `rustfmt`, leverage the type system to enforce invariants, and use explicit error types with standard `Result<T, E>` patterns.
- Avoid `unwrap()` and `expect()` in runtime execution paths; recoverable errors MUST be handled gracefully.
- *Rationale*: Idiomatic Rust prevents whole classes of memory and concurrency bugs, while small, cohesive modules improve maintainability, cognitive ergonomics, and readability.

### V. Disciplined Simplicity (YAGNI)
- Keep implementations direct and simple; avoid unnecessary abstractions, speculative generics, over-engineered plugin architectures, or premature optimizations.
- Introduce traits and abstractions only when multiple concrete implementations or necessary test mocking genuinely require them.
- *Rationale*: Unneeded complexity obscures security-critical logic and increases the attack surface. Simplicity is a prerequisite for verifiability.

### VI. Asynchronous I/O & Predictable File Mutations
- Asynchronous I/O MUST be utilized for HTTP networking and file operations where non-blocking concurrency ensures responsiveness across concurrent local network clients.
- All file mutations (create, overwrite, move, rename, delete) MUST have clear, deterministic behavior. Where possible, file writes and updates MUST be atomic (e.g., write-to-temp-and-rename) to prevent partial corruption during power loss or abrupt client disconnects.
- *Rationale*: Predictable mutation semantics protect user data integrity during concurrent access or unexpected interruptions on local networks.

## Security & Operational Boundaries

### Local Network Access & Exposure Limits
- The service is designed for trusted local network environments; default network binding MUST be explicit (e.g., `127.0.0.1` or explicit LAN interface with clear warnings).
- Plaintext HTTP local access, cross-origin access policies (CORS), and authentication/authorization assumptions MUST be clearly documented alongside known security trade-offs.
- Size limits on file uploads and request payloads MUST be enforced to prevent denial-of-service (DoS) via resource exhaustion.

### Operational Transparency & Documentation
- All configuration options, environment variables, default paths, and permissions MUST be comprehensively documented.
- Security boundaries, sandbox guarantees, and explicit limitations (e.g., behavior regarding external symlinks, read-only vs read-write modes) MUST be published in user-facing documentation.

## Quality Gates & Verification

### Test-Driven Boundary Verification
- Code changes MUST be accompanied by comprehensive automated tests covering:
  1. **Success Cases**: Standard CRUD operations, directory listings, streaming downloads, and uploads.
  2. **Failure Cases**: Non-existent paths, permission errors, disk-full conditions, and invalid payloads.
  3. **Security Boundaries**: Path traversal attempts (`../`, URL-encoded paths, double-dot tricks, Unicode normalization quirks, symlink escapes).
- Tests for security-critical path validation MUST be executed against both positive and negative fixtures.

### Review & Enforcement Checklist
- Every pull request and change MUST pass `cargo fmt --check`, `cargo clippy -- -D warnings`, and the complete test suite.
- Changes affecting path resolution, permissions, or file mutations require dedicated security review and boundary verification tests before merging.

## Governance

This Constitution is the supreme design authority for the Filez project. All architectural decisions, pull requests, and implementations MUST comply with these principles.

### Amendment Procedure
1. Any proposed amendment to this constitution MUST be documented with a clear problem statement, proposed changes, and impact analysis.
2. Changes to Core Principles require documented consensus and a comprehensive review of existing code to ensure continued alignment.
3. Amendments affecting security constraints or boundary definitions require verification against existing test suites and explicit justification.

### Versioning Policy
- **MAJOR** version bumps (e.g., 1.0.0 → 2.0.0) indicate backward-incompatible governance changes, removal or fundamental redefinition of core principles, or major shifts in project scope.
- **MINOR** version bumps (e.g., 1.0.0 → 1.1.0) indicate the addition of new principles, sections, or material expansion of operational guidance.
- **PATCH** version bumps (e.g., 1.0.0 → 1.0.1) indicate wording refinements, formatting adjustments, or non-semantic clarifications.

### Compliance & Review
- Code reviews MUST explicitly verify adherence to these principles prior to integration.
- Any deviation or temporary exemption MUST be explicitly documented as a technical debt issue with an associated remediation plan.

**Version**: 1.0.0 | **Ratified**: 2026-10-23 | **Last Amended**: 2026-10-23
