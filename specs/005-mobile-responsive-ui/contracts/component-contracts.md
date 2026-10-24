# UI Contract: Component Responsive Behavior

**Feature**: Mobile-Responsive User Interface  
**Date**: 2026-10-24  
**Status**: Ratified  

## 1. Header & Breadcrumbs

### `AppHeader`
- **Desktop**: Brand logo and title with subtitle "Local Network Storage" on left; upload button and refresh button on right.
- **Mobile (<= 640px)**:
  - Subtitle is hidden (`display: none`).
  - Brand title and buttons scale to fit single line.
  - Upload button text is compact (`Upload`) with icon; refresh button min size `44x44px`.

### `Breadcrumbs`
- **Desktop**: Inline horizontal list of directory links separated by `/`.
- **Mobile (<= 640px)**:
  - Container `.breadcrumbs-container` allows horizontal scrolling:
    ```css
    overflow-x: auto;
    white-space: nowrap;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none; /* hide native scrollbar */
    ```
  - Padding prevents end item cutoff; each link has minimum touch height `44px`.

---

## 2. File Listing & Rows

### `FileList`
- **Desktop**: Displays sortable column headers (`.file-list-header`) for Name, Size, Modified Date, and Actions.
- **Mobile (<= 640px)**:
  - Column header is hidden (`display: none`).
  - Mobile sorting bar (`.mobile-sort-bar`) is rendered above file items with a touch-friendly `<select>` dropdown (`.mobile-sort-select`, min-height `44px`, font-size `16px`).

### `FileRow`
- **Desktop**: Single row (`flex-direction: row`) with name spanning remaining width, size fixed at 100px, date at 160px, actions at 100px.
- **Mobile (<= 640px)**:
  - Stacks in two vertical tiers (`flex-direction: column`):
    - **Top**: Icon + Filename (with `text-overflow: ellipsis`, `min-width: 0`) + relative folder badge.
    - **Bottom**: Size + Date aligned left, action buttons aligned right with minimum `44x44px` hit areas.
  - Active tap feedback: subtle highlight (`rgba(56, 189, 248, 0.1)`).

---

## 3. Search & Filter Bar

### `SearchBar`
- **Mobile (<= 640px)**:
  - Search input has `min-height: 44px` and `font-size: 1rem` (`16px`).
  - Clear button (`✕`) has `min-width: 44px; min-height: 44px;`.
  - Search controls row wraps gracefully:
    - Subfolder toggle (`search-recursive-btn`) has `min-height: 44px;` and flex-grows.
    - Status message / match count displays neatly below or beside without overflowing.

---

## 4. Modals, Dialogs & Upload Drawer

### `ConfirmDeleteDialog` & `CopyDialog` & `LoginModal`
- **Mobile (<= 640px)**:
  - Max width: `calc(100vw - 2rem)` with centered or bottom-card docking.
  - Max height: `85dvh` with internal scrolling on content (`overflow-y: auto`).
  - Buttons (`Cancel`, `Confirm`, `Delete`) stack or split full-width (`flex: 1`), each with `min-height: 44px;`.
  - Background body scrolling is locked while dialog is open.

### `UploadProgressDrawer`
- **Mobile (<= 640px)**:
  - Docked to bottom edge: `bottom: 0; left: 0; right: 0; width: 100%; border-radius: 16px 16px 0 0;`.
  - Action buttons (expand, minimize, cancel file) provide minimum `44x44px` hit areas.

### `VideoPlayerModal`
- **Mobile (<= 768px)**:
  - Container fills `100vw` and `100dvh`.
  - Volume slider hidden (hardware volume controls used).
  - Scrubber touch area height increased to `36px` with `48x48px` control buttons.
