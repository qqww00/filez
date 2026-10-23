import React from 'react';

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onClear: () => void;
  isRecursive: boolean;
  onToggleRecursive: () => void;
  onSearchSubmit?: () => void;
  isSearchingBackend?: boolean;
  totalMatches?: number;
  isFiltering?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onQueryChange,
  onClear,
  isRecursive,
  onToggleRecursive,
  onSearchSubmit,
  isSearchingBackend = false,
  totalMatches,
  isFiltering = false,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearchSubmit) {
      e.preventDefault();
      onSearchSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClear();
    }
  };

  return (
    <div className="search-bar-container">
      <div className="search-input-wrapper">
        <span className="search-input-icon" aria-hidden="true">
          🔍
        </span>
        <input
          type="text"
          className="search-input"
          placeholder={
            isRecursive
              ? 'Search all subfolders (press Enter)...'
              : 'Filter files in this folder...'
          }
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Search files and folders"
        />
        {query && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={onClear}
            title="Clear search (Esc)"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <div className="search-controls">
        <button
          type="button"
          className={`search-recursive-btn ${isRecursive ? 'active' : ''}`}
          onClick={onToggleRecursive}
          title={
            isRecursive
              ? 'Deep search active: searching all nested subfolders'
              : 'Switch to deep search to find files in all nested folders'
          }
          aria-pressed={isRecursive}
        >
          <span aria-hidden="true">{isRecursive ? '📂 ➔ 🌲' : '📂'}</span>
          <span>{isRecursive ? 'Subfolders: ON' : 'Subfolders: OFF'}</span>
        </button>

        {isSearchingBackend ? (
          <span className="search-status-bar" role="status">
            <span>Searching subfolders...</span>
          </span>
        ) : isFiltering && totalMatches !== undefined ? (
          <span className="search-status-bar" role="status">
            <span>
              {totalMatches} {totalMatches === 1 ? 'match' : 'matches'} found
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
};
