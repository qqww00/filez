import { useState, useMemo, useCallback, useEffect } from 'react';
import type {
  DirectoryEntry,
  SearchResultEntry,
  SortConfig,
  SortDirection,
  SortField,
} from '../types/files';
import { sortEntries } from '../utils/sorting';

const STORAGE_KEY = 'filez_sort_config';

const DEFAULT_SORT_CONFIG: SortConfig = {
  field: 'name',
  direction: 'asc',
  foldersFirst: true,
};

function loadStoredSortConfig(): SortConfig {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === 'object' &&
        ['name', 'size', 'date', 'type'].includes(parsed.field) &&
        ['asc', 'desc'].includes(parsed.direction)
      ) {
        return {
          field: parsed.field,
          direction: parsed.direction,
          foldersFirst: parsed.foldersFirst ?? true,
        };
      }
    }
  } catch {
    // Fallback to default on storage errors
  }
  return DEFAULT_SORT_CONFIG;
}

export interface UseFileSortAndFilterOptions {
  entries: DirectoryEntry[];
  initialSortField?: SortField;
  initialSortDirection?: SortDirection;
  initialFoldersFirst?: boolean;
}

export function useFileSortAndFilter(options: UseFileSortAndFilterOptions) {
  const {
    entries,
    initialSortField,
    initialSortDirection,
    initialFoldersFirst,
  } = options;

  const [sortConfig, setSortConfigState] = useState<SortConfig>(() => {
    const stored = loadStoredSortConfig();
    return {
      field: initialSortField ?? stored.field,
      direction: initialSortDirection ?? stored.direction,
      foldersFirst: initialFoldersFirst ?? stored.foldersFirst,
    };
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRecursive, setIsRecursive] = useState<boolean>(false);
  const [backendResults, setBackendResults] = useState<SearchResultEntry[] | null>(null);
  const [isSearchingBackend, setIsSearchingBackend] = useState<boolean>(false);

  // Persist sort config changes to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sortConfig));
    } catch {
      // Ignore sessionStorage quota or access errors
    }
  }, [sortConfig]);

  const setSortField = useCallback((field: SortField) => {
    setSortConfigState((prev) => {
      if (prev.field === field) {
        return {
          ...prev,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      const defaultDirection: SortDirection =
        field === 'size' || field === 'date' ? 'desc' : 'asc';
      return {
        ...prev,
        field,
        direction: defaultDirection,
      };
    });
  }, []);

  const toggleSortDirection = useCallback(() => {
    setSortConfigState((prev) => ({
      ...prev,
      direction: prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setBackendResults(null);
  }, []);

  const toggleRecursive = useCallback(() => {
    setIsRecursive((prev) => {
      const next = !prev;
      if (!next) {
        // Turning off recursive search clears backend results
        setBackendResults(null);
      }
      return next;
    });
  }, []);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const isFiltering = trimmedQuery.length > 0 || backendResults !== null;

  const filteredAndSortedEntries = useMemo(() => {
    // If backend recursive results are present, sort those
    if (backendResults !== null) {
      return sortEntries(backendResults, sortConfig);
    }

    // Otherwise filter current directory entries
    const matching = trimmedQuery.length > 0
      ? entries.filter((entry) =>
          entry.name.toLowerCase().includes(trimmedQuery)
        )
      : entries;

    return sortEntries(matching, sortConfig);
  }, [backendResults, entries, trimmedQuery, sortConfig]);

  return {
    // Filter state
    searchQuery,
    setSearchQuery,
    clearSearch,
    isFiltering,
    isRecursive,
    setIsRecursive,
    toggleRecursive,
    backendResults,
    setBackendResults,
    isSearchingBackend,
    setIsSearchingBackend,

    // Sort state
    sortConfig,
    setSortField,
    toggleSortDirection,
    setSortConfig: setSortConfigState,

    // Processed entries
    filteredAndSortedEntries,
    totalMatches: filteredAndSortedEntries.length,
    totalOriginal: entries.length,
  };
}
