use crate::error::AppError;
use std::path::{Component, Path, PathBuf};

#[derive(Debug, Clone)]
pub struct PathSandbox {
    canonical_root: PathBuf,
}

impl PathSandbox {
    pub fn new(root: impl AsRef<Path>) -> Result<Self, AppError> {
        let canonical_root = root.as_ref().canonicalize().map_err(|e| {
            AppError::Configuration(format!(
                "Failed to canonicalize sandbox root '{}': {}",
                root.as_ref().display(),
                e
            ))
        })?;

        if !canonical_root.is_dir() {
            return Err(AppError::Configuration(format!(
                "Sandbox root '{}' is not a directory",
                canonical_root.display()
            )));
        }

        Ok(Self { canonical_root })
    }

    pub fn canonical_root(&self) -> &Path {
        &self.canonical_root
    }

    /// Resolves an untrusted relative path string into an absolute path strictly
    /// contained within the sandbox root directory.
    pub fn resolve(&self, relative_path: &str) -> Result<PathBuf, AppError> {
        // Step 1: Reject null bytes and control characters
        if relative_path.chars().any(|c| c == '\0' || (c as u32) < 32) {
            return Err(AppError::InvalidPath(
                "Path contains illegal null or control characters".to_string(),
            ));
        }

        // Normalize backslashes to forward slashes for cross-platform consistency
        let normalized = relative_path.replace('\\', "/");
        let path = Path::new(&normalized);

        // Step 2: Lexical component inspection
        let mut clean_relative = PathBuf::new();
        for component in path.components() {
            match component {
                Component::Normal(c) => {
                    // Disallow single dot or double dot disguised as normal components
                    let s = c.to_string_lossy();
                    if s == ".." || s == "." {
                        return Err(AppError::PathTraversal(
                            "Path traversal detected".to_string(),
                        ));
                    }
                    clean_relative.push(c);
                }
                Component::CurDir => {
                    // Ignore '.'
                }
                Component::ParentDir => {
                    // Reject any '..' sequence
                    return Err(AppError::PathTraversal(
                        "Path traversal segment '..' is prohibited".to_string(),
                    ));
                }
                Component::RootDir | Component::Prefix(_) => {
                    // Reject absolute paths
                    return Err(AppError::InvalidPath(
                        "Absolute paths outside sandbox are prohibited".to_string(),
                    ));
                }
            }
        }

        // Step 3: Combine with canonical root
        let target = self.canonical_root.join(&clean_relative);

        // Step 4: Verify canonical boundary
        if target.exists() {
            let canonical_target = target.canonicalize().map_err(AppError::Io)?;
            if !canonical_target.starts_with(&self.canonical_root) {
                return Err(AppError::PathTraversal(
                    "Resolved path escapes sandbox root".to_string(),
                ));
            }
            Ok(canonical_target)
        } else {
            // For paths that do not yet exist (e.g., upload destination),
            // verify that the parent directory exists and resides within the sandbox.
            if let Some(parent) = target.parent() {
                if parent.exists() {
                    let canonical_parent = parent.canonicalize().map_err(AppError::Io)?;
                    if !canonical_parent.starts_with(&self.canonical_root) {
                        return Err(AppError::PathTraversal(
                            "Parent directory escapes sandbox root".to_string(),
                        ));
                    }
                } else {
                    return Err(AppError::NotFound(
                        "Parent directory does not exist".to_string(),
                    ));
                }
            }
            Ok(target)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_valid_subpath_resolution() {
        let temp = tempdir().unwrap();
        let sandbox = PathSandbox::new(temp.path()).unwrap();

        fs::create_dir(temp.path().join("sub")).unwrap();
        fs::write(temp.path().join("sub").join("file.txt"), b"test").unwrap();

        let resolved = sandbox.resolve("sub/file.txt").unwrap();
        assert!(resolved.exists());
        assert!(resolved.starts_with(sandbox.canonical_root()));
    }

    #[test]
    fn test_root_path_resolution() {
        let temp = tempdir().unwrap();
        let sandbox = PathSandbox::new(temp.path()).unwrap();

        let resolved = sandbox.resolve("").unwrap();
        assert_eq!(resolved, sandbox.canonical_root());

        let resolved_dot = sandbox.resolve(".").unwrap();
        assert_eq!(resolved_dot, sandbox.canonical_root());
    }

    #[test]
    fn test_rejects_parent_traversal() {
        let temp = tempdir().unwrap();
        let sandbox = PathSandbox::new(temp.path()).unwrap();

        assert!(matches!(
            sandbox.resolve("../etc/passwd"),
            Err(AppError::PathTraversal(_))
        ));
        assert!(matches!(
            sandbox.resolve("foo/../../bar"),
            Err(AppError::PathTraversal(_))
        ));
        assert!(matches!(
            sandbox.resolve(".."),
            Err(AppError::PathTraversal(_))
        ));
    }

    #[test]
    fn test_rejects_null_bytes() {
        let temp = tempdir().unwrap();
        let sandbox = PathSandbox::new(temp.path()).unwrap();

        assert!(matches!(
            sandbox.resolve("file\0.txt"),
            Err(AppError::InvalidPath(_))
        ));
    }

    #[test]
    fn test_rejects_absolute_path() {
        let temp = tempdir().unwrap();
        let sandbox = PathSandbox::new(temp.path()).unwrap();

        assert!(matches!(
            sandbox.resolve("/etc/passwd"),
            Err(AppError::InvalidPath(_))
        ));
    }

    #[cfg(unix)]
    #[test]
    fn test_rejects_symlink_pointing_outside() {
        use std::os::unix::fs::symlink;
        let temp = tempdir().unwrap();
        let outside = tempdir().unwrap();
        let sandbox = PathSandbox::new(temp.path()).unwrap();

        let outside_file = outside.path().join("secret.txt");
        fs::write(&outside_file, b"secret").unwrap();

        let inside_link = temp.path().join("evil_link");
        symlink(&outside_file, &inside_link).unwrap();

        // Must fail with PathTraversal
        assert!(matches!(
            sandbox.resolve("evil_link"),
            Err(AppError::PathTraversal(_))
        ));
    }

    #[cfg(unix)]
    #[test]
    fn test_allows_symlink_pointing_inside() {
        use std::os::unix::fs::symlink;
        let temp = tempdir().unwrap();
        let sandbox = PathSandbox::new(temp.path()).unwrap();

        let target_file = temp.path().join("good.txt");
        fs::write(&target_file, b"good").unwrap();

        let inside_link = temp.path().join("good_link");
        symlink(&target_file, &inside_link).unwrap();

        let resolved = sandbox.resolve("good_link").unwrap();
        assert!(resolved.starts_with(sandbox.canonical_root()));
    }
}
