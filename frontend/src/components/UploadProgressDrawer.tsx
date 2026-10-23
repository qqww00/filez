import React from 'react';
import type { UploadBatch } from '../types/upload';
import { UploadProgressItem } from './UploadProgressItem';
import { ProgressBar } from './ProgressBar';
import { formatBytes, formatDuration } from '../utils/progress';

interface UploadProgressDrawerProps {
  batch: UploadBatch | null;
  isOpen: boolean;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onClose: () => void;
  onCancelItem: (id: string) => void;
  onCancelAll: () => void;
  onClear: () => void;
}

export const UploadProgressDrawer: React.FC<UploadProgressDrawerProps> = ({
  batch,
  isOpen,
  isMinimized,
  onToggleMinimize,
  onClose,
  onCancelItem,
  onCancelAll,
  onClear,
}) => {
  if (!isOpen || !batch) return null;

  const totalCount = batch.items.length;
  const completedCount = batch.items.filter((i) => i.status === 'completed').length;
  const failedCount = batch.items.filter((i) => i.status === 'failed').length;
  const activeItem = batch.items.find((i) => i.status === 'uploading');
  const isAllDone = !batch.items.some((i) => i.status === 'uploading' || i.status === 'queued');

  // Compute aggregate ETA based on active item's speed
  const remainingBatchBytes = Math.max(0, batch.totalBytes - batch.loadedBytes);
  const aggregateEtaSeconds =
    activeItem && activeItem.speedBytesPerSec > 0
      ? remainingBatchBytes / activeItem.speedBytesPerSec
      : null;

  let title = `Uploading ${completedCount + 1} of ${totalCount} file${totalCount === 1 ? '' : 's'}`;
  if (isAllDone) {
    if (failedCount === 0 && batch.status !== 'cancelled') {
      title = `${totalCount} file${totalCount === 1 ? '' : 's'} uploaded`;
    } else if (batch.status === 'cancelled') {
      title = 'Upload cancelled';
    } else {
      title = `Upload completed with ${failedCount} error${failedCount === 1 ? '' : 's'}`;
    }
  }

  return (
    <aside
      className={`upload-drawer ${isMinimized ? 'minimized' : ''}`}
      role="region"
      aria-label="File upload progress drawer"
    >
      <div
        className="upload-drawer-header"
        onClick={onToggleMinimize}
        title={isMinimized ? 'Click to expand upload details' : 'Click to minimize'}
      >
        <div className="upload-drawer-title-group">
          <span aria-hidden="true">
            {isAllDone ? (failedCount === 0 ? '✓' : '⚠️') : '⬆️'}
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="upload-drawer-title">{title}</div>
            <div className="upload-drawer-subtitle">
              {batch.progressPercentage}% • {formatBytes(batch.loadedBytes)} / {formatBytes(batch.totalBytes)}
            </div>
          </div>
        </div>

        <div
          className="upload-drawer-actions"
          onClick={(e) => e.stopPropagation()}
        >
          {!isAllDone && (
            <button
              type="button"
              className="btn-drawer-action"
              onClick={onCancelAll}
              title="Cancel all uploads"
              aria-label="Cancel all uploads"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            className="btn-drawer-action"
            onClick={onToggleMinimize}
            title={isMinimized ? 'Expand' : 'Minimize'}
            aria-label={isMinimized ? 'Expand upload drawer' : 'Minimize upload drawer'}
          >
            {isMinimized ? '▢' : '—'}
          </button>

          {isAllDone && (
            <button
              type="button"
              className="btn-drawer-action"
              onClick={() => {
                onClear();
                onClose();
              }}
              title="Close drawer"
              aria-label="Close upload drawer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="upload-drawer-aggregate">
            <ProgressBar
              percentage={batch.progressPercentage}
              status={
                isAllDone
                  ? failedCount > 0
                    ? 'failed'
                    : batch.status === 'cancelled'
                    ? 'cancelled'
                    : 'completed'
                  : 'uploading'
              }
              height={6}
              ariaLabel="Aggregate upload progress"
            />

            <div className="upload-drawer-metrics">
              <span>
                {formatBytes(batch.loadedBytes)} of {formatBytes(batch.totalBytes)}
              </span>

              {activeItem && activeItem.speedBytesPerSec > 0 && (
                <span>
                  {formatBytes(activeItem.speedBytesPerSec)}/s • {formatDuration(aggregateEtaSeconds)}
                </span>
              )}
            </div>
          </div>

          <div className="upload-drawer-items" role="list" aria-label="Upload item queue">
            {batch.items.map((item) => (
              <UploadProgressItem
                key={item.id}
                item={item}
                onCancel={onCancelItem}
              />
            ))}
          </div>
        </>
      )}
    </aside>
  );
};
