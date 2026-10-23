import React, { useState } from 'react';
import { useFiles } from '../hooks/useFiles';
import { useUploadManager } from '../hooks/useUploadManager';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { FileList } from '../components/FileList';
import { LoginModal } from '../components/LoginModal';
import { UploadButton } from '../components/UploadButton';
import { UploadProgressDrawer } from '../components/UploadProgressDrawer';
import { VideoPlayerModal } from '../components/VideoPlayerModal';
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog';
import { CopyDialog } from '../components/CopyDialog';
import { copyFile, deleteFile } from '../api/files';
import type { DirectoryEntry } from '../types/files';

export const FileManagerPage: React.FC = () => {
  const {
    currentPath,
    listing,
    isLoading,
    error: hookError,
    isAuthenticated,
    maxUploadSizeMb,
    handleLogin,
    navigateTo,
    refreshFiles,
  } = useFiles();

  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Upload queue and progress manager
  const {
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
  } = useUploadManager({
    onUploadSuccess: (targetDir) => {
      // Auto-refresh file list if target directory matches currently viewed directory
      if (targetDir === currentPath) {
        refreshFiles();
      }
    },
  });

  // Modal states
  const [deletingEntry, setDeletingEntry] = useState<DirectoryEntry | null>(null);
  const [copyingEntry, setCopyingEntry] = useState<DirectoryEntry | null>(null);
  const [playingVideo, setPlayingVideo] = useState<DirectoryEntry | null>(null);

  const clearMessages = () => {
    setLocalError(null);
    setSuccessMessage(null);
  };

  const handleUpload = (files: File[]) => {
    clearMessages();
    const maxBytes = maxUploadSizeMb * 1024 * 1024;
    const validFiles: File[] = [];

    for (const file of files) {
      if (file.size > maxBytes) {
        const fileMb = (file.size / (1024 * 1024)).toFixed(1);
        const limitStr =
          maxUploadSizeMb >= 1024
            ? `${(maxUploadSizeMb / 1024).toFixed(0)} GB`
            : `${maxUploadSizeMb} MB`;
        setLocalError(
          `File "${file.name}" (${fileMb} MB) exceeds maximum upload limit of ${limitStr}. Use --max-upload-mb to configure higher limits.`
        );
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length > 0) {
      enqueueFiles(validFiles, currentPath);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEntry) return;
    clearMessages();
    try {
      await deleteFile(deletingEntry.path);
      setSuccessMessage(`Deleted ${deletingEntry.name}.`);
      setDeletingEntry(null);
      refreshFiles();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLocalError(err.message);
      } else {
        setLocalError('Failed to delete file.');
      }
    }
  };

  const handleCopyConfirm = async (destDir: string, overwrite: boolean) => {
    if (!copyingEntry) return;
    clearMessages();
    try {
      await copyFile(copyingEntry.path, destDir, overwrite);
      setSuccessMessage(`Copied ${copyingEntry.name} successfully.`);
      setCopyingEntry(null);
      refreshFiles();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLocalError(err.message);
      } else {
        setLocalError('Failed to copy file.');
      }
    }
  };

  const activeError = localError || hookError;

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="brand-section">
          <span className="brand-logo" aria-hidden="true">⚡</span>
          <div>
            <h1 className="brand-title">Filez</h1>
            <span className="brand-subtitle">Local Network Storage</span>
          </div>
        </div>

        <div className="header-actions">
          {isAuthenticated && (
            <>
              <UploadButton
                onUpload={handleUpload}
                disabled={isLoading}
                isUploading={isUploading}
              />
              <button
                type="button"
                className="btn-icon"
                onClick={() => {
                  clearMessages();
                  refreshFiles();
                }}
                disabled={isLoading}
                title="Refresh directory contents"
                aria-label="Refresh directory contents"
              >
                🔄
              </button>
            </>
          )}
        </div>
      </header>

      {!isAuthenticated ? (
        <LoginModal onLogin={handleLogin} error={activeError} />
      ) : (
        <main>
          {listing && (
            <Breadcrumbs
              breadcrumbs={listing.breadcrumbs}
              onNavigate={(path) => {
                clearMessages();
                navigateTo(path);
              }}
              disabled={isLoading}
            />
          )}

          {activeError && (
            <div className="alert-box error" role="alert">
              ⚠️ {activeError}
            </div>
          )}

          {successMessage && (
            <div className="alert-box success" role="status">
              ✓ {successMessage}
            </div>
          )}

          <FileList
            entries={listing ? listing.entries : []}
            isLoading={isLoading}
            onNavigate={(path) => {
              clearMessages();
              navigateTo(path);
            }}
            onPlayVideo={(entry) => {
              clearMessages();
              setPlayingVideo(entry);
            }}
            onCopy={(entry) => {
              clearMessages();
              setCopyingEntry(entry);
            }}
            onDelete={(entry) => {
              clearMessages();
              setDeletingEntry(entry);
            }}
          />

          {listing && !isLoading && (
            <footer className="footer-stats">
              {listing.total_dirs} {listing.total_dirs === 1 ? 'folder' : 'folders'},{' '}
              {listing.total_files} {listing.total_files === 1 ? 'file' : 'files'}
            </footer>
          )}

          {deletingEntry && (
            <ConfirmDeleteDialog
              filename={deletingEntry.name}
              onConfirm={handleDeleteConfirm}
              onCancel={() => setDeletingEntry(null)}
            />
          )}

          {copyingEntry && (
            <CopyDialog
              sourcePath={copyingEntry.path}
              filename={copyingEntry.name}
              currentDir={currentPath}
              onConfirm={handleCopyConfirm}
              onCancel={() => setCopyingEntry(null)}
            />
          )}

          {/* Persistent Non-Blocking Upload Progress Drawer */}
          <UploadProgressDrawer
            batch={activeBatch}
            isOpen={isDrawerOpen}
            isMinimized={isDrawerMinimized}
            onToggleMinimize={toggleDrawer}
            onClose={closeDrawer}
            onCancelItem={cancelItem}
            onCancelAll={cancelAll}
            onClear={clearBatch}
          />

          {/* In-App Video Media Player Modal */}
          <VideoPlayerModal
            entry={playingVideo}
            isOpen={!!playingVideo}
            onClose={() => setPlayingVideo(null)}
          />
        </main>
      )}
    </div>
  );
};
