import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  UploadBatch,
  UploadItem,
  UploadProgressEvent,
} from '../types/upload';
import { uploadSingleFileWithProgress } from '../api/files';

interface UseUploadManagerOptions {
  onUploadSuccess?: (targetDirectory: string) => void;
}

export function useUploadManager(options: UseUploadManagerOptions = {}) {
  const { onUploadSuccess } = options;

  const [activeBatch, setActiveBatch] = useState<UploadBatch | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isDrawerMinimized, setIsDrawerMinimized] = useState<boolean>(false);

  // Active abort controllers mapped by item id
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  // Ref to track if queue worker is currently executing
  const isProcessingQueueRef = useRef<boolean>(false);
  // Store latest activeBatch in ref for worker loop access without stale closures
  const activeBatchRef = useRef<UploadBatch | null>(null);

  // Synchronized state setter that keeps activeBatchRef immediately up-to-date
  const setBatchState = useCallback((updater: (prev: UploadBatch | null) => UploadBatch | null) => {
    setActiveBatch((prev) => {
      const next = updater(prev);
      activeBatchRef.current = next;
      return next;
    });
  }, []);

  const isUploading =
    activeBatch !== null &&
    activeBatch.items.some(
      (item) => item.status === 'uploading' || item.status === 'queued'
    );

  // Window beforeunload warning when uploads are in progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading) {
        e.preventDefault();
        e.returnValue = 'File uploads are currently in progress. Leaving will cancel active uploads.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isUploading]);

  // Recalculate batch aggregates whenever item states change
  const updateBatchAggregates = (items: UploadItem[], currentBatch: UploadBatch): UploadBatch => {
    let loadedBytes = 0;
    let anyActive = false;
    let anyFailed = false;

    for (const item of items) {
      loadedBytes += item.loadedBytes;
      if (item.status === 'uploading' || item.status === 'queued') {
        anyActive = true;
      }
      if (item.status === 'failed') {
        anyFailed = true;
      }
    }

    const progressPercentage =
      currentBatch.totalBytes > 0
        ? Math.min(100, Math.round((loadedBytes / currentBatch.totalBytes) * 100))
        : 100;

    const status = anyActive
      ? 'active'
      : anyFailed
      ? 'error'
      : 'completed';

    return {
      ...currentBatch,
      items,
      loadedBytes,
      progressPercentage,
      status,
      completedAt: !anyActive ? Date.now() : undefined,
    };
  };

  // Sequential queue processor
  const processQueue = useCallback(async () => {
    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;

    try {
      while (true) {
        const batch = activeBatchRef.current;
        if (!batch) break;

        // Find the next queued item
        const nextItem = batch.items.find((item) => item.status === 'queued');
        if (!nextItem) break;

        const itemId = nextItem.id;
        const abortController = new AbortController();
        abortControllersRef.current.set(itemId, abortController);

        // Transition item to 'uploading'
        setBatchState((prev) => {
          if (!prev) return null;
          const updatedItems = prev.items.map((item) =>
            item.id === itemId
              ? { ...item, status: 'uploading' as const, abortController }
              : item
          );
          return updateBatchAggregates(updatedItems, prev);
        });

        let uploadFailed = false;
        let errorMessage: string | undefined;

        try {
          await uploadSingleFileWithProgress({
            file: nextItem.file,
            targetPath: batch.targetDirectory,
            signal: abortController.signal,
            onProgress: (event: UploadProgressEvent) => {
              setBatchState((prev) => {
                if (!prev) return null;
                const updatedItems = prev.items.map((item) => {
                  if (item.id === itemId) {
                    return {
                      ...item,
                      loadedBytes: event.loaded,
                      progressPercentage: event.percentage,
                      speedBytesPerSec: event.speedBytesPerSec,
                      etaSeconds: event.etaSeconds,
                    };
                  }
                  return item;
                });
                return updateBatchAggregates(updatedItems, prev);
              });
            },
          });
        } catch (err: unknown) {
          uploadFailed = true;
          if (err instanceof DOMException && err.name === 'AbortError') {
            errorMessage = 'Upload cancelled by user';
          } else if (err instanceof Error) {
            errorMessage = err.message;
          } else {
            errorMessage = 'Upload failed';
          }
        } finally {
          abortControllersRef.current.delete(itemId);
        }

        const isCancelled = abortController.signal.aborted;

        // Transition item to terminal state
        setBatchState((prev) => {
          if (!prev) return null;
          const updatedItems = prev.items.map((item) => {
            if (item.id === itemId) {
              if (isCancelled) {
                return {
                  ...item,
                  status: 'cancelled' as const,
                  error: 'Cancelled',
                  speedBytesPerSec: 0,
                  etaSeconds: null,
                };
              }
              if (uploadFailed) {
                return {
                  ...item,
                  status: 'failed' as const,
                  error: errorMessage,
                  speedBytesPerSec: 0,
                  etaSeconds: null,
                };
              }
              return {
                ...item,
                status: 'completed' as const,
                loadedBytes: item.size,
                progressPercentage: 100,
                speedBytesPerSec: 0,
                etaSeconds: null,
              };
            }
            return item;
          });
          return updateBatchAggregates(updatedItems, prev);
        });
      }
    } finally {
      isProcessingQueueRef.current = false;

      // Trigger completion callback if all items are processed
      const current = activeBatchRef.current;
      if (current && !current.items.some((i) => i.status === 'queued' || i.status === 'uploading')) {
        const anyUploaded = current.items.some((i) => i.status === 'completed');
        if (anyUploaded && onUploadSuccess) {
          onUploadSuccess(current.targetDirectory);
        }
      }
    }
  }, [onUploadSuccess, setBatchState]);

  // Enqueue new files
  const enqueueFiles = useCallback(
    async (files: File[], targetDirectory: string) => {
      if (files.length === 0) return;

      const newItems: UploadItem[] = files.map((file) => ({
        id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
        file,
        filename: file.name,
        size: file.size,
        loadedBytes: 0,
        progressPercentage: 0,
        status: 'queued' as const,
        speedBytesPerSec: 0,
        etaSeconds: null,
      }));

      const addedBytes = newItems.reduce((acc, item) => acc + item.size, 0);

      setBatchState((prev) => {
        if (!prev || prev.status === 'completed' || prev.status === 'cancelled') {
          // New batch
          return {
            id: 'batch_' + Date.now(),
            targetDirectory,
            items: newItems,
            totalBytes: addedBytes,
            loadedBytes: 0,
            progressPercentage: 0,
            status: 'active',
            startedAt: Date.now(),
          };
        }

        // Append to existing active batch
        const combinedItems = [...prev.items, ...newItems];
        const newTotal = prev.totalBytes + addedBytes;
        return {
          ...prev,
          items: combinedItems,
          totalBytes: newTotal,
          status: 'active',
        };
      });

      setIsDrawerOpen(true);
      setIsDrawerMinimized(false);

      // Trigger queue processing on next microtask
      setTimeout(() => {
        processQueue();
      }, 0);
    },
    [processQueue, setBatchState]
  );

  // Cancel single item
  const cancelItem = useCallback((itemId: string) => {
    const controller = abortControllersRef.current.get(itemId);
    if (controller) {
      controller.abort();
    } else {
      // If queued but not active yet, mark directly as cancelled
      setBatchState((prev) => {
        if (!prev) return null;
        const updatedItems = prev.items.map((item) =>
          item.id === itemId
            ? { ...item, status: 'cancelled' as const, error: 'Cancelled' }
            : item
        );
        return updateBatchAggregates(updatedItems, prev);
      });
    }
  }, [setBatchState]);

  // Cancel all remaining active or queued items
  const cancelAll = useCallback(() => {
    // Abort active transfers
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current.clear();

    // Mark all unfinished items as cancelled
    setBatchState((prev) => {
      if (!prev) return null;
      const updatedItems = prev.items.map((item) => {
        if (item.status === 'uploading' || item.status === 'queued') {
          return {
            ...item,
            status: 'cancelled' as const,
            error: 'Cancelled',
            speedBytesPerSec: 0,
            etaSeconds: null,
          };
        }
        return item;
      });
      return {
        ...prev,
        items: updatedItems,
        status: 'cancelled',
        completedAt: Date.now(),
      };
    });
  }, [setBatchState]);

  const toggleDrawer = useCallback(() => {
    setIsDrawerMinimized((prev) => !prev);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const clearBatch = useCallback(() => {
    cancelAll();
    setBatchState(() => null);
    setIsDrawerOpen(false);
  }, [cancelAll, setBatchState]);

  return {
    activeBatch,
    isUploading,
    isDrawerOpen,
    isDrawerMinimized,
    enqueueFiles,
    cancelItem,
    cancelAll,
    toggleDrawer,
    closeDrawer,
    clearBatch,
  };
}
