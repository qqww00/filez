import { useState, useEffect, useCallback } from 'react';
import { getAuthStatus, listFiles, login } from '../api/files';
import { ClientError } from '../api/client';
import type { DirectoryListing } from '../types/files';

export function useFiles() {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState<number>(10240);

  const loadDirectory = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await listFiles(path);
      setListing(data);
      setCurrentPath(data.current_path);
      setIsAuthenticated(true);
    } catch (err: unknown) {
      if (err instanceof ClientError) {
        if (err.status === 401) {
          setIsAuthenticated(false);
          setListing(null);
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while loading files.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkInitialAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const status = await getAuthStatus();
      setIsAuthenticated(status.authenticated);
      if (status.max_upload_size_mb) {
        setMaxUploadSizeMb(status.max_upload_size_mb);
      }
      if (status.authenticated) {
        await loadDirectory('');
      } else {
        setIsLoading(false);
      }
    } catch {
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, [loadDirectory]);

  useEffect(() => {
    checkInitialAuth();
  }, [checkInitialAuth]);

  const handleLogin = async (passphrase: string) => {
    const res = await login(passphrase);
    setIsAuthenticated(true);
    if (res.max_upload_size_mb) {
      setMaxUploadSizeMb(res.max_upload_size_mb);
    }
    await loadDirectory('');
  };

  const navigateTo = (path: string) => {
    loadDirectory(path);
  };

  const refreshFiles = () => {
    loadDirectory(currentPath);
  };

  return {
    currentPath,
    listing,
    isLoading,
    error,
    isAuthenticated,
    maxUploadSizeMb,
    handleLogin,
    navigateTo,
    refreshFiles,
  };
}
