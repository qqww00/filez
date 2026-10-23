# Contract: Upload API & Client Progress Protocol

**Feature**: `002-upload-progress`
**Protocol**: HTTP/1.1 `POST /api/upload`
**Transport**: `multipart/form-data` with client progress tracking

---

## 1. Endpoint Specification

### Request
- **Method**: `POST`
- **Path**: `/api/upload`
- **Query Parameters**:
  - `path` (optional, string): Destination relative directory path (e.g., `documents/projects`). If omitted or empty, defaults to root `""`.
  - `overwrite` (optional, boolean): `true` to replace existing files of the same name; defaults to `false`.
- **Headers**:
  - `Content-Type`: Automatically set by browser `FormData` (includes boundary parameter).
  - `Cookie`: Authenticated session cookie (`filez_session=...`).
- **Body**: Standard `multipart/form-data` containing one or more file fields named `files`.

### Response Codes
- `200 OK`: Upload completed and processed.
  ```json
  {
    "uploaded": [
      {
        "name": "report.pdf",
        "size": 154200,
        "path": "documents/report.pdf"
      }
    ],
    "failures": []
  }
  ```
- `400 Bad Request`: Invalid file path, traversal detected, or invalid payload.
- `401 Unauthorized`: Missing or invalid session cookie.
- `413 Payload Too Large`: Upload exceeds server's configured maximum size limit.
- `500 Internal Server Error`: Disk write error or I/O failure.

---

## 2. Client-Side XHR Streaming Contract

The client client layer (`uploadFileWithProgress`) wraps `XMLHttpRequest` with the following guarantees:

```typescript
export interface UploadProgressEvent {
  loaded: number;           // Bytes transmitted so far
  total: number;            // Total bytes to transmit
  percentage: number;       // 0 to 100
  speedBytesPerSec: number; // Current transfer rate
  etaSeconds: number | null;// Estimated time remaining in seconds
}

export interface UploadOptions {
  file: File;
  targetPath?: string;
  overwrite?: boolean;
  onProgress?: (event: UploadProgressEvent) => void;
  signal?: AbortSignal;
}

export function uploadSingleFileWithProgress(
  options: UploadOptions
): Promise<UploadResult>;
```

### Abort Semantics
- When `signal.abort()` is called:
  1. `xhr.abort()` is called synchronously.
  2. The TCP socket write terminates immediately.
  3. The promise rejects with an `AbortError`.
  4. Backend handler detects stream disconnection and removes temporary partial files (`.part`).
