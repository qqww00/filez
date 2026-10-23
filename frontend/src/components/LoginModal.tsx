import React, { useState } from 'react';

interface LoginModalProps {
  onLogin: (passphrase: string) => Promise<void>;
  error?: string | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin, error }) => {
  const [passphrase, setPassphrase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) return;

    setIsSubmitting(true);
    setLocalError(null);

    try {
      await onLogin(passphrase.trim());
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLocalError(err.message);
      } else {
        setLocalError('Authentication failed. Check your passphrase.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedError = localError || error;

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-badge">🔒 Secure Storage</div>
          <h2>Authentication Required</h2>
          <p>Enter the passphrase or PIN shown on your laptop terminal to access your files.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="passphrase-input">Passphrase or PIN</label>
            <input
              id="passphrase-input"
              type="password"
              inputMode="text"
              autoComplete="current-password"
              autoFocus
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="e.g. 492817"
              disabled={isSubmitting}
              className="passphrase-input"
            />
          </div>

          {displayedError && (
            <div className="alert-box error" role="alert">
              ⚠️ {displayedError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !passphrase.trim()}
            className="btn btn-primary btn-block"
          >
            {isSubmitting ? 'Authenticating...' : 'Unlock Files'}
          </button>
        </form>
      </div>
    </div>
  );
};
