# Feature Specification: Local Network File Manager

**Feature Branch**: `001-local-file-manager`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "Build a local network file manager that runs on the user's laptop and allows the user to manage files through a web browser on a phone. The laptop is the file server. All uploaded files must be stored directly on the laptop's local filesystem, not in cloud storage. Target users: A single laptop owner; a phone or other device connected to the same Wi-Fi network. Core requirements: Browse files and directories under a configurable root directory; navigate into directories and return to parent directories; upload one or more files from a phone or desktop browser; copy files to another permitted directory; delete files after explicit user confirmation; display filenames, file sizes, and modification times; provide a responsive interface for mobile and desktop; allow access over the local network using the laptop's IP address and a configurable HTTP port; persist uploaded files on the laptop after the server is restarted. Security and reliability: restrict every filesystem operation to the configured root directory; prevent path traversal and unsafe symlink handling; require authentication before allowing file operations; enforce configurable upload-size limits; reject invalid filenames and unsafe destination paths; prevent accidental overwriting unless explicitly supported; return useful errors without exposing sensitive server details; do not expose the application directly to the public internet. Acceptance criteria: open from phone on same Wi-Fi, uploaded photo appears in laptop directory, copied file has expected contents, deleted file no longer appears, files outside root cannot be accessed or modified, automated tests for core filesystem operations."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authenticate and Browse Files & Directories (Priority: P1)

As a laptop owner using a mobile phone on the same Wi-Fi network, I want to authenticate into the file manager web interface and browse files and subdirectories located within my designated laptop folder, so that I can inspect my files, view file metadata, and navigate my directory hierarchy from my phone.

**Why this priority**: Browsing files and authenticating is the foundational capability of the system. Without viewing directory contents and navigating between folders, no other file operations can be performed.

**Independent Test**: Can be tested by starting the server with a test directory containing files and subfolders, connecting a phone or browser using the laptop's local network IP and port, submitting valid credentials, and verifying that the directory listing displays all items with accurate names, sizes, and timestamps, and allows navigating into subfolders and returning to parent folders.

**Acceptance Scenarios**:

1. **Given** the file manager server is running on the laptop and bound to the local network, **When** a user navigates to the server's local network address from a phone browser, **Then** an authentication screen is presented before any directory contents or files are visible.
2. **Given** an unauthenticated user on the login screen, **When** the user provides valid authentication credentials, **Then** the user is granted access, redirected to the root directory listing, and a persistent session is established.
3. **Given** an authenticated user viewing a directory, **When** the directory contents load, **Then** each item displays its filename, item type (file or directory), human-readable file size, and last modified timestamp in a mobile-responsive layout.
4. **Given** an authenticated user viewing a directory containing subdirectories, **When** the user taps or clicks on a subdirectory, **Then** the view transitions into that subdirectory and displays its contents and updated breadcrumb navigation.
5. **Given** an authenticated user viewing a nested subdirectory, **When** the user taps the parent directory link or breadcrumb, **Then** the view returns to the parent directory.
6. **Given** an authenticated user viewing the top-level configured root directory, **When** examining navigation controls, **Then** no option to navigate above the root directory is available.

---

### User Story 2 - Upload Files from Phone or Desktop (Priority: P1)

As a laptop owner, I want to select and upload photos or documents from my phone or desktop browser directly to the currently viewed directory on my laptop, so that my files are stored securely on my laptop disk and persist across server restarts without relying on third-party cloud storage.

**Why this priority**: File upload is the primary data ingestion path and core value proposition (transferring phone photos and files directly to the laptop over local Wi-Fi).

**Independent Test**: Can be tested by navigating to a directory in the web interface, selecting one or more files from the device, initiating upload, and verifying that the files appear in the directory listing, are saved directly to the laptop's physical disk with matching contents and sizes, and remain available after restarting the server.

**Acceptance Scenarios**:

1. **Given** an authenticated user in a directory, **When** the user chooses the upload action and selects one or multiple files from their device, **Then** the selected files are uploaded to the active directory, displaying upload progress feedback.
2. **Given** one or more files have completed uploading, **When** the upload finishes, **Then** the directory view refreshes to show the newly added files with their correct names, sizes, and modification dates.
3. **Given** files uploaded and saved to the laptop filesystem, **When** the server process is restarted and the user reconnects, **Then** all previously uploaded files remain intact, accessible, and listed in their respective directories.
4. **Given** an authenticated user attempts to upload a file exceeding the configured maximum file size limit, **When** the upload is initiated, **Then** the upload is rejected with a clear error message indicating the size limit violation, and no partial or corrupt file is retained on the laptop.

---

### User Story 3 - Delete Files with Explicit Confirmation (Priority: P2)

As a laptop owner, I want to delete unwanted files from my laptop through the web interface after an explicit confirmation prompt, so that I can free up disk space without risking accidental file loss.

**Why this priority**: Deletion allows users to manage and curate their stored files, but requires strict safeguards to avoid irreversible accidental loss on mobile touchscreens.

