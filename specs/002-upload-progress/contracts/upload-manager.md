# Contract: Client Upload Manager & UI State

**Feature**: `002-upload-progress`
**Component Layer**: React Hooks & UI Component Tree

---

## 1. Upload Manager Hook Interface

```typescript
export interface UseUploadManagerReturn {
  // Active state
  activeBatch: UploadBatch | null;
  isUploading: boolean;
  isDrawerOpen: boolean;
  isDrawerMinimized: boolean;

  // Actions
  enqueueFiles: (files: File[], targetDirectory: string) => Promise<void>;
  cancelItem: (itemId: string) => void;
  cancelAll: () => void;
  toggleDrawer: () => void;
  minimizeDrawer: () => void;
  clearCompleted: () => void;
}
```

---

## 2. UI Component Contract

### `UploadProgressDrawer`
- **Location**: Anchored fixed to bottom-right (`bottom: 1.5rem; right: 1.5rem; z-index: 9999;`) on desktop; full-width bottom tray on mobile (`width: 100%; bottom: 0; left: 0`).
- **Aria attributes**:
  - `role="region"`
  - `aria-label="File upload progress"`
  - Progress bar with `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`.
- **States**:
  - `Hidden`: When no files are queued and drawer is cleared.
  - `Minimized`: Slim floating bar showing aggregate badge: e.g., `⚡ Uploading 2/5 (45%) • 14s remaining [Expand] [Cancel All]`.
  - `Expanded`: Full drawer showing overall progress bar plus scrollable list of individual file items with status badges, speed, ETA, and per-item cancel button.
