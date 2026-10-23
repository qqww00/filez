export type UploadItemStatus = 'queued' | 'uploading' | 'completed' | 'failed' | 'cancelled';

export interface UploadItem {
  id: string;
  file: File;
  filename: string;
  size: number;
  loadedBytes: number;
  progressPercentage: number;
  status: UploadItemStatus;
  speedBytesPerSec: number;
  etaSeconds: number | null;
  error?: string;
  abortController?: AbortController;
}

export type UploadBatchStatus = 'active' | 'completed' | 'cancelled' | 'error';

export interface UploadBatch {
  id: string;
  targetDirectory: string;
  items: UploadItem[];
  totalBytes: number;
  loadedBytes: number;
  progressPercentage: number;
  status: UploadBatchStatus;
  startedAt: number;
  completedAt?: number;
}

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percentage: number;
  speedBytesPerSec: number;
  etaSeconds: number | null;
}

export interface UploadSingleFileOptions {
  file: File;
  targetPath?: string;
  overwrite?: boolean;
  onProgress?: (event: UploadProgressEvent) => void;
  signal?: AbortSignal;
}
