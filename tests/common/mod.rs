use axum::Router;
use filez::{auth::AuthService, config::ServerConfig, fs::PathSandbox, handlers::create_router};
use std::fs;
use std::sync::Arc;
use tempfile::TempDir;

pub struct TestContext {
    #[allow(dead_code)]
    pub temp_dir: TempDir,
    pub config: Arc<ServerConfig>,
    pub auth_service: AuthService,
    pub sandbox: PathSandbox,
}

impl TestContext {
    pub fn new() -> Self {
        let temp_dir = TempDir::new().expect("failed to create temporary test directory");
        let root = temp_dir.path().to_path_buf();

        fs::create_dir_all(root.join("docs")).expect("failed to create docs dir");
        fs::create_dir_all(root.join("photos")).expect("failed to create photos dir");
        fs::write(root.join("docs").join("hello.txt"), b"Hello World")
            .expect("failed to write test file");

        let canonical_root = root
            .canonicalize()
            .expect("failed to canonicalize temp root");
        let config = Arc::new(ServerConfig {
            root_dir: canonical_root.clone(),
            host: "127.0.0.1".to_string(),
            port: 3000,
            max_upload_size_bytes: 10 * 1024 * 1024,
            passphrase: "test_passphrase".to_string(),
            is_generated_passphrase: false,
        });

        let auth_service = AuthService::new("test_passphrase".to_string());
        let sandbox = PathSandbox::new(&canonical_root).expect("failed to create sandbox");

        Self {
            temp_dir,
            config,
            auth_service,
            sandbox,
        }
    }

    #[allow(dead_code)]
    pub fn with_max_upload_size(max_bytes: usize) -> Self {
        let temp_dir = TempDir::new().expect("failed to create temporary test directory");
        let root = temp_dir.path().to_path_buf();

        fs::create_dir_all(root.join("docs")).expect("failed to create docs dir");
        fs::create_dir_all(root.join("photos")).expect("failed to create photos dir");
        fs::write(root.join("docs").join("hello.txt"), b"Hello World")
            .expect("failed to write test file");

        let canonical_root = root
            .canonicalize()
            .expect("failed to canonicalize temp root");
        let config = Arc::new(ServerConfig {
            root_dir: canonical_root.clone(),
            host: "127.0.0.1".to_string(),
            port: 3000,
            max_upload_size_bytes: max_bytes,
            passphrase: "test_passphrase".to_string(),
            is_generated_passphrase: false,
        });

        let auth_service = AuthService::new("test_passphrase".to_string());
        let sandbox = PathSandbox::new(&canonical_root).expect("failed to create sandbox");

        Self {
            temp_dir,
            config,
            auth_service,
            sandbox,
        }
    }

    pub fn app(&self) -> Router {
        create_router(
            self.config.clone(),
            self.auth_service.clone(),
            self.sandbox.clone(),
        )
    }
}
