# Feature Specification: File Search, Sorting, and Multi-File Upload

**Feature Branch**: `004-search-sort-upload`

**Created**: 2026-10-24

**Status**: Draft

**Input**: User description: "add this feature:\n1. add search file/folder\n2. add upload multi file\n3. add sorting file/folder"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Flexible File and Folder Sorting (Priority: P1)

As a user browsing files and folders in the file manager, I want to sort directory contents by Name, Size, Last Modified Date, and File Type in both ascending and descending order, with folders neatly grouped at the top, so that I can quickly organize and locate items based on my current task.

**Why this priority**: Sorting is the primary mechanism users rely on to make sense of large directories. Whether looking for the newest file, the largest storage consumer, or an item alphabetically, sorting provides immediate value with zero friction.

**Independent Test**: Can be fully tested by opening a directory containing mixed files and folders, clicking sort headers/controls (Name, Size, Modified Date, Type) and toggling ascending/descending order, verifying that folders group at the top and entries sort accurately according to the selected criteria.

**Acceptance Scenarios**:

1. **Given** a directory with multiple files and folders, **When** the user clicks the "Name" column header or selects "Name (A-Z)", **Then** folders appear first sorted alphabetically (A to Z), followed by files sorted alphabetically (A to Z).
2. **Given** a directory sorted ascending by any attribute, **When** the user clicks the same sort attribute again, **Then** the sort direction reverses to descending (e.g., Z to A, or largest to smallest) and a visual indicator reflects the active sort direction.
3. **Given** a user selects "Size" sorting, **When** the sort is applied, **Then** items sort accurately by numerical byte size rather than lexicographical string comparison (e.g., 10 MB comes after 2 MB and before 1 GB).
4. **Given** a user navigates between different folders, **When** new directories are loaded, **Then** the user's chosen sorting criteria (column and direction) remain active and apply consistently.

---

### User Story 2 - Instant Search and Subtree Discovery (Priority: P2)

As a user looking for a specific document, photo, or folder, I want to type keywords into a search bar to instantly filter the current view and optionally search recursively across subdirectories, so that I can quickly find target files without manually opening and checking multiple nested folders.

**Why this priority**: In complex directory structures, manually clicking through folder trees to find a misplaced or deeply nested file is tedious and time-consuming. Search enables direct, rapid retrieval of items across the repository.

**Independent Test**: Can be fully tested by entering a partial or full name of a file or folder into the search bar, verifying that non-matching items are filtered out in real-time, toggling recursive search to discover items located in subdirectories, and verifying that clicking a search result navigates to or opens the item.

**Acceptance Scenarios**:

1. **Given** a directory with multiple files and folders, **When** the user enters text into the search bar, **Then** the file list instantly filters to show only files and folders whose names match the query (case-insensitively).
2. **Given** files located in nested subdirectories under the current folder, **When** the user performs a recursive search, **Then** matching files from nested folders are listed with their relative path location indicated clearly.
3. **Given** active search results, **When** the user clicks on a matched folder, **Then** the system navigates directly into that folder; **When** the user clicks on a file, **Then** standard file operations (preview, play video, download, copy, delete) are readily available.
4. **Given** active search results or a filtered view, **When** the user clears the search input or clicks the clear icon, **Then** the view immediately returns to the complete directory listing of the current folder.
5. **Given** a search query that matches no files or folders, **When** the search executes, **Then** an informative "No matching files or folders found" message is displayed with guidance to check spelling or broaden search scope.

---

### User Story 3 - Multi-File Upload and Drag-and-Drop Batch Ingestion (Priority: P3)

As a user organizing digital assets, I want to select multiple files at once from my device or drag and drop a batch of files directly into the file manager interface, so that I can transfer groups of photos, videos, and documents into the current folder efficiently without repeating single-file upload steps.

**Why this priority**: Uploading collections of files one-by-one is frustrating and impractical for media libraries and project assets. Multi-file upload and drag-and-drop make data ingestion smooth, accessible, and fast.

**Independent Test**: Can be fully tested by dragging multiple files from the desktop and dropping them onto the file manager drop zone, or by selecting multiple files in the file picker dialog, and observing all selected items queue up, upload, and appear in the target folder upon completion.

**Acceptance Scenarios**:

1. **Given** a user clicks the upload button, **When** the native file picker opens, **Then** the user can multi-select several files simultaneously and confirm the selection to enqueue all selected files.
2. **Given** a user drags one or more files from their local desktop over the file manager window, **When** the files hover over the drop zone, **Then** a visible visual highlight indicates that files can be dropped here.
3. **Given** files are dropped onto the drop zone or confirmed via the file selector, **When** upload processing begins, **Then** an upload progress summary displays the total number of files in the batch, overall aggregate progress, and individual file statuses.
4. **Given** a batch of files where one file exceeds the maximum allowed size limit or encounters an issue, **When** the upload proceeds, **Then** the invalid file is flagged with a clear explanatory error message, while all remaining valid files continue uploading successfully.
5. **Given** all files in a multi-file batch finish uploading, **When** the batch completes, **Then** the current directory listing automatically refreshes to display the newly uploaded items.

---

### Edge Cases

