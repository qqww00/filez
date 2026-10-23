import React from 'react';
import type { DirectoryEntry, SortConfig, SortField } from '../types/files';
import { FileRow } from './FileRow';

interface FileListProps {
  entries: DirectoryEntry[];
  isLoading: boolean;
  sortConfig?: SortConfig;
  onSortChange?: (field: SortField) => void;
  isSearching?: boolean;
  onNavigate: (path: string) => void;
  onPlayVideo?: (entry: DirectoryEntry) => void;
  onCopy?: (entry: DirectoryEntry) => void;
  onDelete?: (entry: DirectoryEntry) => void;
}

export const FileList: React.FC<FileListProps> = ({
  entries,
  isLoading,
  sortConfig,
  onSortChange,
  isSearching = false,
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
        <div className="empty-icon" aria-hidden="true">
          {isSearching ? '🔍' : '📂'}
        </div>
        <h3>{isSearching ? 'No matching files or folders found' : 'This folder is empty'}</h3>
        <p>
          {isSearching
            ? 'Try checking for typos or searching subfolders.'
            : 'Upload photos, documents, or videos to store them directly on your laptop.'}
        </p>
      </div>
    );
  }

  const renderSortIndicator = (field: SortField) => {
    if (!sortConfig || sortConfig.field !== field) {
      return <span className="sort-indicator" aria-hidden="true">⇅</span>;
    }
    return (
      <span className="sort-indicator" aria-hidden="true">
        {sortConfig.direction === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  const getAriaSort = (field: SortField): 'ascending' | 'descending' | 'none' => {
    if (!sortConfig || sortConfig.field !== field) return 'none';
    return sortConfig.direction === 'asc' ? 'ascending' : 'descending';
  };

  return (
    <div className="file-list-container">
      {/* Mobile Sorting Controls */}
      {onSortChange && sortConfig && (
        <div className="mobile-sort-bar">
          <span>Sort by:</span>
          <select
            className="mobile-sort-select"
            value={`${sortConfig.field}-${sortConfig.direction}`}
            onChange={(e) => {
              const [field] = e.target.value.split('-') as [SortField, string];
              onSortChange(field);
            }}
            aria-label="Sort directory contents"
          >
            <option value="name-asc">Name (A to Z)</option>
            <option value="name-desc">Name (Z to A)</option>
            <option value="size-desc">Size (Largest first)</option>
            <option value="size-asc">Size (Smallest first)</option>
            <option value="date-desc">Modified (Newest first)</option>
            <option value="date-asc">Modified (Oldest first)</option>
            <option value="type-asc">Type (A to Z)</option>
            <option value="type-desc">Type (Z to A)</option>
          </select>
        </div>
      )}

      {/* Desktop Column Header */}
      <div className="file-list-header" role="row">
        <div className="col-name" role="columnheader" aria-sort={getAriaSort('name')}>
          {onSortChange ? (
            <button
              type="button"
              className={`col-sortable ${sortConfig?.field === 'name' ? 'active' : ''}`}
              onClick={() => onSortChange('name')}
              title="Sort by Name"
            >
              <span>Name</span>
              {renderSortIndicator('name')}
            </button>
          ) : (
            <span>Name</span>
          )}
        </div>

        <div className="col-size" role="columnheader" aria-sort={getAriaSort('size')}>
          {onSortChange ? (
            <button
              type="button"
              className={`col-sortable ${sortConfig?.field === 'size' ? 'active' : ''}`}
              onClick={() => onSortChange('size')}
              title="Sort by Size"
            >
              <span>Size</span>
              {renderSortIndicator('size')}
            </button>
          ) : (
            <span>Size</span>
          )}
        </div>

        <div className="col-date" role="columnheader" aria-sort={getAriaSort('date')}>
          {onSortChange ? (
            <button
              type="button"
              className={`col-sortable ${sortConfig?.field === 'date' ? 'active' : ''}`}
              onClick={() => onSortChange('date')}
              title="Sort by Modified Date"
            >
              <span>Modified</span>
              {renderSortIndicator('date')}
            </button>
          ) : (
            <span>Modified</span>
          )}
        </div>

        <div className="col-actions" role="columnheader">
          <span>Actions</span>
        </div>
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
