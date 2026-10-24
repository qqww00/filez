import { useState, useEffect, useCallback, useRef } from 'react';
import type { PlaybackSpeed } from '../types/media';

interface UseVideoPlayerOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  onClose: () => void;
}

import {
  getFullscreenElement,
  exitFullscreenAny,
  requestFullscreenWithFallback,
  isMobileDevice,
  lockOrientationLandscape,
  unlockOrientation,
  type WebKitVideoElement,
  type WebKitHTMLElement,
} from '../utils/fullscreen';

export { getFullscreenElement, exitFullscreenAny, isMobileDevice };

export function useVideoPlayer({
  videoRef,
  containerRef,
  isOpen,
  onClose,
}: UseVideoPlayerOptions) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [bufferedPercentage, setBufferedPercentage] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRateState] = useState<PlaybackSpeed>(1.0);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState<boolean>(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState<boolean>(false);
  const [areControlsVisible, setAreControlsVisible] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const hideTimerRef = useRef<number | null>(null);
  const isPseudoFullscreenRef = useRef<boolean>(false);

  useEffect(() => {
    isPseudoFullscreenRef.current = isPseudoFullscreen;
  }, [isPseudoFullscreen]);

  const isFullscreen = isNativeFullscreen || isPseudoFullscreen;

  // Reset or show controls with auto-hide timer when playing
  const showControlsTemporarily = useCallback(() => {
    setAreControlsVisible(true);

    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    // Auto-hide only when video is actively playing
    if (videoRef.current && !videoRef.current.paused) {
      hideTimerRef.current = window.setTimeout(() => {
        setAreControlsVisible(false);
      }, 3000);
    }
  }, [videoRef]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch((err: unknown) => {
        if (err instanceof Error) {
          setHasError(true);
          setErrorMessage(err.message);
        }
      });
    } else {
      video.pause();
    }
    showControlsTemporarily();
  }, [videoRef, showControlsTemporarily]);

  const seekTo = useCallback(
    (targetSeconds: number) => {
      const video = videoRef.current;
      if (!video) return;

      const clamped = Math.max(0, Math.min(duration || 0, targetSeconds));
      video.currentTime = clamped;
      setCurrentTime(clamped);
      showControlsTemporarily();
    },
    [videoRef, duration, showControlsTemporarily]
  );

  const seekRelative = useCallback(
    (deltaSeconds: number) => {
      const video = videoRef.current;
      if (!video) return;
      seekTo(video.currentTime + deltaSeconds);
    },
    [videoRef, seekTo]
  );

  const setVolume = useCallback(
    (val: number) => {
      const video = videoRef.current;
      if (!video) return;

      const clamped = Math.max(0, Math.min(1.0, val));
      video.volume = clamped;
      setVolumeState(clamped);
      if (clamped === 0) {
        video.muted = true;
        setIsMuted(true);
      } else if (video.muted) {
        video.muted = false;
        setIsMuted(false);
      }
      showControlsTemporarily();
    },
    [videoRef, showControlsTemporarily]
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
    showControlsTemporarily();
  }, [videoRef, showControlsTemporarily]);

  const setSpeed = useCallback(
    (rate: PlaybackSpeed) => {
      const video = videoRef.current;
      if (!video) return;

      video.playbackRate = rate;
      setPlaybackRateState(rate);
      showControlsTemporarily();
    },
    [videoRef, showControlsTemporarily]
  );

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current as WebKitHTMLElement | null;
    const video = videoRef.current as WebKitVideoElement | null;

    const currentlyInFullscreen =
      isPseudoFullscreenRef.current ||
      !!getFullscreenElement() ||
      !!(video && video.webkitDisplayingFullscreen);

    if (currentlyInFullscreen) {
      setIsPseudoFullscreen(false);
      setIsNativeFullscreen(false);
      unlockOrientation();
      if (video && typeof video.webkitExitFullscreen === 'function') {
        try {
          video.webkitExitFullscreen();
        } catch {
          // ignore
        }
      }
      exitFullscreenAny();
    } else {
      const isMobile = isMobileDevice();
      requestFullscreenWithFallback(
        container,
        video,
        () => {
          setIsPseudoFullscreen(true);
        },
        isMobile
      )
        .then((strategy) => {
          if (strategy === 'video-webkit' || strategy === 'video-standard') {
            setIsNativeFullscreen(true);
          }
          if (isMobile) {
            lockOrientationLandscape().catch(() => {});
          }
        })
        .catch(() => {
          setIsPseudoFullscreen(true);
        });
    }
    showControlsTemporarily();
  }, [containerRef, videoRef, showControlsTemporarily]);

  // Video element event attachments
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isOpen) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0 && video.duration > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBufferedPercentage(Math.min(100, (bufferedEnd / video.duration) * 100));
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setHasError(false);
      setErrorMessage(undefined);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      showControlsTemporarily();
    };

    const handlePause = () => {
      setIsPlaying(false);
      setAreControlsVisible(true);
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    const handleVolumeChange = () => {
      setVolumeState(video.volume);
      setIsMuted(video.muted);
    };

    const handleError = () => {
      setHasError(true);
      const mediaError = video.error;
      let msg = 'Unable to decode or stream this video file.';
      if (mediaError) {
        if (mediaError.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
          msg = 'This video format or codec is not supported by your browser.';
        } else if (mediaError.code === MediaError.MEDIA_ERR_NETWORK) {
          msg = 'Network connection dropped while streaming the video.';
        }
      }
      setErrorMessage(msg);
    };

    const handleVideoEnterFullscreen = () => {
      setIsNativeFullscreen(true);
    };

    const handleVideoExitFullscreen = () => {
      setIsNativeFullscreen(false);
      setIsPseudoFullscreen(false);
      unlockOrientation();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('error', handleError);
    video.addEventListener('webkitbeginfullscreen', handleVideoEnterFullscreen);
    video.addEventListener('webkitendfullscreen', handleVideoExitFullscreen);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('error', handleError);
      video.removeEventListener('webkitbeginfullscreen', handleVideoEnterFullscreen);
      video.removeEventListener('webkitendfullscreen', handleVideoExitFullscreen);
    };
  }, [videoRef, isOpen, showControlsTemporarily]);

  // Fullscreen change tracking across standard and vendor prefixes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const activeEl = getFullscreenElement();
      setIsNativeFullscreen(!!activeEl);
      if (!activeEl) {
        setIsPseudoFullscreen(false);
        unlockOrientation();
      } else if (isMobileDevice()) {
        lockOrientationLandscape().catch(() => {});
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Exit native fullscreen if open state changes to false
  useEffect(() => {
    if (!isOpen) {
      unlockOrientation();
      if (getFullscreenElement()) {
        exitFullscreenAny();
      }
    }
  }, [isOpen]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input has focus
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(volume - 0.1);
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          e.preventDefault();
          if (isPseudoFullscreenRef.current) {
            setIsPseudoFullscreen(false);
          } else if (getFullscreenElement()) {
            exitFullscreenAny();
          } else {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, togglePlay, seekRelative, setVolume, volume, toggleMute, toggleFullscreen, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    const video = videoRef.current as WebKitVideoElement | null;
    return () => {
      if (video) {
        video.pause();
        video.currentTime = 0;
        if (typeof video.webkitExitFullscreen === 'function') {
          try {
            video.webkitExitFullscreen();
          } catch {
            // ignore
          }
        }
      }
      if (getFullscreenElement()) {
        exitFullscreenAny();
      }
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [videoRef]);

  return {
    isPlaying,
    currentTime,
    duration,
    bufferedPercentage,
    volume,
    isMuted,
    playbackRate,
    isFullscreen,
    areControlsVisible,
    hasError,
    errorMessage,
    togglePlay,
    seekTo,
    seekRelative,
    setVolume,
    toggleMute,
    setSpeed,
    toggleFullscreen,
    showControlsTemporarily,
  };
}
