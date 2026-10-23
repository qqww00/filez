import React from 'react';
import type { UploadItem } from '../types/upload';
import { ProgressBar } from './ProgressBar';
import { formatBytes, formatDuration } from '../utils/progress';

interface UploadProgressItemProps {
  item: UploadItem;
  onCancel: (id: string) => void;
}

export const UploadProgressItem: React.FC<UploadProgressItemProps> = ({ item, onCancel }) => {
  const isCancellable = item.status === 'queued' || item.status === 'uploading';

  return (
    <div className="upload-item-row" data-status={item.status}>
      <div className="upload-item-top">
        <div className="upload-item-info">
          <span className="upload-item-icon" aria-hidden="true">
            📄
          </span>
          <span className="upload-item-name" title={item.filename}>
            {item.filename}
          </span>
        </div>

        <div className="upload-item-meta">
          <span className={`badge-status ${item.status}`}>
            {item.status === 'uploading' && <span className="mini-spinner" style={{ width: 10, height: 10, borderWidth: 1 }} aria-hidden="true" />}
            {item.status}
          </span>

          {isCancellable && (
            <button
              type="button"
              className="btn-item-cancel"
              onClick={() => onCancel(item.id)}
              title={`Cancel upload for ${item.filename}`}
              aria-label={`Cancel upload for ${item.filename}`}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <ProgressBar
        percentage={item.progressPercentage}
        status={item.status}
        height={4}
        ariaLabel={`Progress for ${item.filename}`}
      />

      <div className="upload-item-bottom">
        <span>
          {item.status === 'uploading'
            ? `${formatBytes(item.loadedBytes)} of ${formatBytes(item.size)} (${item.progressPercentage}%)`
            : formatBytes(item.size)}
        </span>

        {item.status === 'uploading' && item.speedBytesPerSec > 0 && (
          <span>
            {formatBytes(item.speedBytesPerSec)}/s • {formatDuration(item.etaSeconds)}
          </span>
        )}

        {item.status === 'failed' && (
          <span className="upload-item-error" role="alert">
            ⚠️ {item.error || 'Upload failed'}
          </span>
        )}

        {item.status === 'cancelled' && (
          <span style={{ color: '#94a3b8' }}>Cancelled</span>
        )}

        {item.status === 'completed' && (
          <span style={{ color: '#34d399' }}>✓ Finished</span>
        )}
      </div>
    </div>
  );
};
