# Feature Specification: In-App Video Media Player with Android Mobile Support

**Feature Branch**: `003-video-player`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "Jika file itu adalah file video, buatkan media player untuk play video tersebut. Support android view"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Seamless In-App Video Playback (Priority: P1)

As a user browsing files in the storage system, I want to click or tap on any video file and have it play immediately inside an intuitive media player modal rather than being forced to download it first, so that I can instantly preview and watch video content directly in my browser.

**Why this priority**: Without in-app playback, users must download large multi-gigabyte video files to their local devices just to inspect their contents. Immediate playback is the core value proposition of a modern cloud/local file manager.

**Independent Test**: Can be fully tested by selecting any standard video file (e.g., MP4 or WebM) in the file manager, observing that a media player modal opens, and verifying that video playback starts smoothly with play, pause, seek, volume, and close controls.

**Acceptance Scenarios**:

1. **Given** a user is viewing a directory containing video files (e.g., `.mp4`, `.webm`, `.mkv`, `.mov`), **When** they click or tap on a video file row, **Then** an in-app video player overlay opens immediately with the file's title displayed in the header.
2. **Given** the video player overlay is open, **When** the video loads, **Then** standard playback controls are accessible: Play/Pause toggle, an interactive timeline seeker showing elapsed time and total duration, volume/mute adjustment, and a fullscreen toggle.
3. **Given** an open video player, **When** the user clicks the close button or presses the escape key, **Then** video playback halts and the overlay closes cleanly, returning the user to their previous directory position without reloading the page.

---

### User Story 2 - Mobile & Android Touch Viewport Optimization (Priority: P2)

As a mobile or Android device user accessing the file manager via a handheld browser, I want the media player to provide a touch-optimized, full-width viewing experience with responsive controls and auto-hiding overlays, so that watching videos on a phone or tablet is comfortable and ergonomic.

**Why this priority**: Mobile and Android users have small touchscreens and rely on touch gestures rather than precise mouse pointers. Cluttered or desktop-sized controls ruin the viewing experience and impede playback control.

**Independent Test**: Can be fully tested on an Android mobile browser (or simulated mobile viewport 360px–414px) by opening a video, testing touch tap-to-show/hide controls, verifying that tap targets meet accessibility standards (minimum 48px), and verifying landscape rotation and fullscreen expansion.

**Acceptance Scenarios**:

1. **Given** a user accessing the file manager from a mobile viewport (e.g., Android phone in portrait orientation), **When** a video is opened, **Then** the video player fits within the screen width while maintaining the video's native aspect ratio, with touch targets sized at 48px or larger for easy finger tapping.
2. **Given** a video is playing on a touch device, **When** the user does not touch the screen for 3 seconds, **Then** the playback controls automatically fade out to provide an unobstructed viewing experience; tapping anywhere on the screen immediately restores the controls.
3. **Given** a mobile user viewing a video in portrait orientation, **When** they rotate their device to landscape orientation or tap the Fullscreen button, **Then** the player expands seamlessly to fill the entire screen.

---

### User Story 3 - Instant Seeking, Playback Speed & Codec Fallback (Priority: P3)

As a user watching video files of varying lengths and formats, I want to jump to any point in the video timeline without waiting for the full file to download, adjust playback speeds, and receive clear fallback options if a codec is unsupported, so that my viewing experience is versatile and reliable.

**Why this priority**: Large video files (100 MB to 10 GB) cannot reasonably be buffered in their entirety before playback begins. Range-based streaming, adjustable playback speeds, and transparent error fallbacks ensure usability across diverse video libraries.

**Independent Test**: Can be fully tested by opening a large video file (e.g., 200 MB+), seeking forward immediately to the middle of the timeline, changing playback speed to 1.5x, and testing an unplayable file format to verify that an informative message and direct download button are shown.

**Acceptance Scenarios**:

1. **Given** an ongoing video playback session for a large video file, **When** the user drags or clicks to a future timestamp on the progress timeline, **Then** the player buffers and resumes playback from that exact timestamp within 1 second.
2. **Given** an active video player, **When** the user opens the playback speed selector and chooses an alternate rate (e.g., 0.5x, 1x, 1.25x, 1.5x, 2x), **Then** the video adjusts its playback rate immediately while maintaining pitch-corrected audio.
3. **Given** a video file with an audio or video codec unsupported by the user's specific browser, **When** playback fails to decode, **Then** the player displays an informative message explaining that the codec is unsupported, accompanied by a prominent "Download File" button.

---

### Edge Cases

