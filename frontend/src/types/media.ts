import type { DirectoryEntry } from './files';

export interface VideoAsset {
  name: string;
  path: string;
  sizeBytes: number;
  extension: string;
  streamUrl: string;
}

export type PlaybackSpeed = 0.5 | 1.0 | 1.25 | 1.5 | 2.0;

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bufferedPercentage: number;
  volume: number;
  isMuted: boolean;
  playbackRate: PlaybackSpeed;
  isFullscreen: boolean;
  areControlsVisible: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export interface VideoPlayerModalProps {
  entry: DirectoryEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (entry: DirectoryEntry) => void;
}
