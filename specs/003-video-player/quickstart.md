# Quickstart & Verification Guide: In-App Video Media Player

**Feature**: `003-video-player`
**Date**: 2026-10-23
**Status**: Ready for implementation verification

This guide details how to validate the video media player across desktop and Android mobile viewports.

---

## 1. Prerequisites & Services

Ensure the backend and frontend are running:

```bash
# Terminal 1: Backend service with test directory
cargo run -- --root ./test_folder --host 127.0.0.1 --port 3000 --passphrase rahasia123

# Terminal 2: Frontend Vite dev server
cd frontend && npm run dev
```

Log in at `http://localhost:5173` with passphrase `rahasia123`.

---

## 2. Test Media Generation

Create or copy a valid test video file into `./test_folder`:

```bash
# Verify or create a small playable MP4 video using ffmpeg (if available) or copy existing test video
ffmpeg -f lavfi -i testsrc=duration=15:size=640x360:rate=30 \
       -f lavfi -i sine=frequency=440:duration=15 \
       -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest \
       ./test_folder/sample_video.mp4 -y
```

---

## 3. Verification Scenarios

### Scenario A: In-App Video Playback (User Story 1 - P1)
1. In the file manager, locate `sample_video.mp4` in the file list.
2. Click the file row.
3. **Verify**:
   - The video player modal opens with a darkened backdrop.
   - The file name `sample_video.mp4` appears in the header.
   - Video begins playback immediately or displays an intuitive play button.
   - Clicking Play/Pause toggles media playback smoothly.
   - Clicking the close button (`✕`) or pressing `Escape` closes the modal immediately and halts all sound.

### Scenario B: Android & Mobile Touch Viewport (User Story 2 - P2)
1. Open Chrome DevTools and switch to mobile emulation (Pixel 7 or 390px width).
2. Open `sample_video.mp4`.
3. **Verify**:
   - The video player occupies the viewport width without horizontal scrollbars.
   - Tap anywhere on the video while playing: controls disappear after 3 seconds of inactivity.
   - Tap the video again: controls immediately reappear.
   - Tap targets for Play/Pause, Fullscreen, and Close measure 48px × 48px or larger.
   - Tap the Fullscreen button: video enters full mobile screen mode.

### Scenario C: Seeking & Speed Controls (User Story 3 - P3)
1. During video playback, click/drag the timeline seeker to the 10-second mark.
2. **Verify**:
   - Video seeks instantly using HTTP byte-range requests without reloading the entire file.
   - Inspect browser Network tab: observe `HTTP 206 Partial Content` requests with `Content-Range: bytes ...`.
3. Open the speed menu and select `1.5x`.
4. **Verify**: Video accelerates to 1.5x speed with normal audio pitch.
5. Click the "Download" button in the modal header: verify the original file downloads directly to your device.

---

## 4. Automated Testing

```bash
# Run backend route and range streaming tests
cargo test

# Run frontend build and type checking
cd frontend && npm run build
```
