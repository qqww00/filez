import React, { useState } from 'react';

interface CopyDialogProps {
  sourcePath: string;
  filename: string;
  currentDir: string;
  onConfirm: (destinationPath: string, overwrite: boolean) => Promise<void>;
  onCancel: () => void;
}

export const CopyDialog: React.FC<CopyDialogProps> = ({
  filename,
  currentDir,
  onConfirm,
  onCancel,
}) => {
  const [destPath, setDestPath] = useState(currentDir);
  const [overwrite, setOverwrite] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirm(destPath.trim(), overwrite);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="copy-dialog-title">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-badge">📋 Duplicate File</div>
          <h2 id="copy-dialog-title">Copy File</h2>
          <p>
            Copy <strong>{filename}</strong> to another destination folder within your shared storage.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="copy-form">
          <div className="form-group">
            <label htmlFor="dest-input">Destination Folder (relative to root)</label>
            <input
              id="dest-input"
              type="text"
              value={destPath}
              onChange={(e) => setDestPath(e.target.value)}
              placeholder="e.g. photos or docs (leave empty for root)"
              className="passphrase-input"
              disabled={isSubmitting}
            />
          </div>

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                disabled={isSubmitting}
              />
              <span> Overwrite file if it already exists</span>
            </label>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Copying...' : 'Copy File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
