import React, { useState } from 'react';

interface ConfirmDeleteDialogProps {
  filename: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  filename,
  onConfirm,
  onCancel,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-badge danger">⚠️ Permanent Deletion</div>
          <h2 id="delete-dialog-title">Delete File</h2>
          <p>
            Are you sure you want to permanently delete <strong>{filename}</strong>? This action cannot be undone.
          </p>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete File'}
          </button>
        </div>
      </div>
    </div>
  );
};
