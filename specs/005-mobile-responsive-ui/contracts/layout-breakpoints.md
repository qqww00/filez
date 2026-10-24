# UI Contract: Responsive Layout Breakpoints & Touch Tokens

**Feature**: Mobile-Responsive User Interface  
**Date**: 2026-10-24  
**Status**: Ratified  

## 1. Breakpoint Definitions

| Token / Query | Max Width | Target Devices | Primary Layout Adaptations |
|---|---|---|---|
| `@media (max-width: 640px)` | 640px | Smartphones (portrait & landscape) | Stacked file rows, mobile sort dropdown, bottom-sheet upload drawer, card modals |
| `@media (max-width: 768px)` | 768px | Small tablets & phablets | Fullscreen video player, compact header margins, enlarged touch controls |
| `@media (min-width: 641px)` | > 640px | Tablets & desktops | Multi-column table header, side-by-side search controls, floating drawer |

## 2. Touch Target & Dimension Tokens

| Dimension Token | Value | Target Elements | Purpose |
|---|---|---|---|
| `--touch-target-min` | `44px` | Buttons, navigation links, clear triggers, form inputs | WCAG 2.2 AA touch target compliance |
| `--touch-target-media` | `48px` | Video player buttons (play/pause, close, fullscreen) | Enhanced finger hit area on media overlays |
| `--touch-gap-min` | `8px` | Space between adjacent interactive elements | Prevents accidental mis-taps |
| `--input-font-size-mobile` | `16px` (or `1rem`) | `<input>`, `<select>`, `<textarea>` | Prevents automatic viewport zoom on iOS Safari |
| `--viewport-height` | `100dvh` (with `100vh` fallback) | App container, video modal, backdrop overlays | Accommodates mobile browser address/navigation bars |

## 3. Viewport Constraints

- **Root Overflow**: `html, body { overflow-x: hidden; }`
- **Container Padding**: 0.75rem (mobile) vs 1.5rem (desktop)
- **Modal Scroll Lock**: When active modal is present, `body { overflow: hidden; }`
