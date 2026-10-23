import React from 'react';
import type { DirectoryEntry } from '../types/files';
import { isVideoFile } from '../utils/media';

interface FileRowProps {
  entry: DirectoryEntry;
  onNavigate: (path: string) => void;
  onPlayVideo?: (entry: DirectoryEntry) => void;
  onCopy?: (entry: DirectoryEntry) => void;
  onDelete?: (entry: DirectoryEntry) => void;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export const FileRow: React.FC<FileRowProps> = ({
  entry,
  onNavigate,
  onPlayVideo,
  onCopy,
  onDelete,
}) => {
  const isVideo = !entry.is_dir && isVideoFile(entry.name);

  const handleRowClick = () => {
    if (entry.is_dir) {
      onNavigate(entry.path);
    } else if (isVideo && onPlayVideo) {
      onPlayVideo(entry);
    }
  };

  const isClickable = entry.is_dir || (isVideo && !!onPlayVideo);

  return (
    <div
      className={`file-row ${entry.is_dir ? 'is-directory' : isVideo ? 'is-video' : 'is-file'}`}
      onClick={isClickable ? handleRowClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      title={isVideo ? `Play ${entry.name}` : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleRowClick();
        }
      }}
    >
      <div className="file-info">
        <span className="file-icon" aria-hidden="true">
          {entry.is_dir ? '📁' : isVideo ? '🎬' : '📄'}
        </span>
        <span className="file-name" title={entry.name}>
          {entry.name}
        </span>
        {'relative_folder' in entry && (entry as { relative_folder?: string }).relative_folder ? (
          <span
            className="file-folder-badge"
            title={`Folder: ${(entry as { relative_folder?: string }).relative_folder}`}
          >
            📂 {(entry as { relative_folder?: string }).relative_folder}
          </span>
        ) : null}
      </div>

      <div className="file-meta">
        <span className="file-size">
          {entry.is_dir ? 'Folder' : formatBytes(entry.size_bytes)}
        </span>
        <span className="file-date">{formatDate(entry.modified_at)}</span>

        {!entry.is_dir && (
          <div className="file-actions" onClick={(e) => e.stopPropagation()}>
            {isVideo && onPlayVideo && (
              <button
                type="button"
                className="btn-action btn-action-play"
                onClick={() => onPlayVideo(entry)}
                title={`Play ${entry.name}`}
                aria-label={`Play ${entry.name}`}
              >
                ▶
              </button>
            )}
            {onCopy && (
              <button
                type="button"
                className="btn-action"
                onClick={() => onCopy(entry)}
                title={`Copy ${entry.name}`}
                aria-label={`Copy ${entry.name}`}
              >
                📋
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="btn-action btn-action-danger"
                onClick={() => onDelete(entry)}
                title={`Delete ${entry.name}`}
                aria-label={`Delete ${entry.name}`}
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
