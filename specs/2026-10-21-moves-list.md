---
date: 2026-10-21
status: shipped
scope: ui/gametree, ui/layout, ui/board
---

# Moves panel: the branch as a list, with annotation marks

## Context

[Annotation marks](2026-10-21-annotation-marks.md) show in the game tree and
on the current move. Reviewing a game also needs an overview: which moves are
marked, what the comments say, and a quick way to step from one marked move
to the next. Kaya had no move list.

## Decision

- The right sidebar gets a **Moves** section directly under the game tree
  (order: Game tree, Moves, Game info, Comment), collapsible and resizable
  like the others; its visibility is saved with theirs. On mobile and tablet
  it sits under the tree on the Tree tab. It lists the current branch: root,
  every node up to the current one, and on to the end of the branch along
  first children (the same path the graph plots). Each row shows the move number, the stone colour, the coordinate
  (GTP style, "Pass" for passes, "Start" for the root), the move and position
  mark badges, and the first line of the comment. Clicking a row goes to it;
  the current row stays scrolled into view.
- The **comment panel** gets a row of mark buttons above the comment: the six
  move marks (`! !! !? ?! ? ??`), then a **±** button whose popover holds the
  position marks (`+B ++B +W ++W = ∞`), so marks can be set without a
  right-click. The buttons toggle, like the tree menu and shortcuts; move
  marks are disabled on nodes without a move; tooltips show the shortcut
  (`components/editors/AnnotationMarkBar.tsx`). The Moves panel has no bar of
  its own, since the comment panel sits in the same sidebar.
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

- **A third tab in the analysis panel** (next to Graph and Report). Tried
  first and rejected after use: the list belongs next to the game tree it
  mirrors, and the left panel is often hidden while reviewing.
- **Picker as a popover on the selected row.** Rejected: hidden when
  "Marked only" filters out the current row; a fixed bar is always reachable.
- **A second, full-size mark bar in the Moves panel.** Dropped when the list
  moved next to the comment panel: it duplicated the comment bar and took two
  rows from an already small section.

## Limitations

- Only the current branch is listed; other variations show in the game tree.
- Long games are rendered without virtualization (a few hundred rows).
