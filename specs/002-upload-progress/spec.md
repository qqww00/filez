# Feature Specification: Intuitive File Upload Progress

**Feature Branch**: `002-upload-progress`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "Ketika upload tambahkan progress barnya, dan buatkan secara intuitif"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Real-Time Single File Upload Progress (Priority: P1)

As a user uploading a file to the storage system, I want to see an immediate, smooth, and accurate visual progress indicator showing the transfer percentage and byte volume, so that I have clear feedback that the upload is actively progressing and can estimate when it will complete.

**Why this priority**: Without real-time progress feedback, users are left uncertain whether a large file upload is progressing or frozen, leading to accidental duplicate uploads or premature page reloads. This is the fundamental building block of the upload experience.

**Independent Test**: Can be fully tested by selecting a single large file (e.g., 50 MB+) to upload, observing the visual progress bar fill continuously from 0% to 100% alongside uploaded byte counts, and verifying completion upon success.

**Acceptance Scenarios**:

1. **Given** a user is logged into the file manager in any directory, **When** they select and confirm a file to upload, **Then** an active upload indicator immediately appears showing the file name, an animated progress bar at 0%, and byte counters (`0 B / Total B`).
2. **Given** an ongoing file upload, **When** bytes are transferred over the network, **Then** the progress bar advances smoothly and the displayed metrics (percentage, uploaded volume, transfer speed, and estimated time remaining) update continuously.
3. **Given** an upload reaches 100% data transmission and server confirmation, **Then** the indicator transitions to a clear success state and the uploaded file automatically appears in the current directory listing.

---

### User Story 2 - Multi-File Queue with Individual and Aggregate Progress (Priority: P2)

As a user uploading multiple files simultaneously or in sequence, I want to see both an aggregate overall progress bar and an itemized breakdown for each file in the upload queue, so that I can monitor the collective transfer as well as the status of specific individual files.

**Why this priority**: Users frequently upload batches of files (such as photo collections or document packages). An aggregate progress bar gives high-level confidence, while individual indicators let users know which files are queued, currently transferring, or already finished.

**Independent Test**: Can be fully tested by selecting 3 or more files for upload at once, observing the overall batch progress increment as well as individual status badges (queued, uploading, complete), and verifying all items properly reflect completion.

**Acceptance Scenarios**:

1. **Given** a user selects multiple files (e.g., 5 files) for upload, **When** the upload process initiates, **Then** the interface displays an aggregate summary ("Uploading file X of 5", total batch percentage, aggregate bytes transferred) and a list of all queued items.
2. **Given** multiple files in the upload queue, **When** one file finishes transferring, **Then** that file's indicator marks complete, the next queued file immediately begins transferring, and the overall batch progress increments accurately.
3. **Given** a user is viewing a batch upload, **When** they toggle between collapsed summary view and expanded itemized view, **Then** the interface seamlessly expands or collapses the list without disrupting active transfers.

---

### User Story 3 - Non-Blocking Floating Progress Drawer with Cancellation and Error Handling (Priority: P3)

As a user managing files, I want the upload progress display to be an unobtrusive, non-blocking component that allows me to continue browsing or managing other files, and allows me to cancel ongoing transfers or retry failed files, so that my workflow is never locked and unexpected network issues can be recovered from easily.

**Why this priority**: Traditional modal dialogs trap the user and prevent other interactions. A non-blocking, accessible panel with cancel capabilities respects user autonomy and gracefully handles partial failures in multi-file batches.

**Independent Test**: Can be fully tested by starting an upload, navigating folders within the application while the upload continues in the background, cancelling an active upload, and observing appropriate cancellation cleanup and status indicators.

**Acceptance Scenarios**:

1. **Given** an upload is in progress, **When** the user navigates into subdirectories or views different folder contents, **Then** the upload progress indicator remains visible and active in a persistent, non-blocking drawer/tray without resetting the upload.
2. **Given** an active single or batch upload, **When** the user clicks the "Cancel" action for an uploading file, **Then** the transfer is immediately terminated, the file status updates to "Cancelled", and no partial file corrupts the destination directory.
3. **Given** one file in a multi-file batch fails due to network disconnection or server error, **When** the failure occurs, **Then** that specific file displays an intuitive error indicator with a descriptive reason, while the remaining queued files continue processing.
4. **Given** an upload batch completes (with or without errors), **When** the user clicks "Dismiss" or "Clear", **Then** the progress drawer closes or removes finished items cleanly.

---

### Edge Cases

