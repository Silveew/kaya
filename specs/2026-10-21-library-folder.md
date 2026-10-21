---
date: 2026-10-21
status: shipped
scope: library
---

# Library folder: keep the game library as .sgf files on disk

## Context

The library lived only in IndexedDB. Getting games in and out meant a ZIP
round trip or one save dialog per game, and the library could not be backed
up, versioned with git, or shared with other SGF tools without that detour.
Re-importing an updated game also creates a duplicate instead of updating it.

## Decision

- **A second `LibraryStorage`, not a sync engine.** `FolderStorage`
  (`packages/game-library/src/folder-storage.ts`) implements the same interface
  on top of a folder, which becomes the single source of truth. No two-way
  merge between IndexedDB and disk, so no merge conflicts to resolve.
- **Platform-free package.** File access goes through a small `FolderBackend`
  interface. Desktop injects one built on new Rust commands
  (`commands/library.rs`) via `setLibraryFolderAPI()` in `main.tsx`; tests use
  a `node:fs` backend on a temp directory. Web does not offer the option.
- **Rust commands instead of the fs plugin.** The plugin's scope cannot cover a
  folder picked in a previous session without persisted-scope. The commands
  take the root on every call and reject any relative path that could leave it
  (`..`, absolute, hidden components).
- **Stable ids.** Scanned items get `fs:<relative path>`, so ids survive a
  restart. Within a session an item keeps its id across renames and moves,
  because the loaded file and selection hold on to it.
- **External changes.** `getAllItems()` rescans (re-reading only files whose
  mtime or size changed), the library refreshes on window focus, and `getItem()`
  re-reads the file so opening a game shows the current disk version. Saving
  passes the last known mtime; if the file changed since, the write is refused
  instead of overwriting it.
- **Safety.** Writes go to a hidden temp file and are renamed over the target.
  Hidden entries (`.git`) and non-`.sgf` files are ignored. `clear()` refuses,
  and the "Clear library" button is hidden, because it would delete the user's
  own files. Creates never overwrite a file that exists on disk but was not
  scanned yet.
- **Switching** is a library-panel button that stores the folder in
  localStorage and reloads; existing app-storage games stay where they are.

## Learnings

- The conflict check compares against the mtime of the last scan, so an
  external change picked up by a focus refresh is not detected if the open
  game is saved afterwards. Closing that gap needs the editor to carry the
  version it loaded; left for later.
