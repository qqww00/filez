# Data Model: Intuitive File Upload Progress

**Feature**: `002-upload-progress`
**Date**: 2026-10-23
**Status**: Completed

## 1. Core Entities

```text
+-----------------------------------------------------------+
|                        UploadBatch                        |
+-----------------------------------------------------------+
| id: string (UUID)                                         |
| targetDirectory: string                                   |
| items: UploadItem[]                                       |
| totalBytes: number                                        |
| loadedBytes: number                                       |
| progressPercentage: number (0 - 100)                      |
| status: 'active' | 'completed' | 'cancelled' | 'error'    |
| startedAt: number (epoch ms)                              |
| completedAt?: number (epoch ms)                           |
+-----------------------------------------------------------+
                             | 1
                             |
                             | *
+-----------------------------------------------------------+
|                        UploadItem                         |
+-----------------------------------------------------------+
| id: string (UUID)                                         |
| file: File                                                |
| filename: string                                          |
| size: number (bytes)                                      |
| loadedBytes: number (bytes)                               |
| progressPercentage: number (0 - 100)                      |
| status: UploadItemStatus                                  |
| speedBytesPerSec: number                                  |
| etaSeconds: number | null                                 |
| error?: string                                            |
| abortController?: AbortController / XHR reference         |
+-----------------------------------------------------------+
```

---

## 2. Entity Specifications

### `UploadItemStatus`
Enumeration of the lifecycle states of an individual file transfer:
- `queued`: Waiting in line for previous items to complete.
- `uploading`: Currently streaming data bytes over the network to the server.
- `completed`: Successfully uploaded, validated by server response HTTP 200.
- `failed`: Aborted due to network drop, timeout, or server HTTP error (4xx/5xx).
- `cancelled`: Aborted voluntarily by user interaction.

### `UploadItem`
Represents an individual file in the upload pipeline.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique client-side identifier for tracking and DOM keys |
| `filename` | `string` | Name of the file being uploaded |
| `size` | `number` | Total file size in bytes |
| `loadedBytes` | `number` | Bytes successfully transmitted so far |
| `progressPercentage` | `number` | Calculated percentage `(loadedBytes / size) * 100` clamped between 0 and 100 |
| `status` | `UploadItemStatus` | Current operational state |
| `speedBytesPerSec` | `number` | Exponential moving average transfer rate in bytes per second |
| `etaSeconds` | `number \| null` | Estimated seconds until completion, or `null` if speed is 0 |
| `error` | `string \| undefined` | User-friendly explanation if status is `failed` |

### `UploadBatch`
Represents a group of files selected and uploaded together.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique batch identifier |
| `targetDirectory` | `string` | The directory path where files are being stored |
| `items` | `UploadItem[]` | List of items belonging to this batch |
| `totalBytes` | `number` | Sum of `size` across all items in the batch |
| `loadedBytes` | `number` | Sum of completed item bytes + currently uploading item `loadedBytes` |
| `progressPercentage` | `number` | Aggregate percentage `(loadedBytes / totalBytes) * 100` |
| `status` | `string` | Overall status (`active`, `completed`, `cancelled`, `error`) |

---

## 3. State Transitions

```text
[ File Selected ]
       |
       v
    queued
       |
       | (Queue processor starts item)
       v
   uploading <----+ (Real-time progress events update loadedBytes, speed, ETA)
       |          |
       +----------+
       |
       +--------------------+---------------------+
       |                    |                     |
       v                    v                     v
  (HTTP 200)           (User Cancel)         (Error/Drop)
       |                    |                     |
   completed            cancelled               failed
```

### Transition Rules:
1. An item may only transition from `queued` to `uploading` when no other item is currently `uploading`.
2. An item in `uploading` or `queued` state can transition to `cancelled` when user triggers the cancel action.
3. Once an item reaches `completed`, `cancelled`, or `failed`, its state is immutable.
4. When all items in an `UploadBatch` are in terminal states (`completed`, `cancelled`, `failed`), the batch status transitions to `completed` (or `partially_failed` if errors occurred).