**Independent Test**: Can be tested by selecting a file to delete, observing that an explicit confirmation dialog appears, confirming deletion, and verifying that the file is permanently removed from the laptop filesystem and immediately disappears from the directory listing.

**Acceptance Scenarios**:

1. **Given** an authenticated user viewing a file in the directory list, **When** the user triggers the delete action, **Then** a confirmation prompt is displayed requesting explicit confirmation before any deletion occurs.
2. **Given** a delete confirmation prompt is displayed, **When** the user cancels or dismisses the prompt, **Then** no changes are made to the filesystem and the file remains intact.
3. **Given** a delete confirmation prompt is displayed, **When** the user confirms the action, **Then** the file is deleted from the laptop filesystem, the directory view is updated, and a success confirmation is shown.
4. **Given** a file deletion fails due to an operating system error (e.g., read-only permissions), **When** the operation is attempted, **Then** a clear error message is shown and the directory listing reflects the actual filesystem state.

---

### User Story 4 - Copy Files Between Permitted Directories (Priority: P2)

As a laptop owner, I want to copy a file from its current directory to another destination directory within the managed root folder, so that I can organize my files across folders without modifying the original file.

**Why this priority**: Copying provides essential file organization capabilities while being safer than moving or overwriting operations for an MVP.

**Independent Test**: Can be tested by selecting a file, choosing a target directory within the managed root, initiating copy, and verifying that both the source and destination files exist on disk with identical contents and independent metadata.

**Acceptance Scenarios**:

1. **Given** an authenticated user selecting an existing file, **When** the user chooses the copy action, **Then** the user can select an existing destination directory within the managed root hierarchy.
2. **Given** a valid destination directory where the file name does not already exist, **When** the user initiates the copy, **Then** a duplicate of the file is created in the target directory with identical content.
3. **Given** an existing file in the target directory with the same name, **When** the user attempts to copy the file without explicit overwrite approval, **Then** the operation is prevented, and the user is alerted to the conflict to protect existing data.
4. **Given** a copy operation is requested targeting a path outside the configured root directory, **When** processed, **Then** the operation is rejected as an invalid destination.

---

### User Story 5 - Enforce Filesystem Isolation and Sandbox Boundaries (Priority: P1)

As a security-conscious laptop owner, I want every request and operation to be strictly confined to the configured root folder, so that malicious, malformed, or accidental requests can never access, read, modify, or delete sensitive system or personal files located elsewhere on my laptop.

**Why this priority**: Security is paramount when exposing a web service on a local network. Path traversal or directory escaping compromises the entire host operating system.

**Independent Test**: Can be tested by issuing requests containing relative path traversal tokens (e.g., `../`, `..%2F`), absolute paths, null bytes, and symlinks referencing paths outside the root directory, verifying that all such attempts fail with generic client errors and never return or alter data outside the root.

**Acceptance Scenarios**:

1. **Given** any request containing path traversal sequences (such as `../`, `..\\`, URL-encoded sequences, or double slashes), **When** evaluated by the server, **Then** the request is rejected immediately with a client error before any filesystem access occurs.
2. **Given** a symbolic link located within the root directory that points to a target outside the configured root directory, **When** a user attempts to access or navigate through the link, **Then** access is denied and the target contents are never exposed.
3. **Given** an unauthenticated request targeting any file, directory, or action, **When** received, **Then** access is denied with an authentication required error and no internal file paths or metadata are revealed.
4. **Given** an unexpected error occurs during a filesystem operation, **When** an error response is returned to the client, **Then** the error message provides a helpful description without exposing internal server paths, environment variables, or stack traces.

---

### Edge Cases

