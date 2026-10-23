use crate::{error::AppError, fs::PathSandbox};
use axum::extract::multipart::Field;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::io::AsyncWriteExt;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DirectoryEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size_bytes: u64,
    pub modified_at: String,
    pub is_symlink: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Breadcrumb {
    pub name: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DirectoryListing {
    pub current_path: String,
    pub breadcrumbs: Vec<Breadcrumb>,
    pub entries: Vec<DirectoryEntry>,
    pub total_files: usize,
    pub total_dirs: usize,
}

/// Lists the contents of a directory within the sandbox, returning metadata and breadcrumbs.
pub fn list_directory(
    sandbox: &PathSandbox,
    relative_path: &str,
) -> Result<DirectoryListing, AppError> {
    let resolved = sandbox.resolve(relative_path)?;

    if !resolved.exists() {
        return Err(AppError::NotFound(format!(
            "Directory '{}' does not exist",
            relative_path
        )));
    }

    if !resolved.is_dir() {
        return Err(AppError::InvalidPath(format!(
            "Path '{}' is not a directory",
            relative_path
        )));
    }

    let normalized_rel = relative_path.trim_matches('/').replace('\\', "/");
    let breadcrumbs = build_breadcrumbs(&normalized_rel);

    let mut entries = Vec::new();
    let mut total_files = 0;
    let mut total_dirs = 0;

    for entry_res in fs::read_dir(&resolved)? {
        let entry = entry_res?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        // Skip internal temporary scratch files
        if file_name.starts_with(".filez_tmp_") {
            continue;
        }

        let child_rel_path = if normalized_rel.is_empty() {
            file_name.clone()
        } else {
            format!("{}/{}", normalized_rel, file_name)
        };

        let symlink_meta = entry.metadata()?;
        let is_symlink = symlink_meta.file_type().is_symlink();

        // Check if symlink target is within sandbox; if it escapes, hide it from directory listing
        if is_symlink && sandbox.resolve(&child_rel_path).is_err() {
            continue;
        }

        let is_dir = symlink_meta.is_dir();
        let size_bytes = if is_dir { 0 } else { symlink_meta.len() };
        let modified_at = format_system_time(symlink_meta.modified().unwrap_or(UNIX_EPOCH));

        if is_dir {
            total_dirs += 1;
        } else {
            total_files += 1;
        }

        entries.push(DirectoryEntry {
            name: file_name,
            path: child_rel_path,
            is_dir,
            size_bytes,
            modified_at,
            is_symlink,
        });
    }

    // Sort: directories first, then alphabetical by name
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(DirectoryListing {
        current_path: normalized_rel,
        breadcrumbs,
        entries,
        total_files,
        total_dirs,
    })
}

/// Validates that a candidate filename is safe (no path separators, no null bytes, not empty or dots).
pub fn validate_filename(name: &str) -> Result<(), AppError> {
    if name.is_empty() || name == "." || name == ".." {
        return Err(AppError::InvalidPath("Invalid filename".to_string()));
    }

    if name.contains('/') || name.contains('\\') {
        return Err(AppError::InvalidPath(
            "Filename cannot contain path separators".to_string(),
        ));
    }

    if name.chars().any(|c| c == '\0' || (c as u32) < 32) {
        return Err(AppError::InvalidPath(
            "Filename contains invalid control characters".to_string(),
        ));
    }

    Ok(())
}

/// Atomically saves a multipart field stream into the target directory within the sandbox.
pub async fn save_field_atomic(
    sandbox: &PathSandbox,
    target_dir_rel: &str,
    filename: &str,
    mut field: Field<'_>,
    max_size_bytes: usize,
    overwrite: bool,
) -> Result<u64, AppError> {
    validate_filename(filename)?;

    let target_dir = sandbox.resolve(target_dir_rel)?;
    if !target_dir.is_dir() {
        return Err(AppError::InvalidPath(
            "Target is not a directory".to_string(),
        ));
    }

    let final_dest = target_dir.join(filename);
    if final_dest.exists() && !overwrite {
        return Err(AppError::Conflict(format!(
            "File '{}' already exists in target directory",
            filename
        )));
    }

    let temp_name = format!(".filez_tmp_{}", uuid::Uuid::new_v4());
    let temp_path = target_dir.join(&temp_name);

    let mut temp_file = tokio::fs::File::create(&temp_path)
        .await
        .map_err(AppError::Io)?;
    let mut total_bytes = 0usize;

    while let Some(chunk) = field.chunk().await.map_err(|e| {
        if e.status() == axum::http::StatusCode::PAYLOAD_TOO_LARGE {
            AppError::PayloadTooLarge(format!(
                "File '{}' exceeds maximum allowed size of {} MB",
                filename,
                max_size_bytes / (1024 * 1024)
            ))
        } else {
            AppError::InvalidPath(format!("Error reading upload stream: {}", e))
        }
    })? {
        total_bytes += chunk.len();
        if total_bytes > max_size_bytes {
            let _ = tokio::fs::remove_file(&temp_path).await;
            return Err(AppError::PayloadTooLarge(format!(
                "File '{}' exceeds maximum allowed size of {} MB",
                filename,
                max_size_bytes / (1024 * 1024)
            )));
        }

        if let Err(e) = temp_file.write_all(&chunk).await {
            let _ = tokio::fs::remove_file(&temp_path).await;
            return Err(AppError::Io(e));
        }
    }

    if let Err(e) = temp_file.flush().await {
        let _ = tokio::fs::remove_file(&temp_path).await;
        return Err(AppError::Io(e));
    }
    drop(temp_file);

    // Atomically rename temporary scratch file into final destination
    if let Err(e) = tokio::fs::rename(&temp_path, &final_dest).await {
        let _ = tokio::fs::remove_file(&temp_path).await;
        return Err(AppError::Io(e));
    }

    Ok(total_bytes as u64)
}

/// Atomically saves in-memory bytes into target directory (used for testing and small payloads).
pub async fn save_bytes_atomic(
    sandbox: &PathSandbox,
    target_dir_rel: &str,
    filename: &str,
    data: &[u8],
    max_size_bytes: usize,
    overwrite: bool,
) -> Result<u64, AppError> {
    validate_filename(filename)?;

    if data.len() > max_size_bytes {
        return Err(AppError::PayloadTooLarge(format!(
            "File '{}' exceeds maximum allowed size",
            filename
        )));
    }

    let target_dir = sandbox.resolve(target_dir_rel)?;
    if !target_dir.is_dir() {
        return Err(AppError::InvalidPath(
            "Target is not a directory".to_string(),
        ));
    }

    let final_dest = target_dir.join(filename);
    if final_dest.exists() && !overwrite {
        return Err(AppError::Conflict(format!(
            "File '{}' already exists in target directory",
            filename
        )));
    }

    let temp_name = format!(".filez_tmp_{}", uuid::Uuid::new_v4());
    let temp_path = target_dir.join(&temp_name);

    tokio::fs::write(&temp_path, data)
        .await
        .map_err(AppError::Io)?;
    tokio::fs::rename(&temp_path, &final_dest)
        .await
        .map_err(AppError::Io)?;

    Ok(data.len() as u64)
}

/// Deletes a regular file inside the sandbox.
pub fn delete_file(sandbox: &PathSandbox, relative_path: &str) -> Result<(), AppError> {
    let resolved = sandbox.resolve(relative_path)?;

    if !resolved.exists() {
        return Err(AppError::NotFound(format!(
            "File '{}' not found",
            relative_path
        )));
    }

    if resolved.is_dir() {
        return Err(AppError::InvalidPath(
            "Cannot delete directory via file delete".to_string(),
        ));
    }

    fs::remove_file(&resolved).map_err(AppError::Io)?;
    Ok(())
}

/// Copies a file to another location inside the sandbox with overwrite protection.
pub fn copy_file(
    sandbox: &PathSandbox,
    source_rel: &str,
    dest_rel: &str,
    overwrite: bool,
) -> Result<PathBuf, AppError> {
    let source_resolved = sandbox.resolve(source_rel)?;

    if !source_resolved.exists() || !source_resolved.is_file() {
        return Err(AppError::NotFound(format!(
            "Source file '{}' not found",
            source_rel
        )));
    }

    let filename = source_resolved
        .file_name()
        .ok_or_else(|| AppError::InvalidPath("Invalid source filename".to_string()))?;

    let dest_resolved = sandbox.resolve(dest_rel)?;

    let target_file = if dest_resolved.is_dir() {
        dest_resolved.join(filename)
    } else {
        dest_resolved
    };

    if !target_file.starts_with(sandbox.canonical_root()) {
        return Err(AppError::PathTraversal(
            "Destination path escapes sandbox root".to_string(),
        ));
    }

    if target_file == source_resolved {
        return Err(AppError::InvalidPath(
            "Cannot copy file onto itself".to_string(),
        ));
    }

    if target_file.exists() && !overwrite {
        return Err(AppError::Conflict(
            "Destination file already exists".to_string(),
        ));
    }

    fs::copy(&source_resolved, &target_file).map_err(AppError::Io)?;
    Ok(target_file)
}

fn build_breadcrumbs(relative_path: &str) -> Vec<Breadcrumb> {
    let mut breadcrumbs = vec![Breadcrumb {
        name: "Root".to_string(),
        path: "".to_string(),
    }];

    if relative_path.is_empty() {
        return breadcrumbs;
    }

    let mut accumulated = String::new();
    for segment in relative_path.split('/') {
        if segment.is_empty() {
            continue;
        }
        if !accumulated.is_empty() {
            accumulated.push('/');
        }
        accumulated.push_str(segment);

        breadcrumbs.push(Breadcrumb {
            name: segment.to_string(),
            path: accumulated.clone(),
        });
    }

    breadcrumbs
}

fn format_system_time(time: SystemTime) -> String {
    let duration = time.duration_since(UNIX_EPOCH).unwrap_or_default();
    let secs = duration.as_secs();

    let days = secs / 86400;
    let rem_secs = secs % 86400;
    let hours = rem_secs / 3600;
    let minutes = (rem_secs % 3600) / 60;
    let seconds = rem_secs % 60;

    let mut y = 1970;
    let mut d = days;

    loop {
        let leap = (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0);
        let days_in_year = if leap { 366 } else { 365 };
        if d < days_in_year {
            break;
        }
        d -= days_in_year;
        y += 1;
    }

    let leap = (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0);
    let days_in_months = [
        31,
        if leap { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];

    let mut m = 0;
    for (idx, &dim) in days_in_months.iter().enumerate() {
        if d < dim {
            m = idx + 1;
            break;
        }
        d -= dim;
    }
    let day = d + 1;

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        y, m, day, hours, minutes, seconds
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_list_directory_sorting_and_counts() {
        let temp = tempdir().unwrap();
        let sandbox = PathSandbox::new(temp.path()).unwrap();

        fs::create_dir(temp.path().join("zeta_folder")).unwrap();
        fs::create_dir(temp.path().join("alpha_folder")).unwrap();
        fs::write(temp.path().join("beta_file.txt"), b"12345").unwrap();
        fs::write(temp.path().join("a_file.txt"), b"123").unwrap();

        let listing = list_directory(&sandbox, "").unwrap();

        assert_eq!(listing.total_dirs, 2);
        assert_eq!(listing.total_files, 2);
        assert_eq!(listing.entries.len(), 4);

        assert_eq!(listing.entries[0].name, "alpha_folder");
        assert!(listing.entries[0].is_dir);
        assert_eq!(listing.entries[1].name, "zeta_folder");
        assert!(listing.entries[1].is_dir);

        assert_eq!(listing.entries[2].name, "a_file.txt");
        assert!(!listing.entries[2].is_dir);
        assert_eq!(listing.entries[2].size_bytes, 3);
        assert_eq!(listing.entries[3].name, "beta_file.txt");
        assert_eq!(listing.entries[3].size_bytes, 5);
    }

    #[test]
    fn test_breadcrumbs_generation() {
        let breadcrumbs = build_breadcrumbs("docs/2026/reports");
        assert_eq!(breadcrumbs.len(), 4);
        assert_eq!(breadcrumbs[0].name, "Root");
        assert_eq!(breadcrumbs[0].path, "");
        assert_eq!(breadcrumbs[1].name, "docs");
        assert_eq!(breadcrumbs[1].path, "docs");
        assert_eq!(breadcrumbs[2].name, "2026");
        assert_eq!(breadcrumbs[2].path, "docs/2026");
        assert_eq!(breadcrumbs[3].name, "reports");
        assert_eq!(breadcrumbs[3].path, "docs/2026/reports");
    }

    #[tokio::test]
    async fn test_save_bytes_atomic_and_overwrite() {
        let temp = tempdir().unwrap();
        let sandbox = PathSandbox::new(temp.path()).unwrap();

        // 1. Initial write
        let bytes_written = save_bytes_atomic(&sandbox, "", "test.txt", b"hello", 100, false)
            .await
            .unwrap();
        assert_eq!(bytes_written, 5);
        assert_eq!(fs::read(temp.path().join("test.txt")).unwrap(), b"hello");

        // 2. Overwrite prevented
        let conflict = save_bytes_atomic(&sandbox, "", "test.txt", b"world", 100, false).await;
        assert!(matches!(conflict, Err(AppError::Conflict(_))));

        // 3. Overwrite allowed
        save_bytes_atomic(&sandbox, "", "test.txt", b"world", 100, true)
            .await
            .unwrap();
        assert_eq!(fs::read(temp.path().join("test.txt")).unwrap(), b"world");

        // 4. Size limit exceeded
        let too_large = save_bytes_atomic(&sandbox, "", "large.txt", b"1234567890", 5, false).await;
        assert!(matches!(too_large, Err(AppError::PayloadTooLarge(_))));
    }

    #[test]
    fn test_delete_file() {
        let temp = tempdir().unwrap();
        let sandbox = PathSandbox::new(temp.path()).unwrap();

        let file_path = temp.path().join("delete_me.txt");
        fs::write(&file_path, b"temp").unwrap();

        delete_file(&sandbox, "delete_me.txt").unwrap();
        assert!(!file_path.exists());

        // Deleting non-existent returns NotFound
        assert!(matches!(
            delete_file(&sandbox, "delete_me.txt"),
            Err(AppError::NotFound(_))
        ));
    }

    #[test]
    fn test_copy_file() {
        let temp = tempdir().unwrap();
        let sandbox = PathSandbox::new(temp.path()).unwrap();

        fs::create_dir(temp.path().join("dest")).unwrap();
        fs::write(temp.path().join("src.txt"), b"data to copy").unwrap();

        copy_file(&sandbox, "src.txt", "dest", false).unwrap();

        assert_eq!(
            fs::read(temp.path().join("dest").join("src.txt")).unwrap(),
            b"data to copy"
        );

        // Conflict when copying again without overwrite
        assert!(matches!(
            copy_file(&sandbox, "src.txt", "dest", false),
            Err(AppError::Conflict(_))
        ));

        // Overwrite permitted
        copy_file(&sandbox, "src.txt", "dest", true).unwrap();
    }
}