- **Gigabyte-Scale Video Files**: The system must stream video data on-demand via byte ranges without attempting to read the entire multi-gigabyte file into server memory or client memory.
- **Orientation Flipping on Mobile**: Rapidly rotating a mobile device between portrait and landscape modes must adjust the video container without restarting playback or losing playback position.
- **Audio-Only or Muted Videos**: Videos without audio tracks or video tracks (e.g., blank tracks) must play without error or crashing the timeline.
- **Slow or Intermittent Mobile Connections**: When mobile network bandwidth drops, the player displays a subtle loading indicator over the video while buffering, resuming as soon as sufficient data is received.
- **File Name Conflicts and Special Characters**: Video file names containing spaces, Unicode characters, or symbols (e.g., `Video #1 [1080p].mp4`) must play correctly without URI encoding errors.
- **Simultaneous Action (Download while Watching)**: Users should have a dedicated download button within the player header to save the file locally if desired without having to close the player.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST detect video files based on standard video file extensions (including `.mp4`, `.webm`, `.mkv`, `.mov`, `.avi`, `.m4v`, `.ogv`).
- **FR-002**: Clicking or tapping any recognized video file in the file listing MUST trigger the in-app video media player instead of a direct file download.
- **FR-003**: The media player MUST be presented as an overlay/modal with a darkened backdrop, keeping the user in the context of their current directory.
- **FR-004**: The media player MUST support byte-range streaming requests so that users can jump/seek to arbitrary timestamps without buffering earlier portions of the file.
- **FR-005**: The media player MUST provide responsive transport controls:
  - Play and Pause toggle
  - Current playback time and total duration display (formatted as `MM:SS` or `HH:MM:SS`)
  - Interactive timeline seek bar with buffer progress indication
  - Volume control slider and instant Mute toggle
  - Fullscreen expansion toggle
- **FR-006**: The media player MUST provide an Android- and mobile-friendly viewport design:
  - Responsive layout down to 360px viewport width
  - Minimum touch target size of 48px by 48px for all mobile interactive controls
  - Tap-to-toggle overlay controls that auto-hide after 3 seconds of user inactivity during playback
  - Touch-friendly progress scrubbing
- **FR-007**: The media player MUST support variable playback speeds with selectable rates of at least `0.5x`, `1.0x` (normal), `1.25x`, `1.5x`, and `2.0x`.
- **FR-008**: The media player MUST support desktop keyboard shortcuts:
  - `Space`: Toggle Play/Pause
  - `Arrow Left` / `Arrow Right`: Seek backward/forward by 5 seconds
  - `Arrow Up` / `Arrow Down`: Increase/decrease volume by 10%
  - `M`: Toggle Mute
  - `F`: Toggle Fullscreen
  - `Escape`: Close video player
- **FR-009**: The player header MUST display the video's filename and provide a direct Download button to download the original file to the user's device.
- **FR-010**: If a video fails to play due to an unsupported codec or decoding error, the system MUST display a user-friendly error message detailing the issue and offer a direct download option.
- **FR-011**: Closing the player (via close button, Escape key, or clicking the backdrop) MUST immediately stop video audio/video playback and release streaming connections.

### Key Entities

- **Video Asset**: Represents a playable video file in storage. Includes file name, file path, size, MIME type, and formatted duration.
- **Playback Session**: Represents the active viewing state. Includes current time position, total duration, buffer range, volume level (0.0 to 1.0), mute state, playback rate (speed multiplier), controls visibility state, and fullscreen state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Video playback starts within 800 milliseconds of user clicking a video file under standard local network conditions.
- **SC-002**: Seeking to an unbuffered position in a video file (up to 10 GB in size) initiates playback within 1.2 seconds.
- **SC-003**: 100% of tested touch interactive controls meet or exceed the 48x48px accessibility tap target guideline on mobile viewports.
- **SC-004**: The video player adapts smoothly across mobile screens from 360px width to 4K desktop displays without visual distortion or horizontal scrolling.
- **SC-005**: 100% of tested playback actions (pause, volume adjustment, speed changes, timeline scrubbing) update the media stream within 100 milliseconds of user input.
- **SC-006**: Closing the media player immediately ceases all audio output in 0 milliseconds (no phantom background audio).

## Assumptions

- Users access the application via modern web browsers (Chrome, Firefox, Safari, Edge, Samsung Internet, Android Webview) that support HTML5 video streaming.
- Supported in-browser decodable video formats depend on client platform hardware codecs (H.264/AVC, VP8, VP9, and AV1 are standard; formats with unsupported proprietary codecs gracefully fall back to direct download).
- The existing storage service supports HTTP Range requests (`Accept-Ranges: bytes`, `206 Partial Content`) for efficient video seeking.
- Single-user access or multi-user access on trusted local networks with authenticated sessions.