- **Upload Interruption**: When a client loses Wi-Fi connection or closes the browser while uploading a file, the server cleans up any partial temporary data and does not leave orphaned corrupted files in the target directory.
- **Upload Filename Collision**: When an uploaded file has the exact same name as an existing file in the destination folder, the system prevents silent overwriting, rejecting the upload or prompting for an alternative name.
- **Special Characters and Long Filenames**: Filenames with spaces, Unicode characters, emojis, or international scripts are properly handled and displayed, while filenames with null bytes (`\0`), control characters, or path separators are strictly rejected.
- **Nonexistent Directory Access**: If a user bookmarks or navigates to a directory that was deleted or renamed, the application gracefully handles the missing path and redirects the user to the nearest valid parent directory with an informative notice.
- **Root Directory Missing or Inaccessible**: If the configured root directory cannot be accessed upon startup (e.g., missing directory or insufficient permissions), the server reports a clear startup diagnostic error and refuses to start in an unsafe state.
- **Simultaneous Client Actions**: If two devices on the local network perform concurrent operations (e.g., one deletes a file while another is viewing or copying it), operations fail safely with appropriate error notifications rather than crashing or causing undefined behavior.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require a configurable root directory parameter at startup, defining the exclusive boundary for all file browsing and management.
- **FR-002**: System MUST allow configuration of the local network IP address to bind (or default to all local interfaces) and a configurable HTTP port.
- **FR-003**: System MUST provide an authentication mechanism requiring valid credentials before allowing any browsing, reading, uploading, copying, or deleting of files.
- **FR-004**: System MUST maintain authenticated sessions securely so that users do not need to re-authenticate on every navigation within the same session.
- **FR-005**: System MUST provide a responsive web interface optimized for both mobile phone touchscreens and desktop viewports.
- **FR-006**: System MUST list all files and subdirectories within the requested directory, displaying filename, item type, file size in human-readable units (e.g., KB, MB, GB), and last modified timestamp in the user's local timezone.
- **FR-007**: System MUST provide intuitive navigation controls enabling users to traverse into subdirectories and step back up to parent directories, bounded strictly by the configured root directory.
- **FR-008**: System MUST allow users to select and upload single or multiple files simultaneously from mobile and desktop browsers directly into the active directory.
- **FR-009**: System MUST store all uploaded files directly on the laptop's physical filesystem under the specified directory path.
- **FR-010**: System MUST persist all uploaded and modified files permanently on the laptop filesystem across server restarts.
- **FR-011**: System MUST enforce a configurable maximum upload file size, rejecting payloads that exceed this threshold before disk exhaustion occurs.
- **FR-012**: System MUST allow users to copy a selected file to another destination directory located within the configured root directory.
- **FR-013**: System MUST prevent accidental file overwriting during copy or upload operations by checking for existing files with the same name and requiring explicit user resolution.
- **FR-014**: System MUST allow users to delete a selected file only after presenting an explicit confirmation dialog and receiving affirmative user confirmation.
- **FR-015**: System MUST validate and sanitize all user-supplied paths and filenames, rejecting path traversal attempts (`..`, absolute paths, null bytes, forbidden control characters).
- **FR-016**: System MUST verify that all resolved target paths reside strictly inside the canonical path of the configured root directory, blocking any symlinks or alias paths pointing outside.
- **FR-017**: System MUST return clear, user-friendly error messages for client-correctable issues while concealing internal system paths, stack traces, and host environment details.
- **FR-018**: System MUST operate solely over the local area network (LAN) and not register, proxy, or expose endpoints to the public internet or external cloud services.

### Key Entities

- **Directory Entry**: Represents an individual item located within the managed filesystem hierarchy. Attributes include: display name, relative path from the managed root, item type (file or directory), size in bytes, and last modified date/time.
- **User Session**: Represents an active, authenticated client interaction. Attributes include: session identifier, authentication status, issue timestamp, and expiration time.
- **Server Configuration**: Represents runtime operational parameters defined by the laptop owner. Attributes include: root directory path, network bind address, network port number, maximum allowable upload file size, and access credential.
- **File Transfer Operation**: Represents an in-flight or completed file transfer (upload or copy). Attributes include: source identifier, destination relative path, total bytes transferred, status (in-progress, completed, failed), and error details if failed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user connecting from a mobile phone browser on the same Wi-Fi network can complete authentication and view the root directory listing in under 3 seconds under typical local Wi-Fi conditions.
- **SC-002**: An authenticated user can select and upload a 20 MB photo or video from a mobile phone, and the file is completely written and verified on the laptop disk within 10 seconds on a standard 802.11ac or newer Wi-Fi network.
- **SC-003**: 100% of path traversal injection attempts (including `../`, encoded characters, and external symlinks) are successfully blocked without exposing or modifying any file outside the configured root directory.
- **SC-004**: 100% of uploaded files remain accessible and verifiable with unchanged content hashes after stopping and restarting the server application.
- **SC-005**: 100% of file deletion attempts require explicit user confirmation before any disk deletion takes place, resulting in zero unintended single-click deletions.
- **SC-006**: The web interface dynamically adapts without horizontal layout breaks or truncated controls across screen widths ranging from 360px (mobile) to 1920px+ (desktop).

## Assumptions

- **Single-User MVP**: The application is intended for a single primary user (the laptop owner) accessing their files locally, rather than a multi-tenant or multi-user enterprise environment.
- **Authentication Default**: Authentication uses a pre-shared access credential (such as a password, PIN, or passphrase configured in the server configuration or generated upon startup) and an HTTP cookie/session token.
- **Network Environment**: The laptop and phone reside on the same trusted local Wi-Fi network subnet (IPv4/IPv6). No external internet connectivity or public DNS resolution is required.
- **Filesystem Permissions**: The server process runs with the operating system user permissions of the laptop owner and only has filesystem authority granted to that user account.
- **Conflict Handling**: When an uploaded or copied file conflicts with an existing file name, the default behavior for the MVP is to reject the operation with a clear conflict notice, asking the user to rename or choose a different target directory, preventing accidental data destruction.
- **Symlink Policy**: In accordance with the project constitution, symbolic links pointing outside the configured root directory are strictly prohibited and treated as invalid paths.
