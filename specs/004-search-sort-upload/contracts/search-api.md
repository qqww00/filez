# Contract: Search API

**Endpoint**: `GET /api/files/search`
**Authentication**: Required (Passphrase cookie or bearer session token)
**Content-Type**: `application/json`

---

## 1. Request Specification

### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `q` | `string` | **Yes** | — | Search keyword (case-insensitive substring match). Must not be empty. |
| `path` | `string` | No | `""` (root) | Base relative directory path to search within. |
| `limit` | `integer` | No | `500` | Maximum number of results to return (capped at `1000`). |

### Example Request
```http
GET /api/files/search?path=media&q=sunset HTTP/1.1
Host: localhost:3000
Cookie: filez_auth=...
```

---

## 2. Response Specification

### Success Response (`200 OK`)

```json
{
  "query": "sunset",
  "search_root": "media",
  "results": [
    {
      "name": "sunset_beach.jpg",
      "path": "media/photos/sunset_beach.jpg",
      "is_dir": false,
      "size_bytes": 3548120,
      "modified_at": "2026-10-24T05:12:00Z",
      "is_symlink": false,
      "relative_folder": "photos"
    },
    {
      "name": "sunset_timelapse.mp4",
      "path": "media/videos/sunset_timelapse.mp4",
      "is_dir": false,
      "size_bytes": 104857600,
      "modified_at": "2026-10-24T04:30:15Z",
      "is_symlink": false,
      "relative_folder": "videos"
    }
  ],
  "total_matches": 2,
  "is_truncated": false
}
```

---

## 3. Error Responses

### `400 Bad Request`
Returned when `q` is empty or whitespace, or when `path` contains invalid characters or path traversal attempts.
```json
{
  "error": "INVALID_PATH",
  "message": "Search query parameter 'q' cannot be empty"
}
```

### `401 Unauthorized`
Returned when user is not authenticated.
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

### `403 Forbidden`
Returned if path traversal escapes the root directory sandbox.
```json
{
  "error": "FORBIDDEN",
  "message": "Path escapes sandbox root directory"
}
```

### `404 Not Found`
Returned when the base directory `path` does not exist.
```json
{
  "error": "NOT_FOUND",
  "message": "Search root directory does not exist"
}
```
