import type { DirectoryEntry, SortConfig } from '../types/files';

/**
 * Extracts file extension in lowercase for sorting by type.
 * Returns empty string for directories.
 */
export function getFileExtension(filename: string, isDir: boolean): string {
  if (isDir) return '';
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0 || lastDot === filename.length - 1) {
    return '';
  }
  return filename.substring(lastDot + 1).toLowerCase();
}

/**
 * Compares two directory entries based on SortConfig.
 * Follows folders-first grouping (if enabled), primary attribute comparison,
 * and stable case-insensitive name tie-breaking.
 */
export function compareEntries(
  a: DirectoryEntry,
  b: DirectoryEntry,
  config: SortConfig
): number {
  // Folders-first grouping
  if (config.foldersFirst) {
    if (a.is_dir && !b.is_dir) return -1;
    if (!a.is_dir && b.is_dir) return 1;
  }

  const multiplier = config.direction === 'asc' ? 1 : -1;
  let primaryDiff = 0;

  switch (config.field) {
    case 'name':
      primaryDiff = a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      break;

    case 'size':
      primaryDiff = a.size_bytes - b.size_bytes;
      break;

    case 'date': {
      const dateA = new Date(a.modified_at).getTime() || 0;
      const dateB = new Date(b.modified_at).getTime() || 0;
      primaryDiff = dateA - dateB;
      break;
    }

    case 'type': {
      const extA = getFileExtension(a.name, a.is_dir);
      const extB = getFileExtension(b.name, b.is_dir);
      primaryDiff = extA.localeCompare(extB, undefined, {
        sensitivity: 'base',
      });
      break;
    }

    default:
      primaryDiff = 0;
  }

  if (primaryDiff !== 0) {
    return primaryDiff * multiplier;
  }

  // Stable secondary tie-breaker: always ascending by name
  return a.name.localeCompare(b.name, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/**
 * Returns a new sorted array of entries according to SortConfig.
 */
export function sortEntries(
  entries: DirectoryEntry[],
  config: SortConfig
): DirectoryEntry[] {
  return [...entries].sort((a, b) => compareEntries(a, b, config));
}
