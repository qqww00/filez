import React, { useRef } from 'react';
import type { VideoPlayerModalProps, PlaybackSpeed } from '../types/media';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import { formatMediaTime, getVideoStreamUrl } from '../utils/media';
import { formatBytes } from '../utils/progress';

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  entry,
  isOpen,
  onClose,
  onDownload,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);

  const {
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
    setVolume,
    toggleMute,
    setSpeed,
    toggleFullscreen,
    showControlsTemporarily,
  } = useVideoPlayer({
    videoRef,
    containerRef,
    isOpen,
    onClose,
  });

  if (!isOpen || !entry) return null;

  const streamUrl = getVideoStreamUrl(entry.path);
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleScrubberInteraction = (clientX: number) => {
    const scrubber = scrubberRef.current;
    if (!scrubber || duration <= 0) return;

    const rect = scrubber.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    seekTo(ratio * duration);
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    handleScrubberInteraction(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      handleScrubberInteraction(e.touches[0].clientX);
    }
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload(entry);
    } else {
      const a = document.createElement('a');
      a.href = streamUrl;
      a.download = entry.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div
      className={`video-modal-backdrop ${isFullscreen ? 'has-fullscreen' : ''}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Playing video ${entry.name}`}
    >
      <div
        ref={containerRef}
        className={`video-player-container ${isFullscreen ? 'fullscreen' : ''} ${
          !areControlsVisible && isPlaying ? 'controls-hidden' : ''
        }`}
        onClick={(e) => {
          e.stopPropagation();
          showControlsTemporarily();
        }}
        onMouseMove={showControlsTemporarily}
        onTouchStart={showControlsTemporarily}
      >
        {/* Floating Top Header */}
        <div className="video-player-header">
          <div className="video-title-group">
            <span aria-hidden="true">🎬</span>
            <span className="video-title" title={entry.name}>
              {entry.name}
            </span>
            <span className="video-size-badge">{formatBytes(entry.size_bytes)}</span>
          </div>

          <div className="video-header-actions" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="btn-video-header"
              onClick={handleDownloadClick}
              title="Download original video file"
              aria-label="Download original video file"
            >
              <span aria-hidden="true">⬇️</span>
              <span>Download</span>
            </button>

            <button
              type="button"
              className="btn-video-close"
              onClick={onClose}
              title="Close player (Esc)"
              aria-label="Close video player"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Video HTML5 Stream Element or Error Fallback */}
        {hasError ? (
          <div className="video-fallback-box">
            <div className="video-fallback-icon" aria-hidden="true">
              🎞️
            </div>
            <div className="video-fallback-title">Video Playback Unavailable</div>
            <div className="video-fallback-desc">
              {errorMessage ||
                'This video format or codec cannot be decoded natively by your browser.'}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDownloadClick}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span>⬇️</span>
              <span>Download File to Play Externally</span>
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              src={streamUrl}
              className="video-element"
              playsInline
              onClick={togglePlay}
              preload="metadata"
            />

            {/* Big center play icon if paused and controls visible */}
            {!isPlaying && areControlsVisible && (
              <div className="video-center-overlay" aria-hidden="true">
                <div className="video-center-button">▶</div>
              </div>
            )}
          </>
        )}

        {/* Floating Transport Controls */}
        {!hasError && (
          <div className="video-player-controls" onClick={(e) => e.stopPropagation()}>
            {/* Scrubber Timeline */}
            <div
              ref={scrubberRef}
              className="video-scrubber-container"
              onClick={handleScrubberClick}
              onTouchMove={handleTouchMove}
              role="slider"
              aria-label="Video seek slider"
              aria-valuenow={Math.round(currentTime)}
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuetext={`${formatMediaTime(currentTime)} of ${formatMediaTime(duration)}`}
            >
              <div className="video-scrubber-track">
                <div
                  className="video-scrubber-buffer"
                  style={{ width: `${bufferedPercentage}%` }}
                />
                <div
                  className="video-scrubber-progress"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div
                className="video-scrubber-thumb"
                style={{ left: `${progressPercentage}%` }}
              />
            </div>

            {/* Bottom Controls Bar */}
            <div className="video-controls-bar">
              <div className="video-controls-left">
                <button
                  type="button"
                  className="btn-video-control"
                  onClick={togglePlay}
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                  aria-label={isPlaying ? 'Pause video' : 'Play video'}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>

                <div className="video-volume-group">
                  <button
                    type="button"
                    className="btn-video-control"
                    onClick={toggleMute}
                    title={isMuted || volume === 0 ? 'Unmute (M)' : 'Mute (M)'}
                    aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="video-volume-slider"
                    aria-label="Volume slider"
                  />
                </div>

                <span className="video-time-display">
                  {formatMediaTime(currentTime)} / {formatMediaTime(duration)}
                </span>
              </div>

              <div className="video-controls-right">
                <select
                  value={playbackRate}
                  onChange={(e) => setSpeed(parseFloat(e.target.value) as PlaybackSpeed)}
                  className="video-speed-select"
                  aria-label="Playback speed"
                  title="Playback speed"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1.0}>1.0x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2.0}>2.0x</option>
                </select>

                <button
                  type="button"
                  className="btn-video-control"
                  onClick={toggleFullscreen}
                  title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
                  aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                  {isFullscreen ? '🗗' : '⛶'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
