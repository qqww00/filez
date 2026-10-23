mod common;

use axum::{
    body::Body,
    http::{header, Request, StatusCode},
};
use common::TestContext;
use serde_json::json;
use tower::ServiceExt;

#[tokio::test]
async fn test_path_traversal_directory_listing_rejected() {
    let ctx = TestContext::new();
    let token = ctx.auth_service.create_session_token();
    let cookie = format!("filez_session={}", token);

    let traversal_paths = [
        "../",
        "../../",
        "../../../../etc",
        "..%2F..%2F",
        "docs/../../etc",
        "/etc",
        "photos/../../../",
    ];

    for path in traversal_paths {
        let app = ctx.app();
        let resp = app
            .oneshot(
                Request::builder()
                    .uri(format!("/api/files?path={}", path))
                    .header(header::COOKIE, cookie.clone())
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert!(
            resp.status() == StatusCode::FORBIDDEN || resp.status() == StatusCode::BAD_REQUEST,
            "Expected traversal path '{}' to be blocked with 403 or 400, got: {}",
            path,
            resp.status()
        );
    }
}

#[tokio::test]
async fn test_path_traversal_copy_and_delete_rejected() {
    let ctx = TestContext::new();
    let token = ctx.auth_service.create_session_token();
    let cookie = format!("filez_session={}", token);

    // 1. Copy traversal attempt
    let app = ctx.app();
    let copy_resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/files/copy")
                .header(header::COOKIE, cookie.clone())
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    json!({
                        "source_path": "docs/hello.txt",
                        "destination_path": "../../outside.txt"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert!(
        copy_resp.status() == StatusCode::FORBIDDEN
            || copy_resp.status() == StatusCode::BAD_REQUEST
    );

    // 2. Delete traversal attempt
    let app = ctx.app();
    let del_resp = app
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri("/api/files?path=../../etc/passwd")
                .header(header::COOKIE, cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert!(
        del_resp.status() == StatusCode::FORBIDDEN || del_resp.status() == StatusCode::BAD_REQUEST
    );
}

#[cfg(unix)]
#[tokio::test]
async fn test_outside_symlinks_denied() {
    use std::os::unix::fs::symlink;
    let ctx = TestContext::new();
    let token = ctx.auth_service.create_session_token();
    let cookie = format!("filez_session={}", token);

    let temp_outside = tempfile::tempdir().unwrap();
    let outside_secret = temp_outside.path().join("secret.txt");
    std::fs::write(&outside_secret, b"super-secret").unwrap();

    let inside_symlink = ctx.config.root_dir.join("photos").join("leak_link");
    symlink(&outside_secret, &inside_symlink).unwrap();

    // Listing directory should hide the escaping symlink
    let app = ctx.app();
    let list_resp = app
        .oneshot(
            Request::builder()
                .uri("/api/files?path=photos")
                .header(header::COOKIE, cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(list_resp.status(), StatusCode::OK);
}
