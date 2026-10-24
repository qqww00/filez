# Data Model: Mobile Responsive UI

**Feature**: Mobile-Responsive User Interface  
**Date**: 2026-10-24  
**Status**: Completed  

## 1. Entities & State Definitions

### Entity: `MobileViewportState`
Represents the current viewport metrics and device interaction capabilities.

| Field | Type | Description | Validation / Constraints |
|---|---|---|---|
| `width` | `number` | Active window/viewport width in CSS pixels | Minimum 320, standard range 320–768 for mobile/tablet |
| `height` | `number` | Active window/viewport height in CSS pixels | Uses dynamic viewport height (`100dvh`) |
| `isMobile` | `boolean` | Flag indicating smartphone-class screen | `width <= 640` |
| `isTablet` | `boolean` | Flag indicating tablet-class screen | `width > 640 && width <= 768` |
| `orientation` | `'portrait' \| 'landscape'` | Current device screen orientation | Derived from `width > height ? 'landscape' : 'portrait'` |
| `hasTouch` | `boolean` | Detection of touch-screen interaction | `navigator.maxTouchPoints > 0` |

### Entity: `ResponsiveNavigationState`
Encapsulates directory hierarchy and breadcrumb overflow state on mobile.

| Field | Type | Description | Validation / Constraints |
|---|---|---|---|
| `breadcrumbs` | `Breadcrumb[]` | List of path segments from root to current directory | Non-empty array |
| `isOverflowing` | `boolean` | True if breadcrumb trail exceeds container width | Computed from `scrollWidth > clientWidth` |
| `scrollLeft` | `number` | Current horizontal scroll offset in pixels | `scrollLeft >= 0` |

### Entity: `MobileSortOption`
Maps compound mobile dropdown values to backend sort fields and directions.

| Option Value | Field (`sortField`) | Direction (`sortDirection`) | Display Label |
|---|---|---|---|
| `name-asc` | `name` | `asc` | Name (A to Z) |
| `name-desc` | `name` | `desc` | Name (Z to A) |
| `size-desc` | `size` | `desc` | Size (Largest first) |
| `size-asc` | `size` | `asc` | Size (Smallest first) |
| `date-desc` | `date` | `desc` | Modified (Newest first) |
| `date-asc` | `date` | `asc` | Modified (Oldest first) |
| `type-asc` | `type` | `asc` | Type (A to Z) |
| `type-desc` | `type` | `desc` | Type (Z to A) |

### Entity: `ModalPresentationState`
Manages presentation mode and background scroll locking when dialogs or overlays are open.

| Field | Type | Description | State Transition |
|---|---|---|---|
| `activeModal` | `'login' \| 'copy' \| 'delete' \| 'video' \| null` | Active modal dialog type | `null` when all dialogs dismissed |
| `isDrawerOpen` | `boolean` | True if upload progress drawer is displayed | Managed by `useUploadManager` |
| `isDrawerMinimized`| `boolean` | True if bottom sheet is collapsed to header bar | Toggleable via header action |
| `isScrollLocked` | `boolean` | True if `document.body` scrolling is disabled | Set to `true` when `activeModal !== null` |

## 2. State Lifecycle & Transitions

```text
[ Desktop Viewport (> 768px) ]
           │
           ▼ (Screen resize or mobile device detection)
[ Mobile Viewport (<= 640px) ]
    ├── Breadcrumbs -> Enable horizontal momentum touch scroll
    ├── FileList -> Hide desktop table header; display .mobile-sort-bar dropdown
    ├── FileRow -> Stack vertically: [Icon + Name] on top, [Size + Date + Actions] below
    └── Modals/Drawers -> Render as bottom card / bottom sheet; apply body scroll-lock
```
