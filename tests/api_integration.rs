mod common;

use axum::{
    body::Body,
    http::{header, Request, StatusCode},
};
use common::TestContext;
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;

#[tokio::test]
async fn test_health_endpoint() {
    let ctx = TestContext::new();
    let app = ctx.app();

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["status"], "ok");
    assert!(json["version"].is_string());
}

#[tokio::test]
async fn test_auth_login_success_and_failure() {
    let ctx = TestContext::new();

    // 1. Invalid passphrase
    let app = ctx.app();
    let fail_resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/login")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    json!({ "passphrase": "wrong_password" }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(fail_resp.status(), StatusCode::UNAUTHORIZED);

    // 2. Valid passphrase
    let app = ctx.app();
    let success_resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/login")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    json!({ "passphrase": "test_passphrase" }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(success_resp.status(), StatusCode::OK);
    let cookie = success_resp
        .headers()
        .get(header::SET_COOKIE)
        .unwrap()
        .to_str()
        .unwrap();
    assert!(cookie.contains("filez_session="));
    assert!(cookie.contains("HttpOnly"));

    // 3. Verify /api/auth/status includes max_upload_size_mb
    let app = ctx.app();
    let status_resp = app
        .oneshot(
            Request::builder()
                .uri("/api/auth/status")
                .header(header::COOKIE, cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(status_resp.status(), StatusCode::OK);
    let status_body = status_resp.into_body().collect().await.unwrap().to_bytes();
    let status_json: Value = serde_json::from_slice(&status_body).unwrap();
    assert_eq!(status_json["authenticated"], true);
    assert_eq!(status_json["max_upload_size_mb"], 10);
}

#[tokio::test]
async fn test_protected_files_endpoint_auth_gate() {
    let ctx = TestContext::new();

    // 1. Unauthenticated request must receive 401
    let app = ctx.app();
    let unauth_resp = app
        .oneshot(
            Request::builder()
                .uri("/api/files")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(unauth_resp.status(), StatusCode::UNAUTHORIZED);

    // 2. Authenticated request with session token succeeds
    let token = ctx.auth_service.create_session_token();
    let cookie_header = format!("filez_session={}", token);

    let app = ctx.app();
    let auth_resp = app
        .oneshot(
            Request::builder()
                .uri("/api/files")
                .header(header::COOKIE, cookie_header.clone())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(auth_resp.status(), StatusCode::OK);

    let body = auth_resp.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["current_path"], "");
    assert_eq!(json["total_dirs"], 2); // docs, photos
    assert_eq!(json["breadcrumbs"][0]["name"], "Root");

    // 3. Navigate into subfolder
    let app = ctx.app();
    let subfolder_resp = app
        .oneshot(
            Request::builder()
                .uri("/api/files?path=docs")
                .header(header::COOKIE, cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(subfolder_resp.status(), StatusCode::OK);

    let sub_body = subfolder_resp
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let sub_json: Value = serde_json::from_slice(&sub_body).unwrap();

    assert_eq!(sub_json["current_path"], "docs");
    assert_eq!(sub_json["total_files"], 1); // hello.txt
    assert_eq!(sub_json["entries"][0]["name"], "hello.txt");
    assert_eq!(sub_json["breadcrumbs"].as_array().unwrap().len(), 2);
}

#[tokio::test]
async fn test_copy_and_delete_endpoints() {
    let ctx = TestContext::new();
    let token = ctx.auth_service.create_session_token();
    let cookie = format!("filez_session={}", token);

    // 1. Copy docs/hello.txt -> photos/
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
                        "destination_path": "photos"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(copy_resp.status(), StatusCode::OK);

    // 2. Verify photos contains hello.txt
    let app = ctx.app();
    let list_photos = app
        .oneshot(
            Request::builder()
                .uri("/api/files?path=photos")
                .header(header::COOKIE, cookie.clone())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(list_photos.status(), StatusCode::OK);
    let body = list_photos.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["total_files"], 1);
    assert_eq!(json["entries"][0]["name"], "hello.txt");

    // 3. Delete photos/hello.txt
    let app = ctx.app();
    let del_resp = app
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri("/api/files?path=photos/hello.txt")
                .header(header::COOKIE, cookie.clone())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(del_resp.status(), StatusCode::OK);

    // 4. Verify photos is now empty
    let app = ctx.app();
    let list_empty = app
        .oneshot(
            Request::builder()
                .uri("/api/files?path=photos")
                .header(header::COOKIE, cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let empty_body = list_empty.into_body().collect().await.unwrap().to_bytes();
    let empty_json: Value = serde_json::from_slice(&empty_body).unwrap();
    assert_eq!(empty_json["total_files"], 0);
}

#[tokio::test]
async fn test_upload_endpoint_multipart() {
    let ctx = TestContext::new();
    let token = ctx.auth_service.create_session_token();
    let cookie = format!("filez_session={}", token);

    let boundary = "---------------------------974767299852498929531610575";
    let body_data = format!(
        "--{boundary}\r\nContent-Disposition: form-data; name=\"files\"; filename=\"uploaded_pic.png\"\r\nContent-Type: image/png\r\n\r\nPNG_MOCK_DATA\r\n--{boundary}--\r\n",
        boundary = boundary
    );

    let app = ctx.app();
    let upload_resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/upload?path=photos")
                .header(header::COOKIE, cookie.clone())
                .header(
                    header::CONTENT_TYPE,
                    format!("multipart/form-data; boundary={}", boundary),
                )
                .body(Body::from(body_data))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(upload_resp.status(), StatusCode::OK);

    let body = upload_resp.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["uploaded"].as_array().unwrap().len(), 1);
    assert_eq!(json["uploaded"][0]["name"], "uploaded_pic.png");

    // Verify it physically exists on the laptop disk
    let disk_file = ctx.config.root_dir.join("photos").join("uploaded_pic.png");
    assert!(disk_file.exists());
    assert_eq!(std::fs::read(&disk_file).unwrap(), b"PNG_MOCK_DATA");
}

#[tokio::test]
async fn test_upload_endpoint_exceeds_2mb_default_limit() {
    let ctx = TestContext::new(); // max limit is 10 MB
    let token = ctx.auth_service.create_session_token();
    let cookie = format!("filez_session={}", token);

    let boundary = "---------------------------boundary2mbplus";
    let three_mb_payload = vec![b'X'; 3 * 1024 * 1024];

    let header_part = format!(
        "--{boundary}\r\nContent-Disposition: form-data; name=\"files\"; filename=\"large_photo.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n",
        boundary = boundary
    );
    let footer_part = format!("\r\n--{boundary}--\r\n", boundary = boundary);

    let mut body_bytes = Vec::new();
    body_bytes.extend_from_slice(header_part.as_bytes());
    body_bytes.extend_from_slice(&three_mb_payload);
    body_bytes.extend_from_slice(footer_part.as_bytes());

    let app = ctx.app();
    let upload_resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/upload?path=photos")
                .header(header::COOKIE, cookie)
                .header(
                    header::CONTENT_TYPE,
                    format!("multipart/form-data; boundary={}", boundary),
                )
                .body(Body::from(body_bytes))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(upload_resp.status(), StatusCode::OK);

    let body = upload_resp.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["uploaded"].as_array().unwrap().len(), 1);
    assert_eq!(json["uploaded"][0]["name"], "large_photo.jpg");
    assert_eq!(
        json["uploaded"][0]["size_bytes"].as_u64().unwrap(),
        3 * 1024 * 1024
    );

    // Verify it physically exists on the laptop disk and matches 3MB
    let disk_file = ctx.config.root_dir.join("photos").join("large_photo.jpg");
    assert!(disk_file.exists());
    assert_eq!(disk_file.metadata().unwrap().len(), 3 * 1024 * 1024);
}

#[tokio::test]
async fn test_upload_endpoint_exceeds_configured_max_limit_returns_413() {
    // Configured max is 1 MB
    let ctx = TestContext::with_max_upload_size(1024 * 1024);
    let token = ctx.auth_service.create_session_token();
    let cookie = format!("filez_session={}", token);

    let boundary = "---------------------------boundaryexceeded";
    let two_mb_payload = vec![b'Y'; 2 * 1024 * 1024];

    let header_part = format!(
        "--{boundary}\r\nContent-Disposition: form-data; name=\"files\"; filename=\"too_large.dat\"\r\nContent-Type: application/octet-stream\r\n\r\n",
        boundary = boundary
    );
    let footer_part = format!("\r\n--{boundary}--\r\n", boundary = boundary);

    let mut body_bytes = Vec::new();
    body_bytes.extend_from_slice(header_part.as_bytes());
    body_bytes.extend_from_slice(&two_mb_payload);
    body_bytes.extend_from_slice(footer_part.as_bytes());

    let app = ctx.app();
    let upload_resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/upload?path=photos")
                .header(header::COOKIE, cookie)
                .header(
                    header::CONTENT_TYPE,
                    format!("multipart/form-data; boundary={}", boundary),
                )
                .body(Body::from(body_bytes))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(upload_resp.status(), StatusCode::PAYLOAD_TOO_LARGE);

    let body = upload_resp.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["code"], "PAYLOAD_TOO_LARGE");
}

#[tokio::test]
async fn test_upload_endpoint_unauthenticated_returns_401() {
    let ctx = TestContext::new();

    let boundary = "---------------------------boundaryunauth";
    let body_data = format!(
        "--{boundary}\r\nContent-Disposition: form-data; name=\"files\"; filename=\"test.txt\"\r\nContent-Type: text/plain\r\n\r\nHello\r\n--{boundary}--\r\n",
        boundary = boundary
    );

    let app = ctx.app();
    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/upload?path=photos")
                .header(
                    header::CONTENT_TYPE,
                    format!("multipart/form-data; boundary={}", boundary),
                )
                .body(Body::from(body_data))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
    let body = resp.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["code"], "UNAUTHORIZED");
}

#[tokio::test]
async fn test_stream_file_content_full_and_range() {
    let ctx = TestContext::new();
    let token = ctx.auth_service.create_session_token();
    let cookie = format!("filez_session={}", token);

    // Create a 16-byte test file
    std::fs::write(
        ctx.sandbox.canonical_root().join("video.mp4"),
        b"0123456789ABCDEF",
    )
    .unwrap();

    // 1. Full content without Range header
    let app = ctx.app();
    let full_resp = app
        .oneshot(
            Request::builder()
                .uri("/api/files/content?path=video.mp4")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(full_resp.status(), StatusCode::OK);
    assert_eq!(
        full_resp.headers().get(header::ACCEPT_RANGES).unwrap(),
        "bytes"
    );
    let full_body = full_resp.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(full_body, b"0123456789ABCDEF".as_slice());

    // 2. Byte Range request (bytes 4-9, length 6)
    let app = ctx.app();
    let range_resp = app
        .oneshot(
            Request::builder()
                .uri("/api/files/content?path=video.mp4")
                .header(header::COOKIE, &cookie)
                .header(header::RANGE, "bytes=4-9")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(range_resp.status(), StatusCode::PARTIAL_CONTENT);
    assert_eq!(
        range_resp.headers().get(header::CONTENT_RANGE).unwrap(),
        "bytes 4-9/16"
    );
    let range_body = range_resp.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(range_body, b"456789".as_slice());

    // 3. Unauthenticated request returns 401
    let app = ctx.app();
    let unauth_resp = app
        .oneshot(
            Request::builder()
                .uri("/api/files/content?path=video.mp4")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(unauth_resp.status(), StatusCode::UNAUTHORIZED);

    // 4. Path traversal attempt returns 400
    let app = ctx.app();
    let traversal_resp = app
        .oneshot(
            Request::builder()
                .uri("/api/files/content?path=../etc/passwd")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(traversal_resp.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn test_search_endpoint() {
    let ctx = TestContext::new();
    let token = ctx.auth_service.create_session_token();
    let cookie = format!("filez_session={}", token);
    let root = ctx.temp_dir.path();

    // Setup nested files
    std::fs::create_dir_all(root.join("docs").join("arch")).unwrap();
    std::fs::write(
        root.join("docs").join("arch").join("blueprint.pdf"),
        b"blueprint data",
    )
    .unwrap();
    std::fs::write(root.join("docs").join("notes.txt"), b"some notes").unwrap();
    std::fs::write(root.join("readme.md"), b"top level readme").unwrap();

    // 1. Unauthenticated request returns 401
    let app = ctx.app();
    let unauth_resp = app
        .oneshot(
            Request::builder()
                .uri("/api/files/search?q=blueprint")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(unauth_resp.status(), StatusCode::UNAUTHORIZED);

    // 2. Authenticated search for "blueprint"
    let app = ctx.app();
    let search_resp = app
        .oneshot(
            Request::builder()
                .uri("/api/files/search?q=blueprint")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(search_resp.status(), StatusCode::OK);
    let body = search_resp.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["query"], "blueprint");
    assert_eq!(json["total_matches"], 1);
    assert_eq!(json["results"][0]["name"], "blueprint.pdf");
    assert_eq!(json["results"][0]["path"], "docs/arch/blueprint.pdf");
    assert_eq!(json["results"][0]["relative_folder"], "docs/arch");

    // 3. Path traversal attempt returns 403
    let app = ctx.app();
    let traversal_resp = app
        .oneshot(
            Request::builder()
                .uri("/api/files/search?path=../&q=blueprint")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(traversal_resp.status(), StatusCode::FORBIDDEN);

    // 4. Empty query returns 400
    let app = ctx.app();
    let empty_q_resp = app
        .oneshot(
            Request::builder()
                .uri("/api/files/search?q=")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(empty_q_resp.status(), StatusCode::BAD_REQUEST);
}
