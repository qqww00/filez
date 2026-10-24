# Technical Research & Design Decisions: Mobile-Responsive UI

**Feature**: Mobile-Responsive User Interface  
**Date**: 2026-10-24  
**Status**: Completed  

## 1. Responsive Breakpoints & Viewport Strategy

### Decision
Implement responsive styling using mobile-first CSS media queries targeting two primary breakpoints:
- **Mobile Handheld (Smartphones)**: `@media (max-width: 640px)`
- **Small Tablets / Phablets**: `@media (max-width: 768px)`
- Standardize all viewport heights using modern dynamic viewport units (`100dvh` with `100vh` fallback).

### Rationale
- The existing codebase already uses `640px` and `768px` in several components (`file-manager.css`); aligning with these breakpoints ensures visual cohesion without introducing fragmented breakpoint logic.
- Devices ranging from compact 320px screens (iPhone SE 1st gen) up to 414px/430px modern smartphones fall cleanly under the `640px` boundary.
- Dynamic viewport height (`100dvh`) accounts for browser chrome (address bar and navigation toolbar) on mobile Safari and Chrome, preventing content cutoff.

### Alternatives Considered
- **Utility CSS Framework (Tailwind / Bootstrap)**: Rejected to preserve disciplined simplicity (Constitution Principle V) and keep bundle size minimal without introducing build pipeline overhead.
- **Dedicated Mobile Subdomain / Separate App**: Rejected as unnecessary architectural complexity; a single responsive React application maintains parity across desktop and mobile.

---

## 2. Touch Target Ergonomics & Tap Interactions

### Decision
Enforce a minimum touch target bounding box of **44×44 pixels** (with 8px separation) for all interactive controls (buttons, links, file row clickable areas, search clear triggers) and **48×48 pixels** for media player overlay buttons.

### Rationale
- Complies with WCAG 2.2 AA Criterion 2.5.5 / 2.5.8 (Target Size) and Apple Human Interface Guidelines for touch navigation.
- Touch screens lack cursor precision; small 20–30px buttons cause high error rates and accidental triggers when navigating or deleting files.

### Alternatives Considered
- **Desktop hover-reveal action buttons**: Rejected because touch screens lack a native mouse hover state. Actions must be directly visible or accessible via prominent touch triggers.

---

## 3. Breadcrumb Navigation on Narrow Screens

### Decision
Implement horizontal touch scrolling with momentum (`-webkit-overflow-scrolling: touch`) and invisible scrollbars for the breadcrumbs container (`.breadcrumbs-container`), allowing deep folder paths to scroll fluidly on a single horizontal row.

### Rationale
- Deeply nested directories (e.g., `Home / Documents / Projects / 2026 / Q4 / Marketing`) consume substantial vertical space if wrapped across multiple lines.
- Horizontal scrolling maintains a compact, single-row navigation header and lets users quickly swipe back to any ancestor directory.

### Alternatives Considered
- **Collapsing into an ellipsis dropdown**: Adds extra taps to navigate back to ancestor folders.
- **Showing only the immediate parent folder**: Hides structural context from the user.

---

## 4. Mobile File Row Layout & Name Truncation

### Decision
Transition `.file-row` to a stacked, column-oriented flex layout on screens `< 640px`:
- **Top Row**: File/folder icon, filename, and relative folder badge (if in search results). Filename applies `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`, and `min-width: 0` on flex child containers.
- **Bottom Row**: File size, modified date, and touch-friendly action buttons (Download, Play, Copy, Delete) separated by clear spacing.

### Rationale
- Allows long file names (e.g. `quarterly-report-final-signed-v2.pdf`) to truncate cleanly with an ellipsis without squishing metadata or pushing action buttons off-screen.
- Guarantees zero horizontal page overflow while preserving all file actions.

### Alternatives Considered
- **Horizontal table scrolling**: Forcing the user to scroll horizontally across columns creates poor ergonomics on mobile.

---

## 5. Mobile Modals, Bottom Sheets & Background Scroll-Locking

### Decision
- On screens `<= 640px`, render confirmation dialogs (Delete, Copy, Login) as responsive bottom cards or centered cards with safe margins (`max-width: calc(100vw - 2rem)` and `max-height: 85dvh`).
- Transform the upload progress drawer into a docked bottom sheet (`bottom: 0`, `left: 0`, `right: 0`, `width: 100%`, `border-radius: 16px 16px 0 0`) with touch-friendly expand/collapse controls.
- When any modal or drawer is open on mobile, lock background page scrolling by applying `overflow: hidden` to `document.body`.

### Rationale
- Prevents desktop-sized modal windows from overflowing the viewport boundaries or getting pushed off-screen.
- Locking body scrolling prevents awkward "rubber-banding" or dual-scroll confusion when scrolling long folder trees in the Copy Dialog.

### Alternatives Considered
- **Full-screen takeovers for all dialogs**: Full screen works well for video players, but simple confirmation dialogs feel more native and contextual as bottom cards.

---

## 6. Mobile On-Screen Keyboard & Input Auto-Zoom Prevention

### Decision
Set `font-size: 16px` (or `1rem`) and `min-height: 44px` on all `<input>` and `<select>` elements when rendered on mobile screens.

### Rationale
- Mobile Safari (iOS) and certain Android WebKit browsers automatically zoom into the webpage whenever an input field with font size under 16px receives focus, causing disorienting layout shifts.
- Sizing inputs at 16px completely eliminates this issue without requiring `user-scalable=no` (which violates accessibility guidelines).

### Alternatives Considered
- **Viewport meta `user-scalable=no`**: Severely damages accessibility for users with visual impairments who rely on pinch-to-zoom.
