# Contract: Sort & Filter Client Interface

**Layer**: Frontend Hook / Utility Module
**Target**: `frontend/src/hooks/useFileSortAndFilter.ts`

---

## 1. Interface Definition

```typescript
export type SortField = 'name' | 'size' | 'date' | 'type';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
  foldersFirst: boolean;
}

export interface UseFileSortAndFilterOptions {
  entries: DirectoryEntry[];
  initialSortField?: SortField;
  initialSortDirection?: SortDirection;
  initialFoldersFirst?: boolean;
}

export interface UseFileSortAndFilterResult {
  // Filter state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  isFiltering: boolean;

  // Sort state
  sortConfig: SortConfig;
  setSortField: (field: SortField) => void;
  toggleSortDirection: () => void;
  setSortConfig: (config: SortConfig) => void;

  // Processed entries
  filteredAndSortedEntries: DirectoryEntry[];
  totalMatches: number;
  totalOriginal: number;
}
```

---

## 2. Behavioral Rules & Guarantees

### Sorting Precedence
1. **Folders-First**: When `foldersFirst` is `true`, all entries where `is_dir === true` are grouped before entries where `is_dir === false`.
2. **Sort Attributes**:
   - `'name'`: Standard natural/case-insensitive alphabetical order (`localeCompare(..., undefined, { numeric: true, sensitivity: 'base' })`).
   - `'size'`: Numerical comparison of `size_bytes`. (For directories where `size_bytes === 0`, sub-sorted by name).
   - `'date'`: Comparison of ISO timestamps (`modified_at`).
   - `'type'`: Comparison of file extension (extracted from name). Directories are treated as type `""` or `"folder"`.
3. **Direction**:
   - `asc`: Ascending order (A-Z, 0-9, oldest first).
   - `desc`: Descending order (Z-A, 9-0, newest first).
4. **Stable Secondary Sort**:
   - If two items have equal values for the primary sort attribute, the tie-breaker is always case-insensitive `name` in ascending order.

### Filtering Rules
1. Substring matching is case-insensitive: `entry.name.toLowerCase().includes(query.trim().toLowerCase())`.
2. When `searchQuery` is empty or only whitespace, `isFiltering` is `false`, and all entries are passed to the sorter.
3. When `searchQuery` matches zero entries, `filteredAndSortedEntries` is `[]`, and `totalMatches` is `0`.
