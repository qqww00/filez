# Data Model: In-App Video Media Player

**Feature**: `003-video-player`
**Date**: 2026-10-23
**Status**: Completed

## 1. Core Entities

```text
+-------------------------------------------------------------+
|                         VideoAsset                          |
+-------------------------------------------------------------+
| name: string                                                |
| path: string                                                |
| sizeBytes: number                                           |
| extension: string                                           |
| mimeType: string                                            |
| streamUrl: string                                           |
| downloadUrl: string                                         |
+-------------------------------------------------------------+
                              |
                              | 1
                              v 1
+-------------------------------------------------------------+
|                       PlaybackSession                       |
+-------------------------------------------------------------+
| isPlaying: boolean                                          |
| currentTime: number (seconds)                               |
| duration: number (seconds)                                  |
| bufferedRanges: TimeRangesSnapshot[]                        |
| volume: number (0.0 - 1.0)                                  |
| isMuted: boolean                                            |
| playbackRate: number (0.5, 1.0, 1.25, 1.5, 2.0)             |
| isFullscreen: boolean                                       |
| areControlsVisible: boolean                                 |
| hasPlaybackError: boolean                                   |
| errorMessage?: string                                       |
+-------------------------------------------------------------+
```

---

## 2. Entity Specifications

### `VideoAsset`
Represents the media file metadata used to initialize the player session.

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Display name of the file (e.g., `sample_movie.mp4`) |
| `path` | `string` | Relative path inside the storage sandbox (e.g., `media/sample_movie.mp4`) |
| `sizeBytes` | `number` | File size in bytes |
| `extension` | `string` | Lowercase extension without leading dot (e.g., `mp4`, `webm`, `mkv`) |
| `mimeType` | `string` | Content MIME type (e.g., `video/mp4`, `video/webm`) |
| `streamUrl` | `string` | Authenticated URL for HTTP range streaming (`/api/files/content?path=...`) |
| `downloadUrl` | `string` | Authenticated URL for attachment download |

### `PlaybackSession`
Represents client-side media playback state.

| Field | Type | Description |
|---|---|---|
| `isPlaying` | `boolean` | `true` if video media clock is advancing |
| `currentTime` | `number` | Current playback position in seconds |
| `duration` | `number` | Total media duration in seconds (0 while metadata is loading) |
| `bufferedRanges` | `Array<{start: number, end: number}>` | Cached byte ranges currently held in browser buffer |
| `volume` | `number` | Audio volume multiplier clamped between 0.0 and 1.0 |
| `isMuted` | `boolean` | `true` if audio output is muted |
| `playbackRate` | `number` | Speed multiplier (valid values: `0.5`, `1.0`, `1.25`, `1.5`, `2.0`) |
| `isFullscreen` | `boolean` | `true` if container is currently occupying the full viewport |
| `areControlsVisible` | `boolean` | `true` if on-screen controls overlay is visible |
| `hasPlaybackError` | `boolean` | `true` if browser decoder encountered an error (e.g., unsupported codec) |
| `errorMessage` | `string \| undefined` | User-facing explanation if playback failed |

---

## 3. Playback State Transitions

```text
       [ Video Clicked ]
              |
              v
         [ Loading ]
              |
      +-------+-------+
      |               |
(Metadata Ready) (Codec Error)
      |               |
      v               v
   [ Paused ]      [ Error State: Show Download Fallback ]
      |
 (Play Action)
      |
      v
  [ Playing ] <---------------+
      |                       |
      +-----> (Scrub/Seek) ---+
      |                       |
      +-----> (Speed Change) -+
      |                       |
      +-----> (Pause Action) -+
      |
 (Close/Escape)
      |
      v
  [ Closed ] (Media clock stopped, audio halted)
```