- **Special Characters in Search**: Queries containing punctuation, symbols, whitespace, quotes, or Unicode characters (e.g., emojis, accented letters) must be treated as literal substring searches without causing syntax errors, regex crashes, or injection vulnerabilities.
- **Deep Directory Tree Recursive Search**: When searching recursively across very deep folder hierarchies, search execution must complete within reasonable time boundaries and must never exceed the sandbox storage root.
- **Identical Sort Values**: When multiple files share identical sort keys (e.g., same size, same modification date, or same extension), the system must maintain deterministic and stable ordering using file name as a secondary sort key.
- **Empty Folder Sorting**: When a directory contains only folders or only files, or no files at all, sorting controls must remain operable without causing visual glitches or errors.
- **Drag-and-Drop of Unsupported Objects**: If a user drags non-file items (e.g., browser links, selected page text) into the drop zone, the drop target must safely ignore the event without triggering an upload attempt or navigating the browser away.
- **Interrupted Multi-File Upload**: If network connectivity drops or the user navigates away while uploading a multi-file batch, active items must pause or report failure gracefully, and the browser must prompt for confirmation if uncompleted uploads are in progress.
- **Concurrent Sorting and Searching During Active Upload**: Users must be able to search or sort files while an upload batch is transferring in the background without causing state corruption or interrupting active transfers.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an interactive search input within the file manager interface for searching files and folders by name.
- **FR-002**: Search matching MUST be case-insensitive and match any substring within the file or folder name.
- **FR-003**: The system MUST support instant filtering of files and folders within the currently active directory as search keywords are entered.
- **FR-004**: The system MUST provide an option to search recursively across all nested subdirectories beneath the current directory.
- **FR-005**: Recursive search results MUST display the relative path or folder location for each matched item so users know where the item resides.
- **FR-006**: Users MUST be able to perform standard actions (preview, play video, download, copy, delete, navigate) directly on items listed in search results.
- **FR-007**: The system MUST display a clear empty state message when a search query yields no matches.
- **FR-008**: Clearing the search input MUST immediately restore the complete, unfiltered listing of the current directory.
- **FR-009**: The system MUST allow users to sort files and folders by four key attributes: Name, Size, Last Modified Date, and File Type.
- **FR-010**: Each sortable attribute MUST support toggling between Ascending and Descending order with clear visual indicators (such as directional arrows).
- **FR-011**: Directory listings MUST group folders at the top before files by default, while applying the active sort order within each respective group.
- **FR-012**: The active sort attribute and direction MUST persist during the user's active browsing session when navigating between different directories.
- **FR-013**: The system MUST allow users to select and upload multiple files simultaneously via the native file selector dialog.
- **FR-014**: The system MUST provide a visual drag-and-drop zone that allows users to drag multiple files from their local device directly into the file manager.
- **FR-015**: When files are dragged over the interface, the system MUST display a visible drag overlay indicating the drop target.
- **FR-016**: Multi-file uploads MUST process through a non-blocking queue that reports total file count, overall batch progress, and individual file status.
- **FR-017**: If any individual file in a multi-file batch fails (such as exceeding configured size limits), the system MUST flag the specific failure with a clear error explanation and continue uploading all other valid files in the batch.
- **FR-018**: All search operations and file interactions MUST be strictly constrained within the designated root directory, preventing any path traversal or access outside sandbox boundaries.

### Key Entities

- **Search Query**: Represents a search request initiated by the user. Attributes include search keyword/term, target root directory, search scope (`current_folder` or `recursive_subtree`), and optional filter criteria.
- **Search Result Item**: Represents an individual file or folder matched by a search query. Attributes include item name, relative path from the current directory, item type (`file` or `directory`), size in bytes, last modified timestamp, and mime type / extension.
- **Sort Configuration**: Represents the active display sorting preferences. Attributes include sort attribute (`name`, `size`, `modified_date`, `file_type`), sort direction (`ascending`, `descending`), and folder grouping preference (`folders_first` = true/false).
- **Upload Batch**: Represents a group of files enqueued for upload together. Attributes include batch identifier, destination directory, total files count, completed files count, failed files count, aggregate bytes transferred, aggregate total bytes, and overall batch status (`active`, `completed`, `cancelled`, `partial_failure`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Current-folder search filtering updates the displayed list in under 100 milliseconds as the user types.
- **SC-002**: Recursive subtree search across up to 5,000 files completes and displays results within 1.5 seconds.
- **SC-003**: Sorting directory contents containing up to 1,000 items re-renders the sorted view in under 100 milliseconds.
- **SC-004**: Users can select and enqueue 20+ files in a single action via either the file selection dialog or drag-and-drop.
- **SC-005**: 100% of invalid or oversized files in a multi-file batch are identified with descriptive error messages without disrupting valid files in the queue.
- **SC-006**: 100% of search operations strictly enforce root sandbox containment, preventing traversal outside the root directory under all test conditions.
- **SC-007**: 95% of tested users can successfully sort, search, and drag-and-drop upload files without external documentation or guidance.

## Assumptions

- Users access the application using standard modern web browsers that support the HTML5 Drag and Drop API and the file input `multiple` attribute.
- In-memory client-side filtering and sorting provide optimal responsiveness for directories of standard size (up to thousands of entries), while recursive search may leverage backend subtree indexing or traversal.
- The default sorting behavior groups folders before files, matching standard operating system file explorer conventions.
- Multi-file uploads adhere to the configured maximum upload size limit per file (configured up to 10 GB), rejecting oversized items individually.
- The visual drag-and-drop target covers the main file list area to provide an intuitive, expansive target zone.
