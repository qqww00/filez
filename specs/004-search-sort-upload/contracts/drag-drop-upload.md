# Contract: Drag-and-Drop Batch Ingestion

**Layer**: Frontend UI Component / Interaction Manager
**Target**: `frontend/src/components/DropZoneOverlay.tsx` and `FileManagerPage.tsx`

---

## 1. Interaction Contract

```typescript
export interface DragDropHandlerProps {
  onFilesDropped: (files: File[]) => void;
  disabled?: boolean;
  children: React.ReactNode;
}
```

---

## 2. Event Lifecycle

```text
User drags file over window
         |
         v
[ dragenter fired on container ]
         |
    Increment dragCounter
    If dragCounter === 1: set isDraggingOver = true
         |
         v
[ dragover fired ]
    e.preventDefault()  <-- Prevents browser opening the file as URL
    e.dataTransfer.dropEffect = 'copy'
         |
         +--------------------------------------+
         |                                      |
         v                                      v
  User leaves window                     User drops files
         |                                      |
[ dragleave fired ]                     [ drop fired ]
    Decrement dragCounter                   e.preventDefault()
    If dragCounter === 0:                   Reset dragCounter = 0
       set isDraggingOver = false           set isDraggingOver = false
                                            Extract e.dataTransfer.files
                                            Filter files (File objects only)
                                            Call onFilesDropped(validFiles)
```

---

## 3. Visual & Usability Guarantees

1. **Anti-Flicker Protection**:
   - Tracking `dragCounter` ensures that moving the mouse across nested DOM children inside the file list does not trigger false `dragleave` states.
2. **Visual Overlay**:
   - A semi-transparent overlay appears with a dashed outline and icon when `isDraggingOver` is `true`.
   - Displays clear text: *"Drop files here to upload to [current directory]"*.
3. **Queue Integration**:
   - Extracted files are passed to `handleUpload(files)` in `FileManagerPage.tsx`, which validates per-file size limits and forwards them to `enqueueFiles()` in `useUploadManager`.
