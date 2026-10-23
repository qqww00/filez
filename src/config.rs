use crate::error::AppError;
use clap::Parser;
use std::path::{Path, PathBuf};

#[derive(Parser, Debug, Clone)]
#[command(name = "filez", about = "Local network file manager")]
pub struct CliArgs {
    /// Root directory to expose
    #[arg(long, env = "FILEZ_ROOT", default_value = ".")]
    pub root: PathBuf,

    /// Bind host IP address
    #[arg(long, env = "FILEZ_HOST", default_value = "127.0.0.1")]
    pub host: String,

    /// Bind HTTP port
    #[arg(long, env = "FILEZ_PORT", default_value_t = 3000)]
    pub port: u16,

    /// Maximum upload file size in megabytes (default: 10240 MB = 10 GB)
    #[arg(long, env = "FILEZ_MAX_UPLOAD_MB", default_value_t = 10240)]
    pub max_upload_mb: usize,

    /// Pre-shared passphrase or PIN for access
    #[arg(long, env = "FILEZ_PASSPHRASE")]
    pub passphrase: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ServerConfig {
    pub root_dir: PathBuf,
    pub host: String,
    pub port: u16,
    pub max_upload_size_bytes: usize,
    pub passphrase: String,
    pub is_generated_passphrase: bool,
}

impl ServerConfig {
    pub fn from_args(args: CliArgs) -> Result<Self, AppError> {
        let root_dir = Self::validate_root_dir(&args.root)?;
        let max_upload_size_bytes = args.max_upload_mb * 1024 * 1024;

        let (passphrase, is_generated_passphrase) = match args.passphrase {
            Some(p) if !p.trim().is_empty() => (p.trim().to_string(), false),
            _ => (Self::generate_pin(), true),
        };

        Ok(Self {
            root_dir,
            host: args.host,
            port: args.port,
            max_upload_size_bytes,
            passphrase,
            is_generated_passphrase,
        })
    }

    pub fn validate_root_dir(path: &Path) -> Result<PathBuf, AppError> {
        let canonical = path.canonicalize().map_err(|e| {
            AppError::Configuration(format!(
                "Failed to canonicalize root directory '{}': {}",
                path.display(),
                e
            ))
        })?;

        if !canonical.is_dir() {
            return Err(AppError::Configuration(format!(
                "Specified root path '{}' is not a directory",
                canonical.display()
            )));
        }

        Ok(canonical)
    }

    fn generate_pin() -> String {
        use std::time::{SystemTime, UNIX_EPOCH};
        // Simple deterministic random fallback based on system time and process ID
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let pid = std::process::id() as u128;
        let num = ((now ^ (pid << 16)) % 900000) + 100000;
        format!("{:06}", num)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_valid_root_directory() {
        let temp = tempdir().unwrap();
        let canonical = ServerConfig::validate_root_dir(temp.path()).unwrap();
        assert!(canonical.exists());
        assert!(canonical.is_dir());
    }

    #[test]
    fn test_invalid_root_directory() {
        let non_existent = PathBuf::from("/non/existent/path/for/filez/test");
        assert!(ServerConfig::validate_root_dir(&non_existent).is_err());
    }

    #[test]
    fn test_config_from_args_with_custom_passphrase() {
        let temp = tempdir().unwrap();
        let args = CliArgs {
            root: temp.path().to_path_buf(),
            host: "0.0.0.0".to_string(),
            port: 8080,
            max_upload_mb: 50,
            passphrase: Some("secret123".to_string()),
        };

        let config = ServerConfig::from_args(args).unwrap();
        assert_eq!(config.host, "0.0.0.0");
        assert_eq!(config.port, 8080);
        assert_eq!(config.max_upload_size_bytes, 50 * 1024 * 1024);
        assert_eq!(config.passphrase, "secret123");
        assert!(!config.is_generated_passphrase);
    }

    #[test]
    fn test_config_generates_pin_when_none_provided() {
        let temp = tempdir().unwrap();
        let args = CliArgs {
            root: temp.path().to_path_buf(),
            host: "127.0.0.1".to_string(),
            port: 3000,
            max_upload_mb: 10240,
            passphrase: None,
        };

        let config = ServerConfig::from_args(args).unwrap();
        assert_eq!(config.passphrase.len(), 6);
        assert!(config.is_generated_passphrase);
        assert_eq!(config.max_upload_size_bytes, 10240 * 1024 * 1024);
    }
}
