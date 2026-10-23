export const SUPPORTED_VIDEO_EXTENSIONS = new Set([
  'mp4',
  'webm',
  'mkv',
  'mov',
  'avi',
  'm4v',
  'ogv',
  '3gp',
  'flv',
  'ts',
]);

/**
 * Checks if a filename has a recognized video extension.
 */
export function isVideoFile(filename: string): boolean {
  if (!filename) return false;
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filename.length - 1) return false;
  const ext = filename.substring(lastDot + 1).toLowerCase();
  return SUPPORTED_VIDEO_EXTENSIONS.has(ext);
}

/**
 * Formats time in seconds to MM:SS or HH:MM:SS.
 */
export function formatMediaTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) {
    return '0:00';
  }

  const totalSecs = Math.floor(seconds);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;

  if (hours > 0) {
    const paddedMins = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${paddedMins}:${paddedSecs}`;
  }

  return `${minutes}:${paddedSecs}`;
}

/**
 * Builds the authenticated streaming URL for a given relative path.
 */
export function getVideoStreamUrl(path: string): string {
  return `/api/files/content?path=${encodeURIComponent(path)}`;
}
