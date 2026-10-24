# Bug Assessment: Media Player Cannot Access Fullscreen in Mobile Browsers

- **Slug**: mobile-video-fullscreen
- **Created**: 2026-10-24
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

> "in mobile browser, media player can't access full screen"

## Symptom

When opening a video file in the media player modal on a mobile browser (such as iOS Safari, iPadOS, Android Chrome, or mobile web views) and tapping the Fullscreen button (`⛶`), the player fails to enter fullscreen mode. The video remains constrained inside the modal frame or nothing happens at all.

**Expected behavior**: Tapping the Fullscreen button on any mobile browser should expand the video player to fill the entire mobile screen (`100vw` × `100vh`), utilizing native video fullscreen on iOS (`webkitEnterFullscreen`), standard HTML5 Fullscreen API where supported (`container.requestFullscreen`), or a robust CSS pseudo-fullscreen viewport fallback when permissions or vendor APIs are restricted.

## Reproduction

1. Start Filez and access the application from a mobile browser (or open Chrome DevTools, switch to Mobile Device Emulation, and throttle/emulate mobile viewport).
2. Log in and navigate to any directory containing a video file (e.g. `media/videos/sample.mp4`).
3. Tap on the video file to open `VideoPlayerModal`.
4. In the video player transport controls bar, tap the Fullscreen button (`⛶`).
5. **Observed Behavior**:
   - On iOS Safari (iPhone): Neither `container.requestFullscreen` nor `container.webkitRequestFullscreen` exists on `HTMLDivElement`. The button click is ignored, leaving the video inside the modal.
   - On mobile browsers where container fullscreen is disallowed or fails permissions checks: `container.requestFullscreen()` rejects silently with an unhandled catch block (`.catch(() => {})`), leaving `isFullscreen: false`.
   - `document.fullscreenElement` check fails on WebKit-based browsers that use `webkitFullscreenElement`.

## Suspected Code Paths

- [frontend/src/hooks/useVideoPlayer.ts:128-144](file:///home/dev/src/filez/frontend/src/hooks/useVideoPlayer.ts#L128-L144) — `toggleFullscreen` only attempts `requestFullscreen` / `webkitRequestFullscreen` on `containerRef.current` (`HTMLDivElement`). On iOS Safari, `<div>` elements do not implement `requestFullscreen`; only `HTMLVideoElement` implements `video.webkitEnterFullscreen()`. Furthermore, there is no CSS-based pseudo-fullscreen fallback when container fullscreen is unavailable or rejected.
- [frontend/src/hooks/useVideoPlayer.ts:215-228](file:///home/dev/src/filez/frontend/src/hooks/useVideoPlayer.ts#L215-L228) — `handleFullscreenChange` only inspects `document.fullscreenElement`, ignoring `document.webkitFullscreenElement` and native `<video>` events (`webkitbeginfullscreen` / `webkitendfullscreen`).
- [frontend/src/components/VideoPlayerModal.tsx:265-274](file:///home/dev/src/filez/frontend/src/components/VideoPlayerModal.tsx#L265-L274) — Fullscreen button triggers `toggleFullscreen` without inspecting device/browser capabilities or providing fallback visual indicators.
- [frontend/src/styles/file-manager.css:825-865](file:///home/dev/src/filez/frontend/src/styles/file-manager.css#L825-L865) — `.video-modal-backdrop` enforces `padding: 1rem` on screens >= 768px, and `.video-player-container.fullscreen` lacks `position: fixed; inset: 0;` CSS fallback styling to ensure true edge-to-edge coverage if native OS fullscreen is bypassed or polyfilled.

## Root Cause Hypothesis

**Confidence: High**

The W3C Fullscreen API (`element.requestFullscreen()`) is not supported on arbitrary DOM elements (like `HTMLDivElement`) on iOS Safari, and can fail or be blocked by browser permissions on Android and embedded web views. Filez's `useVideoPlayer` hook exclusively calls `container.requestFullscreen()` and silently swallows errors in `.catch(() => {})` without:
1. Falling back to `HTMLVideoElement.webkitEnterFullscreen()` for iOS Safari.
2. Providing a CSS pseudo-fullscreen fallback (`position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 99999`) when native element fullscreen fails or is unavailable.
3. Checking vendor-prefixed fullscreen properties (`document.webkitFullscreenElement`) and listening to iOS video events (`webkitbeginfullscreen` and `webkitendfullscreen`).

## Proposed Remediation

**Preferred**:
Implement a multi-tier fullscreen strategy in [`frontend/src/hooks/useVideoPlayer.ts`](file:///home/dev/src/filez/frontend/src/hooks/useVideoPlayer.ts) and [`frontend/src/styles/file-manager.css`](file:///home/dev/src/filez/frontend/src/styles/file-manager.css):

1. **Multi-Tier Fullscreen Request**:
   - Check if the container supports standard `requestFullscreen()` or `webkitRequestFullscreen()`.
   - If that fails or is unsupported (e.g. iOS Safari), check if the `<video>` element has `webkitEnterFullscreen()`. If so, invoke `video.webkitEnterFullscreen()`.
   - If native fullscreen APIs are rejected or unsupported, activate a CSS-based pseudo-fullscreen mode by toggling an internal `isPseudoFullscreen` state.
2. **Comprehensive Fullscreen Detection**:
   - Helper `getFullscreenElement()` checking `document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement || (document as any).msFullscreenElement`.
   - Add listeners on the `<video>` element for `webkitbeginfullscreen` and `webkitendfullscreen` to synchronize `isFullscreen` state when native iOS fullscreen opens and closes.
3. **CSS Pseudo-Fullscreen Styles** in `frontend/src/styles/file-manager.css`:
   - Style `.video-modal-backdrop.has-fullscreen` and `.video-player-container.fullscreen` with `position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; max-width: 100vw !important; max-height: 100vh !important; border-radius: 0 !important; margin: 0 !important; padding: 0 !important;` so that pseudo-fullscreen visually covers the entire mobile screen edge-to-edge.

**Alternatives**:
- *Always use native iOS video controls on mobile*: Defeats the custom UI branding, speed controls, and consistent UX across devices. Multi-tier fullscreen preserves custom overlay controls where possible while gracefully delegating to native video fullscreen or CSS pseudo-fullscreen.

**Files likely to change**:
- `frontend/src/hooks/useVideoPlayer.ts`
- `frontend/src/components/VideoPlayerModal.tsx`
- `frontend/src/styles/file-manager.css`

**Tests to add or update**:
- Test in `frontend/tests/video-player.test.ts` or component verification verifying fallback behavior when `requestFullscreen` is missing or rejects.

## Risks & Considerations

- Screen orientation on mobile: When entering fullscreen on mobile phones in portrait, rotating to landscape should adapt `100vw × 100vh` smoothly with `object-fit: contain`.
- Safe area insets: On devices with display notches/home indicators (e.g., iPhone Dynamic Island / notch), ensure controls respect `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.

## Open Questions

- None.