- **Zero-Byte Files**: When a user uploads an empty file (0 bytes), the system should immediately show 100% completion upon server acknowledgement without dividing by zero or hanging.
- **Large Multi-Gigabyte Files**: Files approaching the storage limit (e.g., several gigabytes) must correctly format byte sizes into gigabytes (e.g., "3.42 GB / 8.00 GB") and avoid integer overflow in progress or speed calculations.
- **Abrupt Network Disconnection**: If the network connection drops mid-transfer, the progress display must halt, flag a timeout/disconnection error after a reasonable threshold, and inform the user that the transfer failed.
- **Rapid Navigation / Tab Switching**: Navigating between folders or switching browser tabs while uploading must not cancel or corrupt active transfers.
- **Duplicate File Names in Batch**: If multiple files in the same batch or destination share the same name, the system must clearly report conflict or replace according to directory rules without freezing the progress bar.
- **User Attempts to Close Tab/Window During Upload**: If the user attempts to close or reload the browser tab while uploads are active, the system should prompt for confirmation to prevent accidental data loss.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display a visual progress bar immediately whenever a file upload is initiated.
- **FR-002**: The progress bar MUST reflect the real-time transmission progress from 0% to 100% based on actual bytes transferred to the server.
- **FR-003**: The upload interface MUST present human-readable metrics alongside the progress bar, including:
  - Percentage completed (e.g., `45%`)
  - Transferred bytes and total bytes formatted in appropriate units (`B`, `KB`, `MB`, `GB`)
  - Current transfer rate / speed (e.g., `12.5 MB/s`)
  - Estimated time remaining (ETA, e.g., `45s remaining` or `2m 10s remaining`)
- **FR-004**: The system MUST support multi-file uploads with an aggregate progress summary (overall percentage, count of completed vs total files, total volume) and an expandable list of individual file statuses.
- **FR-005**: Each individual file in an upload queue MUST clearly indicate its current status: `Queued`, `Uploading`, `Completed`, `Failed`, or `Cancelled`.
- **FR-006**: The upload progress indicator MUST be non-blocking (e.g., anchored tray, floating panel, or persistent bottom drawer) so users can browse directory contents, search, and navigate while uploads proceed.
- **FR-007**: Users MUST be able to cancel an active upload at any time via a dedicated cancel control for both individual files and the entire batch.
- **FR-008**: Upon cancelling an upload, the system MUST immediately abort data transmission, prevent incomplete file persistence, and visually mark the task as cancelled.
- **FR-009**: If an upload fails due to network or server issues, the interface MUST present an intuitive error state detailing the failure reason without disrupting other items in the queue.
- **FR-010**: Upon successful completion of an upload, the target folder view MUST refresh or update to reflect the newly uploaded files.
- **FR-011**: The progress interface MUST be responsive and accessible across both desktop and mobile touchscreens (supporting minimum 360px viewport widths and minimum 44px touch targets).
- **FR-012**: If active uploads are underway and the user triggers a browser page unload or navigation away from the application, the system MUST request confirmation to protect ongoing transfers from interruption.

### Key Entities

- **Upload Item**: Represents an individual file undergoing transfer. Contains file name, file size, transferred bytes, transfer percentage, transfer speed, estimated time remaining, current status (`Queued`, `Uploading`, `Completed`, `Failed`, `Cancelled`), and optional error message.
- **Upload Batch**: Represents a collection of one or more Upload Items initiated together. Contains batch identifier, destination directory path, total items count, completed items count, aggregate bytes transferred, aggregate total bytes, aggregate percentage, and overall status (`Active`, `Paused`, `Completed`, `Cancelled`, `Partially Failed`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Visual progress feedback appears within 200 milliseconds of user initiating an upload.
- **SC-002**: Progress percentage, transferred volume, and speed metrics update at least 2 times per second during active transmission.
- **SC-003**: 100% of tested users can identify current upload status, elapsed progress, and time remaining without needing external documentation.
- **SC-004**: Users can cancel an active upload in a single interaction, halting data transmission within 500 milliseconds.
- **SC-005**: 100% of multi-file upload batches accurately display individual per-file statuses and total batch progress without UI freezes or desynchronization.
- **SC-006**: The progress UI maintains full readability and touch interactivity on mobile viewports down to 360px width.

## Assumptions

- Users upload files using modern web browsers that support standard client-side progress events.
- Uploads are sent to the local file manager storage service where file size limits (configured up to 10 GB) are enforced.
- Files in a multi-file batch are processed sequentially or concurrently based on network ergonomics, while the UI aggregates overall progress seamlessly.
- An upload that is cancelled before completion will not leave orphaned partial files in the final target directory.
