import React, { useState, useRef, useCallback } from 'react';

interface DropZoneOverlayProps {
  onFilesDropped: (files: File[]) => void;
  targetFolder?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export const DropZoneOverlay: React.FC<DropZoneOverlayProps> = ({
  onFilesDropped,
  targetFolder,
  disabled = false,
  children,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounterRef = useRef<number>(0);

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled) return;

      dragCounterRef.current += 1;

      // Only show overlay if dragging actual files
      if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
        setIsDraggingOver(true);
      }
    },
    [disabled]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled) return;

      e.dataTransfer.dropEffect = 'copy';
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounterRef.current -= 1;

      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsDraggingOver(false);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounterRef.current = 0;
      setIsDraggingOver(false);

      if (disabled) return;

      const droppedFiles = e.dataTransfer.files;
      if (!droppedFiles || droppedFiles.length === 0) return;

      const filesArray = Array.from(droppedFiles);
      onFilesDropped(filesArray);
    },
    [disabled, onFilesDropped]
  );

  const folderName = targetFolder ? targetFolder.split('/').pop() || targetFolder : 'Root folder';

  return (
    <div
      className="dropzone-container"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingOver && (
        <div className="dropzone-overlay" aria-hidden="true">
          <span className="dropzone-icon">📤</span>
          <span className="dropzone-title">Drop files to upload</span>
          <span className="dropzone-subtitle">
            Files will be stored directly into <strong>{folderName}</strong>
          </span>
        </div>
      )}
      {children}
    </div>
  );
};
