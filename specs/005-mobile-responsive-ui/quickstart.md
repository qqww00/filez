# Quickstart Validation Guide: Mobile Responsive UI

**Feature**: Mobile-Responsive User Interface  
**Date**: 2026-10-24  
**Status**: Ready for Validation  

This guide provides step-by-step procedures to validate mobile responsiveness across viewports, touch interactions, dialogs, and orientations.

---

## Prerequisites & Environment Setup

1. **Start the Filez Backend Service**:
   ```bash
   cargo run -- --root /home/dev --host 0.0.0.0 --port 3000 --passphrase rahasia123
   ```
2. **Start the Frontend Development Server**:
   ```bash
   cd frontend
   npm run dev
   ```
   Access URL: `http://localhost:5173` (or network LAN IP on a mobile device).

---

## Validation Scenario 1: Touch Browsing & Viewport Adaptability

### Procedure
1. Open DevTools in Chrome or Firefox and activate Device Mode (toggle device toolbar).
2. Select standard device presets or custom viewports:
   - **Compact Mobile**: 320px width (iPhone SE 1st gen)
   - **Standard Mobile**: 375px width (iPhone 12/13/14 mini / standard)
   - **Large Mobile**: 412px width (Pixel 7 / Galaxy S21)
   - **Tablet Portrait**: 768px width (iPad mini)
3. Navigate into folders with deep directory paths (`/home/dev/...`).
4. Inspect elements with DevTools element inspector.

### Expected Outcomes
- Zero horizontal page overflow (`scrollWidth === clientWidth`).
- Breadcrumbs allow horizontal swiping/scrolling without line-wrapping collisions.
- Long filenames truncate smoothly with ellipses (`...`).
- Interactive buttons and folder rows measure at least 44×44px in bounding box.

---

## Validation Scenario 2: Mobile Search & Sorting

### Procedure
1. On a 375px mobile viewport, tap into the search input.
2. Enter search text (e.g. `test` or `video`).
3. Toggle the subfolder search button ("Subfolders: ON").
4. Tap the clear search button (`✕`).
5. Change the mobile sorting dropdown between Name (A-Z), Size (Largest first), and Modified Date.

### Expected Outcomes
- Input field font size is 16px (1rem), preventing automatic viewport zoom.
- Clear button and subfolder toggle are easily tappable with finger spacing.
- Results update immediately and directory entries reorder with folders on top.

---

## Validation Scenario 3: Responsive Dialogs & Bottom Sheet Upload Drawer

### Procedure
1. On a mobile viewport, click or tap the "Delete" action button on any file.
2. Observe the confirmation dialog.
3. Tap "Cancel" to dismiss.
4. Drag or select a file to upload to trigger the upload progress drawer.
5. Tap the minimize and expand controls on the drawer header.
6. Trigger a video playback for an `.mp4` file.

### Expected Outcomes
- Delete dialog renders as a centered/bottom card with action buttons visible above the fold.
- Background body scrolling is locked while any modal is active.
- Upload drawer docks to the bottom edge (`bottom: 0`, full width, rounded top corners).
- Video player scales to `100vw` / `100dvh` with large 48px control buttons and 36px scrubber track.

---

## Automated BDD Scenario Execution

Run the Gherkin feature test suite via Cucumber:

```bash
npx cucumber-js
```

Or run targeted feature suites:

```bash
npx cucumber-js features/mobile-touch-browsing.feature
npx cucumber-js features/mobile-search-and-sorting.feature
npx cucumber-js features/mobile-modals-and-upload-drawer.feature
```
