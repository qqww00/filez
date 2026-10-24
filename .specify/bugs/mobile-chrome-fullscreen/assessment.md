# Bug Assessment: Fullscreen Fails on Mobile Chrome Browser

- **Slug**: mobile-chrome-fullscreen
- **Created**: 2026-10-24
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

> "fullscreen don't work on mobile browser(chrome)"

## Symptom

When opening a video file in the media player modal on mobile Chrome (Android or iOS) and tapping the Fullscreen button (`⛶`), the video player does not enter true fullscreen mode. The video either remains constrained within the modal boundaries, fails to hide the mobile browser's omnibox/navigation bars, or fails to expand edge-to-edge in landscape orientation.

**Expected behavior**: Tapping the Fullscreen button on mobile Chrome should seamlessly expand the video player to fill the entire mobile screen edge-to-edge, utilizing native video fullscreen (`video.webkitEnterFullscreen()` or `video.requestFullscreen()`), container top-layer fullscreen (`container.requestFullscreen()`), or a resilient full-viewport pseudo-fullscreen mode when browser security policies or vendor restrictions prevent standard container fullscreen.

## Reproduction

1. Start the Filez server (`cargo run -- --host 0.0.0.0 --port 3000`) and access Filez from a mobile device using Google Chrome (or emulate mobile Chrome in DevTools) over a local network IP (e.g. `http://192.168.1.x:3000`).
2. Navigate into any folder containing a video file (e.g., `.mp4`, `.webm`) and tap the item to open `VideoPlayerModal`.
3. Tap the Fullscreen button (`⛶`) in the bottom transport controls.
4. **Observed Behavior**:
   - On insecure LAN HTTP origins (`http://<ip>:3000`), Chrome for Android strictly rejects `container.requestFullscreen()` with `TypeError: Permissions check failed` or security restrictions because `window.isSecureContext` is `false`.
   - The fallback logic invokes `onActivatePseudoFullscreen()` because `allowNativeVideoFallback` defaults to `false` in `useVideoPlayer.ts`, preventing the player from delegating to native video fullscreen.
   - On Chrome for iOS (iPhone), `HTMLDivElement.requestFullscreen` is unsupported by WebKit; because `allowNativeVideoFallback` is `false`, `video.webkitEnterFullscreen()` is never invoked, leaving the browser address bar and navigation toolbars fully visible.
   - Even in secure contexts where `container.requestFullscreen()` succeeds on Android, `file-manager.css` only defines styles for `.video-player-container.fullscreen` instead of standard `:fullscreen` and vendor `:-webkit-full-screen` pseudo-classes, causing the inner `.video-element` to remain constrained by `max-height: 75vh`.
   - The screen does not rotate or adapt to landscape orientation.

## Suspected Code Paths

