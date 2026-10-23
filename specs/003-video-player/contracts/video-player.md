# Contract: Video Player UI Component & Hook

**Feature**: `003-video-player`
**Component Layer**: React UI Component & Playback Hook

---

## 1. Video Player Component Interface

```typescript
export interface VideoPlayerModalProps {
  // File to play
  entry: DirectoryEntry | null;
  isOpen: boolean;

  // Handlers
  onClose: () => void;
  onDownload?: (entry: DirectoryEntry) => void;
}
```

---

## 2. Media Playback Hook Interface

```typescript
export interface UseVideoPlayerOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  autoPlay?: boolean;
}

export interface UseVideoPlayerReturn {
  // Playback state
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bufferedPercentage: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isFullscreen: boolean;
  areControlsVisible: boolean;
  hasError: boolean;
  errorMessage?: string;

  // Control actions
  togglePlay: () => void;
  seekTo: (seconds: number) => void;
  seekRelative: (deltaSeconds: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  setSpeed: (rate: number) => void;
  toggleFullscreen: () => void;
  showControlsTemporarily: () => void;
}
```

---

## 3. Keyboard Shortcuts Contract

When the modal has focus:
- `Space`: `togglePlay()`
- `ArrowLeft`: `seekRelative(-5)`
- `ArrowRight`: `seekRelative(5)`
- `ArrowUp`: `setVolume(volume + 0.1)`
- `ArrowDown`: `setVolume(volume - 0.1)`
- `m` / `M`: `toggleMute()`
- `f` / `F`: `toggleFullscreen()`
- `Escape`: `onClose()`
