# Contract: File Content & Video Streaming API

**Feature**: `003-video-player`
**Endpoint**: `GET /api/files/content`
**Authentication**: Required (`filez_session` cookie via `require_auth` middleware)

---

## 1. Request Format

- **Method**: `GET`
- **Path**: `/api/files/content`
- **Query Parameters**:
  - `path` (required, string): Relative path of the requested file inside the storage sandbox.
- **Headers**:
  - `Range` (optional, string): Standard byte range header (e.g., `bytes=0-`, `bytes=10485760-20971519`).
  - `Cookie`: Authenticated session token cookie.

---

## 2. Response Specifications

### A. Full Content (`200 OK`)
Returned when no `Range` header is present.
- **Headers**:
  - `Content-Type`: Automatically detected MIME type (e.g., `video/mp4`, `video/webm`, `video/quicktime`).
  - `Content-Length`: Total size in bytes.
  - `Accept-Ranges: bytes`
  - `Last-Modified`: RFC 2822 file modification timestamp.

### B. Partial Range Content (`206 Partial Content`)
Returned when the client requests a specific byte slice.
- **Headers**:
  - `Content-Type`: Media MIME type.
  - `Content-Range`: `bytes <start>-<end>/<total>` (e.g., `bytes 1048576-2097151/15485760`).
  - `Content-Length`: Size of the requested slice (`end - start + 1`).
  - `Accept-Ranges: bytes`

### C. Error Codes
- `400 Bad Request`: Invalid path characters, null bytes, or directory traversal attempt.
- `401 Unauthorized`: Missing or invalid session cookie.
- `404 Not Found`: File does not exist or target is a directory.
- `416 Range Not Satisfiable`: Requested byte range falls outside file bounds.
