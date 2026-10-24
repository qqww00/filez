# Bug Fix: Media Player Cannot Access Fullscreen in Mobile Browsers

- **Slug**: mobile-video-fullscreen
- **Fixed**: 2026-10-24
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Implemented a multi-tier fullscreen strategy for the media player to support iOS Safari, iPadOS, Android mobile browsers, and web views. The player prioritizes Filez's custom player UI across all platforms: it uses container element fullscreen where supported (desktop & Android), and falls back directly to CSS-based pseudo-fullscreen viewport fill (`100vw` × `100dvh`) on platforms without DOM element fullscreen (iOS Safari / Chrome iOS) or where permissions fail. This ensures that custom playback controls (scrubber, speed selection, header, download) always remain active and the browser's native media player is not invoked.

## Changes

| File | Change | Notes |
|------|--------|-------|
| [`frontend/src/utils/fullscreen.ts`](file:///home/dev/src/filez/frontend/src/utils/fullscreen.ts) | added | Cross-vendor fullscreen detection, exit helpers, and multi-tier request strategy prioritizing custom player pseudo-fullscreen |
| [`frontend/src/hooks/useVideoPlayer.ts`](file:///home/dev/src/filez/frontend/src/hooks/useVideoPlayer.ts) | modified | Integrated multi-tier fallback in `toggleFullscreen`, added WebKit fullscreen event listeners (`webkitbeginfullscreen`/`webkitendfullscreen`), and escape/close handling |
| [`frontend/src/components/VideoPlayerModal.tsx`](file:///home/dev/src/filez/frontend/src/components/VideoPlayerModal.tsx) | modified | Added conditional `has-fullscreen` class to `video-modal-backdrop` |
| [`frontend/src/styles/file-manager.css`](file:///home/dev/src/filez/frontend/src/styles/file-manager.css) | modified | Added `.video-modal-backdrop.has-fullscreen`, fixed inset pseudo-fullscreen styles, `100dvh` support, and safe-area insets |
| [`frontend/tests/videoFullscreen.test.ts`](file:///home/dev/src/filez/frontend/tests/videoFullscreen.test.ts) | added | 8 unit tests covering vendor detection, exit helpers, custom player pseudo-fullscreen fallback priority, and opt-in native delegation |
| [`frontend/package.json`](file:///home/dev/src/filez/frontend/package.json) | modified | Added `test` script running node test runner |

## Diff Highlights (optional)

```typescript
// frontend/src/utils/fullscreen.ts
export async function requestFullscreenWithFallback(
  container: WebKitHTMLElement | null,
  video: WebKitVideoElement | null,
  onActivatePseudoFullscreen: () => void,
  allowNativeVideoFallback: boolean = false
): Promise<FullscreenStrategy> {
  const tryFallback = (): FullscreenStrategy => {
    if (allowNativeVideoFallback && video && typeof video.webkitEnterFullscreen === 'function') {
      try {
        video.webkitEnterFullscreen();
        return 'video-webkit';
      } catch {
        // Fall through to pseudo
      }
    }
    // Default: Keep Filez custom player UI in fullscreen via CSS pseudo-fullscreen
    onActivatePseudoFullscreen();
    return 'pseudo';
  };
  ...
}
```

```css
/* frontend/src/styles/file-manager.css */
.video-modal-backdrop.has-fullscreen {
  padding: 0 !important;
  background: #000000 !important;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.video-player-container.fullscreen {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  height: 100dvh !important;
  max-width: 100vw !important;
  max-height: 100vh !important;
  max-height: 100dvh !important;
  border-radius: 0 !important;
  z-index: 10001 !important;
}

.video-player-container.fullscreen .video-player-header {
  padding-top: max(1rem, env(safe-area-inset-top, 1rem));
}
.video-player-container.fullscreen .video-player-controls {
  padding-bottom: max(1rem, env(safe-area-inset-bottom, 1rem));
}
```

## Tests Added or Updated

- `frontend/tests/videoFullscreen.test.ts::getFullscreenElement detects standard and vendor-prefixed fullscreen elements` — pins down standard, WebKit, Moz, and MS fullscreen element detection.
- `frontend/tests/videoFullscreen.test.ts::exitFullscreenAny invokes standard exitFullscreen if available` — pins down standard exit.
- `frontend/tests/videoFullscreen.test.ts::exitFullscreenAny falls back to webkitExitFullscreen if standard is absent` — pins down vendor exit fallback.
- `frontend/tests/videoFullscreen.test.ts::requestFullscreenWithFallback uses standard container.requestFullscreen when available and resolves` — pins down standard element fullscreen.
- `frontend/tests/videoFullscreen.test.ts::requestFullscreenWithFallback prioritizes custom player (pseudo-fullscreen) on iOS Safari when container fullscreen is missing` — pins down that custom controls are preserved and native player is not invoked.
- `frontend/tests/videoFullscreen.test.ts::requestFullscreenWithFallback prioritizes custom player (pseudo-fullscreen) when container.requestFullscreen rejects` — pins down fallback to custom pseudo-fullscreen when container fullscreen rejects.
- `frontend/tests/videoFullscreen.test.ts::requestFullscreenWithFallback delegates to video.webkitEnterFullscreen only when allowNativeVideoFallback is true` — pins down opt-in behavior for native player.
- `frontend/tests/videoFullscreen.test.ts::requestFullscreenWithFallback activates pseudo-fullscreen when all native APIs fail or are unsupported` — pins down CSS pseudo-fullscreen fallback when native APIs fail.

## Local Verification

- Commands run:
  - `npm test` in `frontend/` → 8 passed, 0 failed (56ms).
  - `npm run lint` in `frontend/` → 0 errors, 3 pre-existing warnings in unrelated files.
  - `npm run build` in `frontend/` → `tsc -b && vite build` succeeded with no errors.
  - `cargo test` in repo root → 29 library tests, 13 integration tests passed (0 failed).
- Manual checks:
  - Validated keyboard shortcut handling (Escape key exits pseudo-fullscreen first before closing modal; Key F toggles fullscreen).
  - Validated safe area insets on mobile display notches/home indicators.

## Deviations from Assessment

- Prioritized CSS pseudo-fullscreen over `video.webkitEnterFullscreen()` fallback to ensure custom player UI (timeline scrubber, speed selector, title header, download) is always preserved on mobile devices instead of relinquishing control to the browser/OS native media player.

## Follow-ups

- Run `/speckit-bug-test slug=mobile-video-fullscreen` to verify and record verification report.
