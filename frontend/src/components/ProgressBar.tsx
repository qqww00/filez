import React from 'react';
import type { UploadItemStatus } from '../types/upload';

interface ProgressBarProps {
  percentage: number;
  status?: UploadItemStatus;
  height?: number | string;
  className?: string;
  ariaLabel?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  status = 'uploading',
  height = 6,
  className = '',
  ariaLabel = 'Upload progress',
}) => {
  const clampedPercentage = Math.max(0, Math.min(100, Math.round(percentage)));

  let statusModifier = '';
  if (status === 'completed') statusModifier = 'success';
  else if (status === 'failed') statusModifier = 'error';
  else if (status === 'cancelled') statusModifier = 'cancelled';

  return (
    <div
      className={`progress-bar-wrapper ${className}`}
      role="progressbar"
      aria-valuenow={clampedPercentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div
        className="progress-bar-track"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        <div
          className={`progress-bar-fill ${statusModifier}`}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
    </div>
  );
};
