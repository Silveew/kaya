---
date: 2026-10-22
status: shipped
scope: desktop/window
---

# One owner for the desktop window's position and size

## Context

On macOS with an external display, Kaya opened on the main display but in a
Space of the external one: clicking into it made the main display switch away
from Kaya. Two mechanisms restored the window at startup.
`tauri-plugin-window-state` restored the last position, size and full-screen
state (its saved file had `"fullscreen": true` on the external display), then
our `window_state.rs` moved and resized the window onto the primary monitor.
A full-screen window owns a Space on its display; moving it to the other
display afterwards left it drawn on one display and attached to the other.

## Decision

- Drop `tauri-plugin-window-state`. `window_state.rs` (per-monitor sizes) is
  the only code that saves or restores the window, and it never restores full
  screen.
- Reopen on the monitor the window was last used on, if it is still
  connected, instead of always on the primary monitor; fall back to the
  primary monitor.

## Learnings

- Two restorers for one window run in an order nobody chose; whichever runs
  last wins the geometry, while the first may already have committed the
  window to a Space.
