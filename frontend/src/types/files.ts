export interface DirectoryEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size_bytes: number;
  modified_at: string;
  is_symlink: boolean;
}

export interface Breadcrumb {
  name: string;
  path: string;
}

export interface DirectoryListing {
  current_path: string;
  breadcrumbs: Breadcrumb[];
  entries: DirectoryEntry[];
  total_files: number;
  total_dirs: number;
}

export interface CopyFileRequest {
  source_path: string;
  destination_path: string;
  overwrite?: boolean;
}

export interface UploadedFileSummary {
  name: string;
  path: string;
  size_bytes: number;
}

export interface FailedFileSummary {
  name: string;
  error: string;
}

export interface UploadResult {
  uploaded: UploadedFileSummary[];
  failures: FailedFileSummary[];
}

export interface ApiError {
  code: string;
  message: string;
}

export interface AuthStatus {
  authenticated: boolean;
  max_upload_size_mb?: number;
}
