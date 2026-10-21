---
date: 2026-10-21
status: shipped
scope: ui/gametree, library
---

# Export position: save a move's position as its own game

## Context

Building a personal database of interesting positions meant copying a game,
deleting everything before the move, and recreating the board by hand. The
analysis that makes the position interesting (comments, variations, `KA`
data) lives in the tree after that move, and should come along.

## Decision

- The game tree menu (right-click or long-press on a stone) gets **Export
  position…**. A small dialog asks for an optional title, then the position is
  saved as a new game in a top-level library folder named `Positions`, which is
  created on first use. With a library folder on desktop, that is a real
  `Positions/` directory next to the other games.
- The exported SGF (`utils/exportPosition.ts`, pure and unit tested):
  - **Root** = the board at the chosen node as `AB`/`AW` setup stones (taken
    from the board Kaya shows, so captures are already applied), with `PL` set
    to the side to move. `HA` is dropped since the handicap stones are already
    on the board.
  - The chosen node's own properties (comment, name, markup, `KA` analysis)
    move to the root, because they describe the position after its move.
    Properties of the move itself (`B`/`W`, `BM`/`TE`/`DO`/`IT`, time left,
    `KO`, `MN`) are dropped.
  - Game info and format properties are copied from the source root; its
    comment and setup are not.
  - **Children** = a deep copy of the whole tree below the node: main line,
    variations and their analysis.
  - `GN` = the title, if given. `GC` starts with `From <source file>, move N`
    so the position can be traced back to its game.
- File name: the title, or `<source file> - move N`. Existing names get the
  library's usual de-duplication.
- The source game is not modified.
- The dialog captures the tree, node and board when it opens, so navigating
  while it is open does not change what gets exported.

## Alternatives considered

- **Marking the node in the source game** (`HO` hotspot, a custom property)
  and extracting later. Rejected: the source stays untouched and the
  positions folder is the database. A hotspot also means something else in
  other SGF tools.
- **Root = position before the move, first node = the move.** Rejected: the
  position worth keeping is the one where it is your turn to think, and the
  node's analysis is for the position after its move.
- **Save dialog to an arbitrary path.** Rejected for now: writing through
  the library works on web and desktop alike, and keeps positions next to the
  games.

## Limitations

- Ko state and capture counts at the chosen move are not carried over (SGF
  setup has no way to say either).
- The folder name is fixed (`Positions`, not translated) so the database
  keeps one name across languages.
