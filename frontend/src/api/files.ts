import { apiFetch, ClientError } from './client';
import type { ApiError, AuthStatus, DirectoryListing, SearchResultListing, UploadResult } from '../types/files';
import type { UploadSingleFileOptions } from '../types/upload';
import { UploadMetricsTracker } from '../utils/progress';

export async function login(passphrase: string): Promise<AuthStatus> {
  return apiFetch<AuthStatus>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ passphrase }),
  });
}

export async function getAuthStatus(): Promise<AuthStatus> {
  return apiFetch<AuthStatus>('/api/auth/status');
}

export async function listFiles(path?: string): Promise<DirectoryListing> {
  const query = path ? `?path=${encodeURIComponent(path)}` : '';
  return apiFetch<DirectoryListing>(`/api/files${query}`);
}

export async function searchFiles(
  query: string,
  path?: string,
  limit?: number
): Promise<SearchResultListing> {
  const params = new URLSearchParams();
  params.set('q', query);
  if (path) params.set('path', path);
  if (limit) params.set('limit', limit.toString());

  return apiFetch<SearchResultListing>(`/api/files/search?${params.toString()}`);
}

export async function uploadFiles(
  files: File[],
  targetPath?: string,
  overwrite?: boolean
): Promise<UploadResult> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file, file.name);
  }

  const params = new URLSearchParams();
  if (targetPath) params.set('path', targetPath);
  if (overwrite) params.set('overwrite', 'true');

  const queryStr = params.toString() ? `?${params.toString()}` : '';

  return apiFetch<UploadResult>(`/api/upload${queryStr}`, {
    method: 'POST',
    body: formData,
  });
}

/**
 * Upload a single file with real-time ProgressEvent tracking via XMLHttpRequest,
 * supporting AbortSignal cancellation and smooth speed/ETA metrics.
 */
export function uploadSingleFileWithProgress(
  options: UploadSingleFileOptions
): Promise<UploadResult> {
  const { file, targetPath, overwrite, onProgress, signal } = options;

  return new Promise<UploadResult>((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException('Upload cancelled by user', 'AbortError'));
    }

    const xhr = new XMLHttpRequest();
    const tracker = new UploadMetricsTracker(file.size);

    const formData = new FormData();
    formData.append('files', file, file.name);

    const params = new URLSearchParams();
    if (targetPath) params.set('path', targetPath);
    if (overwrite) params.set('overwrite', 'true');
    const queryStr = params.toString() ? `?${params.toString()}` : '';

    xhr.open('POST', `/api/upload${queryStr}`);
    xhr.withCredentials = true;

    // Track upload progress events
    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event: ProgressEvent) => {
        if (event.lengthComputable) {
          const loaded = event.loaded;
          const total = event.total;
          const percentage = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 100;
          const { speed, eta } = tracker.update(loaded);

          onProgress({
            loaded,
            total,
            percentage,
            speedBytesPerSec: speed,
            etaSeconds: eta,
          });
        }
      };
    }

    // Clean up signal listener when request completes
    const abortHandler = () => {
      xhr.abort();
    };

    if (signal) {
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    xhr.onload = () => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler);
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText) as UploadResult;
          resolve(result);
        } catch {
          reject(new ClientError('Failed to parse server upload response', 'INVALID_RESPONSE', xhr.status));
        }
      } else {
        let errorCode = 'UPLOAD_ERROR';
        let errorMessage = `HTTP Error ${xhr.status}: ${xhr.statusText || 'Upload failed'}`;

        try {
          const errorJson = JSON.parse(xhr.responseText) as ApiError;
          if (errorJson && errorJson.message) {
            errorMessage = errorJson.message;
            errorCode = errorJson.code || errorCode;
          }
        } catch {
          // Response body was not JSON
        }

        reject(new ClientError(errorMessage, errorCode, xhr.status));
      }
    };

    xhr.onerror = () => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler);
      }
      reject(new ClientError('Network connection failed during upload', 'NETWORK_ERROR', 0));
    };

    xhr.onabort = () => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler);
      }
      reject(new DOMException('Upload cancelled by user', 'AbortError'));
    };

    xhr.send(formData);
  });
}

export async function deleteFile(path: string): Promise<{ deleted: boolean; path: string }> {
  return apiFetch<{ deleted: boolean; path: string }>(
    `/api/files?path=${encodeURIComponent(path)}`,
    {
      method: 'DELETE',
    }
  );
}

export async function copyFile(
  sourcePath: string,
  destinationPath: string,
  overwrite?: boolean
): Promise<{ copied: boolean }> {
  return apiFetch<{ copied: boolean }>('/api/files/copy', {
    method: 'POST',
    body: JSON.stringify({
      source_path: sourcePath,
      destination_path: destinationPath,
      overwrite: overwrite ?? false,
    }),
  });
}
