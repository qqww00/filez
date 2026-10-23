import React, { useRef } from 'react';

interface UploadButtonProps {
  onUpload: (files: File[]) => void | Promise<void>;
  disabled?: boolean;
  isUploading?: boolean;
}

export const UploadButton: React.FC<UploadButtonProps> = ({
  onUpload,
  disabled = false,
  isUploading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const filesArray = Array.from(selectedFiles);
    // Reset file input value so re-selecting identical files works
    e.target.value = '';
    onUpload(filesArray);
  };

  return (
    <div className="upload-btn-container">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled}
        aria-label="Upload files input"
      />

      <button
        type="button"
        className="btn btn-primary btn-upload"
        onClick={handleClick}
        disabled={disabled}
        title="Upload files from this device"
      >
        <span aria-hidden="true">⬆️</span>
        <span>{isUploading ? 'Upload More' : 'Upload'}</span>
      </button>
    </div>
  );
};
