import React from 'react';
import type { DirectoryEntry } from '../types/files';
import { FileRow } from './FileRow';

interface FileListProps {
  entries: DirectoryEntry[];
  isLoading: boolean;
  onNavigate: (path: string) => void;
  onPlayVideo?: (entry: DirectoryEntry) => void;
  onCopy?: (entry: DirectoryEntry) => void;
  onDelete?: (entry: DirectoryEntry) => void;
}

export const FileList: React.FC<FileListProps> = ({
  entries,
  isLoading,
  onNavigate,
  onPlayVideo,
  onCopy,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="file-list-status" role="status">
        <div className="spinner" aria-hidden="true" />
        <p>Loading files and folders...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="file-list-empty">
        <div className="empty-icon" aria-hidden="true">📂</div>
        <h3>This folder is empty</h3>
        <p>Upload photos, documents, or videos to store them directly on your laptop.</p>
      </div>
    );
  }

  return (
    <div className="file-list-container">
      <div className="file-list-header" aria-hidden="true">
        <span className="col-name">Name</span>
        <span className="col-size">Size</span>
        <span className="col-date">Modified</span>
        <span className="col-actions">Actions</span>
      </div>

      <div className="file-items" role="list">
        {entries.map((entry) => (
          <FileRow
            key={entry.path}
            entry={entry}
            onNavigate={onNavigate}
            onPlayVideo={onPlayVideo}
            onCopy={onCopy}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};
