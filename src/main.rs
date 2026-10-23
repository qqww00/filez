use clap::Parser;
use filez::{
    auth::AuthService,
    config::{CliArgs, ServerConfig},
    fs::PathSandbox,
    handlers::create_router,
};
use std::net::{IpAddr, UdpSocket};
use std::path::PathBuf;
use std::sync::Arc;
use tower_http::services::{ServeDir, ServeFile};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

fn detect_local_ip() -> Option<IpAddr> {
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("10.255.255.255:1").ok()?;
    socket.local_addr().ok().map(|addr| addr.ip())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "filez=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let args = CliArgs::parse();
    let config = match ServerConfig::from_args(args) {
        Ok(c) => Arc::new(c),
        Err(e) => {
            eprintln!("Configuration Error: {}", e);
            std::process::exit(1);
        }
    };

    let sandbox = match PathSandbox::new(&config.root_dir) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Sandbox Initialization Error: {}", e);
            std::process::exit(1);
        }
    };

    let auth_service = AuthService::new(config.passphrase.clone());

    let addr = format!("{}:{}", config.host, config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    println!("========================================================");
    println!("  Filez - Local Network File Manager");
    println!("--------------------------------------------------------");
    println!("  Local access:   http://localhost:{}", config.port);
    if config.host == "0.0.0.0" {
        if let Some(ip) = detect_local_ip() {
            println!("  Network access: http://{}:{}", ip, config.port);
        } else {
            println!("  Network access: http://<laptop-lan-ip>:{}", config.port);
        }
    }
    println!("  Root directory: {}", config.root_dir.display());
    let upload_mb = config.max_upload_size_bytes / (1024 * 1024);
    if upload_mb >= 1024 {
        println!(
            "  Max upload:     {} GB (--max-upload-mb)",
            upload_mb / 1024
        );
    } else {
        println!("  Max upload:     {} MB (--max-upload-mb)", upload_mb);
    }
    if config.is_generated_passphrase {
        println!(
            "  Generated PIN:  {} (use to unlock on phone)",
            config.passphrase
        );
    } else {
        println!("  Passphrase:     [configured]");
    }
    println!("========================================================");

    let router = create_router(config.clone(), auth_service, sandbox);

    // If production build exists in frontend/dist, serve static SPA assets
    let dist_path = PathBuf::from("frontend/dist");
    let app = if dist_path.exists() {
        let index_file = dist_path.join("index.html");
        let serve_dir = ServeDir::new(&dist_path).not_found_service(ServeFile::new(index_file));
        router.fallback_service(serve_dir)
    } else {
        router
    };

    axum::serve(listener, app).await?;

    Ok(())
}