- [frontend/src/utils/fullscreen.ts:69-114](file:///home/dev/src/filez/frontend/src/utils/fullscreen.ts#L69-L114) — `requestFullscreenWithFallback` accepts `allowNativeVideoFallback` with a default of `false`. When container fullscreen fails or is blocked on mobile Chrome, it never falls back to native video fullscreen (`video.webkitEnterFullscreen()` or `video.requestFullscreen()`).
- [frontend/src/hooks/useVideoPlayer.ts:146-174](file:///home/dev/src/filez/frontend/src/hooks/useVideoPlayer.ts#L146-L174) — `toggleFullscreen` calls `requestFullscreenWithFallback(container, video, () => setIsPseudoFullscreen(true))` without enabling native video fallback on mobile devices or handling mobile device detection, insecure HTTP contexts, or orientation locking.
- [frontend/src/styles/file-manager.css:922-972](file:///home/dev/src/filez/frontend/src/styles/file-manager.css#L922-L972) — CSS rules for fullscreen are scoped strictly to the `.video-player-container.fullscreen` class selector. When native container fullscreen enters the browser top-layer, standard `:fullscreen` and `:-webkit-full-screen` pseudo-classes match the container, but inner `.video-element` rules are not triggered if the React state update is delayed or if the element relies on native top-layer styling.
- [frontend/src/hooks/useVideoPlayer.ts:258-279](file:///home/dev/src/filez/frontend/src/hooks/useVideoPlayer.ts#L258-L279) — `fullscreenchange` event listener sets `isNativeFullscreen`, but does not attempt screen orientation adaptation (`screen.orientation.lock('landscape')`).

## Root Cause Hypothesis

**Confidence: High**

On mobile Chrome, container-level fullscreen fails or degrades due to three compounding factors:
1. **Insecure Context Restrictions on LAN HTTP**: When running locally and accessed from mobile devices via local IP (`http://192.168.x.x:3000`), Chrome on Android enforces secure context requirements (`isSecureContext === false`) and rejects `container.requestFullscreen()`.
2. **Native Video Fallback Disabled**: When container fullscreen is rejected or unavailable (e.g. Chrome on iOS where `div.requestFullscreen` does not exist), `useVideoPlayer.ts` fails to pass `allowNativeVideoFallback: true`, so neither `video.webkitEnterFullscreen()` nor `<video>.requestFullscreen()` is attempted. Instead, it activates CSS pseudo-fullscreen which leaves mobile browser navigation bars and omnibox visible.
3. **Missing `:fullscreen` CSS Pseudo-Classes**: `file-manager.css` only defines `.video-player-container.fullscreen`, lacking `:fullscreen` and `:-webkit-full-screen` selectors, so child video dimensions (`max-height: 75vh`) fail to scale to `100vh`/`100dvh` in native top layer.

## Proposed Remediation

**Preferred**:
Implement a robust mobile-aware fullscreen strategy in [`frontend/src/utils/fullscreen.ts`](file:///home/dev/src/filez/frontend/src/utils/fullscreen.ts), [`frontend/src/hooks/useVideoPlayer.ts`](file:///home/dev/src/filez/frontend/src/hooks/useVideoPlayer.ts), and [`frontend/src/styles/file-manager.css`](file:///home/dev/src/filez/frontend/src/styles/file-manager.css):

1. **Enable Mobile Video Fallback & Detection in `useVideoPlayer.ts`**:
   - Detect mobile environments (e.g., touch capability, user agent `/Android|iPhone|iPad|iPod/i`, or insecure context `!window.isSecureContext`).
   - Pass `allowNativeVideoFallback: true` to `requestFullscreenWithFallback`, allowing the player to fall back to `video.webkitEnterFullscreen()` (on iOS) or `video.requestFullscreen()` (on Android) when container fullscreen is disallowed or fails.
   - When entering fullscreen on mobile, attempt `screen.orientation?.lock?.('landscape')?.catch(() => {})` and unlock upon exit.
2. **Add Native Video Fullscreen Support in `fullscreen.ts`**:
   - In `requestFullscreenWithFallback`, if `container.requestFullscreen()` fails or is unavailable on mobile devices, attempt native `<video>` element fullscreen (`video.requestFullscreen?.()` or `video.webkitEnterFullscreen?.()`) before falling back to CSS pseudo-fullscreen.
3. **Add `:fullscreen` and `:-webkit-full-screen` Pseudo-Classes in `file-manager.css`**:
   - Add `.video-player-container:fullscreen`, `.video-player-container:-webkit-full-screen` alongside `.video-player-container.fullscreen`.
   - Add `.video-player-container:fullscreen .video-element` and `:-webkit-full-screen .video-element` with `width: 100% !important; height: 100% !important; max-height: 100vh !important; max-height: 100dvh !important; object-fit: contain;`.
4. **Enhanced CSS Pseudo-Fullscreen**:
   - Ensure pseudo-fullscreen uses `100dvw` and `100dvh`, fixed positioning, and high `z-index` so that when native fullscreen cannot be granted, the player completely overlays all application content.

**Alternatives**:
- *Directly invoke native `<video>` fullscreen on all mobile devices*: Check `/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)` and always trigger native video element fullscreen instead of container fullscreen. Trade-off: Custom Filez UI overlays (playback speed, custom scrubber) are temporarily replaced by native mobile OS video controls, but guarantees 100% reliability, native orientation rotation, and edge-to-edge display across all mobile browsers.

**Files likely to change**:
- `frontend/src/utils/fullscreen.ts`
- `frontend/src/hooks/useVideoPlayer.ts`
- `frontend/src/styles/file-manager.css`
- `frontend/tests/videoFullscreen.test.ts`

**Tests to add or update**:
- Update `frontend/tests/videoFullscreen.test.ts` to verify:
  - Mobile Chrome delegation to native video fullscreen when container fullscreen throws permissions/insecure errors.
  - Video fallback behavior when `allowNativeVideoFallback` is enabled.
  - Pseudo-fullscreen fallback when all native container and video methods fail.

## Risks & Considerations

- **Insecure Contexts (LAN HTTP)**: Many users run Filez on a home server over plain HTTP (`http://192.168.x.x:3000`). Browsers restrict the HTML5 Fullscreen API on non-secure origins, making native video element fallback or robust pseudo-fullscreen mandatory.
- **Orientation Lock Permissions**: `screen.orientation.lock()` requires the document to be in fullscreen and is only supported in secure contexts on certain devices; calls must always be wrapped in `.catch(() => {})` to avoid unhandled rejections.
- **iOS Safari / Chrome WebKit Quirks**: On iPhone, only `<video>` supports fullscreen; custom overlays cannot remain visible during native iOS fullscreen.

## Open Questions

- None.
