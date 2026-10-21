---
date: 2026-10-21
status: shipped
scope: ui/layout, ui/board, desktop
---

# Desktop: Library and Analyze workspaces, and a board that keeps its size

## Context

Feedback on the desktop layout: the library takes room while analyzing,
game info belongs with the library, the comment box is cramped, edit tools
are spread over three places, and the board shrinks and grows as bars appear
around it (analysis bar, edit toolbar, score estimator, collapsible
controls). Two layouts were proposed; "A" (one sidebar) was picked to build
first, desktop first. Builds on
[the command registry and menu bar](2026-10-21-commands-and-menu-bar.md).

## Decision

- **Two workspaces** in one window, switched in the header (Library |
  Analyze) or with ⌘1 / ⌘2 (`view.library`, `view.analyze`). Opening a game
  from the library switches to Analyze. Only the desktop layout mode has
  them; tablet and phone keep their tab layout.
  - **Library**: the library, and beside it the selected game's details
    (`LibraryGameDetails`): the full editable game info for the game on the
    board, otherwise the library's metadata for the selection and an
    "Open in Analyze" button.
  - **Analyze**: the board, then one sidebar: game tree, comment (the
    largest section by default) and a tab section (Engine, Analysis, Moves)
    that can be collapsed to its tab row (layout A). From 1600 px wide the
    panels go on both sides (layout B): game tree and moves left, comment and
    the Engine / Analysis tabs right. Both remember their own panel sizes.
- **Board frame** (desktop): a tool rail and a vertical eval gauge to the
  left of the board, the players / navigation strip under it at a fixed
  height, nothing above it. The action bar and the analysis bar are gone from
  the board on desktop (their commands are in the menu bar; the analysis bar
  moved into the Analysis tab). The score estimator floats over the board.
- **Tool rail**: every tool that acts on points of the board (play, black,
  white, alternate, the markers and labels, eraser). Picking a tool is edit
  mode; Play leaves it, so there is no separate edit switch. Number keys pick
  tools (`tool.*` commands). Branch actions stay in the tree's context menu
  and the Edit menu; marks stay with the comment.
- **Eval gauge**: Black fills from the bottom by win rate, the label carries
  the score lead. It keeps its place, greyed out, while analysis is off, and
  clicking it toggles analysis.
- **Engine tab**: the engine's candidate moves with score lead, Black's win
  rate and policy; clicking one plays it. The engine reports a single move
  per candidate, so continuations aren't shown yet.
- With a menu bar (desktop app), the header drops the file buttons and view
  toggles and keeps the file name, the workspace switch and the engine pill.
  The panels' display buttons become View/Analysis menu commands: game tree
  orientation and minimap, comment text size (⌘= / ⌘−), pattern names, and
  what the heatmap measures. Language moved into Settings › Game. The web app,
  having no menu bar, keeps those buttons.

## Learnings

- The board resized because siblings in its flex column changed height.
  Making every neighbour fixed-size, and floating the transient ones, keeps
  `useVertexSize` tied to the window alone.
