---
date: 2026-10-21
status: shipped
scope: ui/analysis, ui/board
---

# Moves tab: the branch as a list, with annotation marks

## Context

[Annotation marks](2026-10-21-annotation-marks.md) show in the game tree and
on the current move. Reviewing a game also needs an overview: which moves are
marked, what the comments say, and a quick way to step from one marked move
to the next. Kaya had no move list.

## Decision

- The analysis panel gets a third tab, **Moves**, next to Graph and Report.
  It lists the current branch: root, every node up to the current one, and on
  to the end of the branch along first children (the same path the graph
  plots). Each row shows the move number, the stone colour, the coordinate
  (GTP style, "Pass" for passes, "Start" for the root), the move and position
  mark badges, and the first line of the comment. Clicking a row goes to it;
  the current row stays scrolled into view.
- A **mark bar** above the list sets the current node's move mark (`! !! !?
?! ? ??`) and position mark (`+B ++B +W ++W = ∞`). The buttons toggle, like
  the tree menu and shortcuts. Move marks are disabled on nodes without a
  move.
- The **comment panel** gets the same bar in compact form (one row: the six
  move marks, then a **±** button whose popover holds the position marks), so
  marks can be set without a right-click. Both bars are
  `components/editors/AnnotationMarkBar.tsx`; tooltips show the shortcut.
- Toolbar: **Previous mark** / **Next mark** jump to the nearest node on the
  branch with any mark; **Marked only** filters the list; **All marks on
  board** (persisted as `gameSettings.showAllMoveMarks`) badges every marked
  stone of the branch up to the current move that is still on the board, not
  only the current move.
- Pure logic lives in `utils/moveList.ts` (unit tested): branch rows,
  previous/next marked row, and which marked stones keep a badge. A stone
  keeps it while the same colour still occupies its point, so captured stones
  lose theirs, and a later unmarked stone on the same point clears it.

## Alternatives considered

- **A fourth sidebar panel.** Rejected: the sidebar's panel sizes and
  visibility are persisted per panel, and the analysis panel already has a tab
  bar where a list fits.
- **Picker as a popover on the selected row.** Rejected: hidden when
  "Marked only" filters out the current row; a fixed bar is always reachable.

## Limitations

- Only the current branch is listed; other variations show in the game tree.
- Long games are rendered without virtualization (a few hundred rows).
