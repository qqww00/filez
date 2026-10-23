/**
 * Format bytes into human-readable units (B, KB, MB, GB).
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const clampedIndex = Math.min(i, units.length - 1);
  const value = bytes / Math.pow(1024, clampedIndex);
  
  if (clampedIndex === 0) return `${Math.round(value)} B`;
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[clampedIndex]}`;
}

/**
 * Format duration in seconds into intuitive remaining time string.
 */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || isNaN(seconds) || seconds < 0 || !isFinite(seconds)) {
    return '--';
  }
  if (seconds < 5) {
    return '< 5s remaining';
  }
  if (seconds < 60) {
    return `${Math.round(seconds)}s remaining`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = Math.round(seconds % 60);
  if (minutes < 60) {
    return remainingSecs > 0 ? `${minutes}m ${remainingSecs}s remaining` : `${minutes}m remaining`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m remaining`;
}

/**
 * Calculate Exponential Moving Average (EMA) smoothed speed in bytes/sec.
 * @param instantSpeed Current measured speed (bytes/sec)
 * @param previousSpeed Previous smoothed speed
 * @param alpha Smoothing factor (0.1 to 0.5, default 0.3)
 */
export function calculateSmoothedSpeed(
  instantSpeed: number,
  previousSpeed: number,
  alpha = 0.3
): number {
  if (previousSpeed <= 0) return instantSpeed;
  return alpha * instantSpeed + (1 - alpha) * previousSpeed;
}

/**
 * Speed and ETA tracker for an individual upload session.
 */
export class UploadMetricsTracker {
  private lastTime: number = 0;
  private lastLoaded: number = 0;
  private smoothedSpeed: number = 0;
  private total: number = 0;

  constructor(total: number) {
    this.total = total;
  }

  public update(loaded: number, now: number = performance.now()): { speed: number; eta: number | null } {
    if (this.lastTime === 0) {
      this.lastTime = now;
      this.lastLoaded = loaded;
      return { speed: 0, eta: null };
    }

    const elapsedSec = (now - this.lastTime) / 1000;
    // Update speed measurement roughly every 200ms+ to avoid noisy high-frequency spikes
    if (elapsedSec >= 0.25 || loaded === this.total) {
      const deltaBytes = Math.max(0, loaded - this.lastLoaded);
      const instantSpeed = elapsedSec > 0 ? deltaBytes / elapsedSec : 0;
      this.smoothedSpeed = calculateSmoothedSpeed(instantSpeed, this.smoothedSpeed);
      this.lastTime = now;
      this.lastLoaded = loaded;
    }

    const remainingBytes = Math.max(0, this.total - loaded);
    const eta = this.smoothedSpeed > 0 ? remainingBytes / this.smoothedSpeed : null;

    return {
      speed: this.smoothedSpeed,
      eta,
    };
  }
}
