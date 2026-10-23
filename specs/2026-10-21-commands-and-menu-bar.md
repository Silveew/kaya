---
date: 2026-10-21
status: shipped
scope: ui/commands, desktop/menu
---

# Commands: one registry behind shortcuts and the desktop menu bar

## Context

First step of the UI rework (layout proposal "A"): most toolbar buttons are
to leave the screen for the menu bar and shortcuts. Shortcuts were handled by
six separate window keydown listeners, each with its own text-field check,
and the desktop menu bar held only About and Check for Updates. A menu bar
needs to know, per action, whether it can run and whether a toggle is on, and
shortcuts that only work while some panel is mounted (save lived in the
header) don't scale to "every action has a key".

## Decision

- **Command registry** (`packages/ui/src/commands/`). The component that owns
  an action registers it with `useCommand(id, run, { enabled, checked,
allowInInput })`. Ids are `ShortcutId`s, so every command shows up in the
  Shortcuts settings and can be bound; new ones ship unbound
  (`createBinding('')`).
- **One keydown dispatcher** replaces the per-feature listeners. Text fields
  block a shortcut unless the command opts in with `allowInInput` (save,
  open, settings, panel toggles, full screen). `keyboard: false` leaves a key
  to a native event: ⌘V for Paste SGF arrives as a `paste` event.
- **Native menu bar** (`useNativeMenu`, `menuModel.ts`) built with the Tauri
  JS menu API: Kaya, File, Edit, View, Game, Analysis, Navigate, Window, Help.
  It is rebuilt only on a language or binding change; enabled/checked flags
  are pushed to the existing items, because navigating flips several on
  every move.
- **Accelerators only for Cmd/Ctrl combinations.** A menu key equivalent sees
  the key before the webview, so a bare letter or ⌥-digit would fire while
  typing a comment. ⌘Z/⇧⌘Z and ⌘V get none either: they would take undo and
  paste away from text fields. On macOS the Edit menu carries the predefined
  Cut/Copy/Paste/Select All items, which is what makes those keys work in
  inputs.
- A key press can reach both the menu and the page; the registry drops a
  second run of the same command from a different source within 150 ms.

## Learnings

- Handlers are called with no arguments. Several game-tree actions take an
  optional node id, and handing them a context object as that argument would
  aim them at a node that doesn't exist; `useCommandWithContext` is the
  opt-in for the navigation commands that need `repeat`.
