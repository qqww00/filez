# Technical Research & Decisions: In-App Video Media Player with Android Mobile View Support

**Feature**: `003-video-player`
**Date**: 2026-10-23
**Status**: Completed

## 1. Video Streaming Architecture & HTTP Byte-Range Requests

### Context
Browser `<video>` elements require HTTP `Range: bytes=start-end` support (`206 Partial Content`) to seek forward and backward without waiting to buffer the entire video into memory. Without Range header handling, seeking in multi-gigabyte video files is impossible or extremely laggy.

### Decision
Implement a dedicated streaming content endpoint `GET /api/files/content?path=...` in Axum protected under the existing authentication middleware:
1. Validate `path` through `PathSandbox::resolve(path)` to prevent directory traversal outside the configured root sandbox.
2. Delegate the HTTP request to `tower_http::services::fs::ServeFile::new(canonical_path)` with the incoming Axum `Request<Body>`.

### Rationale
- `tower-http` (already in `Cargo.toml` with `features = ["fs"]`) implements standard RFC 7233 HTTP range processing, parsing `Range: bytes=X-Y`, generating `Content-Range`, `Content-Length`, `Accept-Ranges: bytes`, and MIME type detection (`video/mp4`, `video/webm`, etc.).
- Direct async kernel streaming: Zero memory allocation overhead on the Rust server regardless of whether the video is 10 MB or 10 GB.
- Full compatibility with HTML5 `<video src="/api/files/content?path=...">` across desktop browsers and Android mobile browsers.

### Alternatives Considered
- Loading entire files into memory: Causes Out-Of-Memory (OOM) crashes on 10 GB videos.
- Transcoding / HLS pipeline (FFmpeg): Overkill for a local file manager, introduces massive CPU overhead and third-party C-bindings. Native browser HTML5 playback with HTTP range requests is standard for local NAS / file server tools.

---

## 2. Android View & Mobile Touch Ergonomics

### Context
Mobile Android devices (screen widths 360px–480px in portrait, landscape up to 900px+) present unique challenges:
1. Touch targets must be at least 48x48px to prevent accidental taps.
2. Persistent on-screen controls obscure subtitles and video content.
3. Native mobile video behavior requires seamless fullscreen and aspect-ratio preservation.

### Decision
Design custom touch-optimized overlay controls over the native `<video>` element:
1. **Auto-Hiding Controls**: When video is playing, controls automatically fade out after 3,000 milliseconds of inactivity. Any touch or click on the video container brings them back immediately. When paused, controls remain visible.
2. **Touch-First Tap Targets**: Play/Pause, Mute, Fullscreen, Close, and Speed buttons have minimum dimensions of 48px × 48px with generous padding on mobile screens (`@media (max-width: 768px)`).
3. **Scrubber Ergonomics**: Timeline seek track with an enlarged touch hit area (padded hit box of 32px height) for accurate fingertip dragging.
4. **Orientation & Fullscreen**: Support standard HTML5 Fullscreen API (`requestFullscreen` / `exitFullscreen`). When in fullscreen on mobile, container expands to `100vw × 100vh` with black letterboxing (`object-fit: contain`).

### Rationale
- Matches standard mobile streaming video players (e.g. YouTube, Netflix mobile web).
- Eliminates browser-specific quirks of default mobile controls across different Android browsers (Chrome, Samsung Internet, Firefox).

---

## 3. Video Format Detection & Codec Fallback

### Context
A file manager holds diverse video containers: `.mp4`, `.webm`, `.mkv`, `.mov`, `.avi`, `.m4v`, `.ogv`. Some contain codecs natively supported by all Android and desktop browsers (H.264/AVC, VP8, VP9, AV1), while others (e.g., proprietary codecs in `.avi` or `.mkv`) may fail to decode.

### Decision
1. Detect video extensions dynamically with a centralized helper `isVideoFile(filename: string): boolean`.
2. When a video format cannot be decoded by the browser (firing the `<video>` element's `onError` event), the player presents a clear fallback UI:
   - Displays: *"This video's codec cannot be decoded natively by your browser."*
   - Provides a prominent *"Download Original File"* button.
3. Include a direct "Download" button in the player header at all times.

### Rationale
- Zero surprise for users: if a file can play, it plays instantly; if it requires external desktop players (like VLC), the user gets a 1-click download path.
