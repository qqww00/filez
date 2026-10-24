# BDD Feature Specifications: Filez Mobile Responsive UI

This directory contains executable Gherkin feature files that drive the Acceptance Test-Driven Development (ATDD) for Filez's mobile responsive interface.

## Feature Files

| Feature File | Description |
|---|---|
| [`mobile-touch-browsing.feature`](file:///home/dev/src/filez/features/mobile-touch-browsing.feature) | Validates touch-first directory navigation, breadcrumb scrolling, long filename truncation, and minimum 44x44px touch targets across mobile viewports. |
| [`mobile-search-and-sorting.feature`](file:///home/dev/src/filez/features/mobile-search-and-sorting.feature) | Validates mobile search bar ergonomics, on-screen keyboard focus without auto-zoom, subfolder toggle adaptation, and mobile sorting selector behavior. |
| [`mobile-modals-and-upload-drawer.feature`](file:///home/dev/src/filez/features/mobile-modals-and-upload-drawer.feature) | Validates responsive modal dialogs (login, delete, copy), bottom-sheet upload progress drawer, mobile video playback controls, and orientation transitions. |

## Target Consumer
- **Type**: Human end user of UI (`As a user`)
- **Signal**: React / TypeScript frontend in `frontend/package.json`
- **Target Viewports**: 320px to 768px (smartphones and tablets in portrait & landscape)
