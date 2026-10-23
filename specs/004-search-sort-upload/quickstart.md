# Quickstart & Verification Guide: File Search, Sorting, and Multi-File Upload

**Feature**: `004-search-sort-upload`
**Date**: 2026-10-24
**Status**: Ready for implementation verification

This guide describes how to run and manually verify sorting, search, and multi-file drag-and-drop uploads.

---

## 1. Prerequisites & Services

Ensure the backend and frontend dev servers are running:

```bash
# Terminal 1: Backend service with dedicated test sandbox
cargo run -- --root ./test_folder --host 127.0.0.1 --port 3000 --passphrase rahasia123

# Terminal 2: Frontend Vite dev server
cd frontend && npm run dev
```

Log in to the web app at `http://localhost:5173` with passphrase `rahasia123`.

---

## 2. Test Fixtures Setup

Run this script to populate `./test_folder` with nested folders and files for testing:

```bash
mkdir -p ./test_folder/documents/reports
mkdir -p ./test_folder/media/photos
mkdir -p ./test_folder/media/videos

# Create sample files of varying sizes and dates
echo "Project README" > ./test_folder/README.md
echo "Quarterly Report 2026 Q1" > ./test_folder/documents/reports/q1_report.pdf
echo "Quarterly Report 2026 Q2" > ./test_folder/documents/reports/q2_report.pdf
head -c 204800 /dev/urandom > ./test_folder/media/photos/sunset.jpg
head -c 1048576 /dev/urandom > ./test_folder/media/videos/holiday.mp4
head -c 51200 /dev/urandom > ./test_folder/media/photos/nature.png
```

---

## 3. Verification Scenarios

### Scenario A: File & Folder Sorting (User Story 1 - P1)
1. Open the file manager root at `http://localhost:5173`.
2. Observe the table columns: **Name**, **Size**, **Modified**, **Actions**.
3. **Verify Folders-First**:
   - Folders (`documents`, `media`) appear grouped at the top.
   - Files (`README.md`) appear below folders.
4. Click the **Name** column header:
   - Verify sort direction toggles between Ascending (A-Z) and Descending (Z-A).
   - Verify directional arrow icon updates accordingly.
5. Navigate into `media/photos`:
   - Click the **Size** column header:
   - In descending order, `sunset.jpg` (200 KB) appears before `nature.png` (50 KB).
   - In ascending order, `nature.png` appears first.
6. Navigate back to root:
   - Verify your selected sorting column and direction remain active.

### Scenario B: In-Folder Search & Recursive Subtree Discovery (User Story 2 - P2)
1. In the root directory, type `doc` into the search bar:
   - Verify the file list immediately filters in real-time to show only `documents`.
   - Clear the search bar: the full directory list restores immediately.
2. Type `nonexistent_filename_xyz` into the search bar:
   - Verify an informative empty state appears: *"No matching files or folders found"*.
3. Test recursive search:
   - In the root directory, search `report` and press Enter / click "Search Subfolders":
   - Verify results display `q1_report.pdf` and `q2_report.pdf` along with their location (`documents/reports`).
   - Click on `documents/reports`: verify navigation into that folder works smoothly.

### Scenario C: Multi-File Selection & Drag-and-Drop Batch Upload (User Story 3 - P3)
1. Click the **Upload** button in the header:
   - In your OS file picker, select multiple files (3 to 5 files).
   - Confirm selection.
   - Verify all selected files are enqueued in the floating upload progress drawer.
   - Verify aggregate progress and individual statuses update until 100% completion.
2. Test drag-and-drop:
   - Select 2 files from your desktop.
   - Drag them over the browser window:
   - Verify a visual drop overlay appears highlighting the drop zone.
   - Drop the files:
   - Verify the drop overlay disappears, files are enqueued, and upload begins automatically.
   - Verify the directory listing refreshes automatically with the newly uploaded files.

---

## 4. Automated Testing

```bash
# Run backend tests (including recursive search and sandbox boundary validation)
cargo test

# Run frontend test suite & type checking
cd frontend && npm run build
```
