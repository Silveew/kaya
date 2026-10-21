---
date: 2026-10-21
status: shipped
scope: ui/gametree, ui/board, shudan, shortcuts
---

# Annotation marks: show and set SGF move and position marks

## Context

SGF has native annotation properties that Kaya kept on load and save but
never showed or let you set: move marks `TE` (good move, tesuji), `BM` (bad
move), `IT` (interesting), `DO` (doubtful), and position marks `GB`/`GW`
(good for Black/White), `DM` (even), `UC` (unclear). Files from Sabaki and
other editors often carry them, and reviewing a game means adding them.

## Decision

- **Glyphs** follow the chess convention, so the shape carries the meaning and
  colour only reinforces it: `!` `TE[1]`, `!!` `TE[2]`, `!?` `IT`, `?!` `DO`,
  `?` `BM[1]`, `??` `BM[2]`; `+B`/`++B` `GB[1]`/`GB[2]`, `+W`/`++W` `GW`,
  `=` `DM`, `∞` `UC`. The value 2 is FF[4]'s "emphasized". Badges are a
  colour per tone (good, interesting, doubtful, bad, position) with dark
  text, which reads on both UI themes and every board theme.
- **Model** (`utils/annotations.ts`, pure and unit tested): a node holds at
  most one move mark and one position mark. Setting a mark removes the other
  properties of its kind; `IT`/`DO` are written without a value. Conflicting
  properties from other files resolve to the first of `TE, BM, IT, DO` (and
  `GB, GW, DM, UC`); a missing or malformed double reads as 1.
- **Game tree**: a badge at the stone's bottom-left corner (the other corners
  hold the comment, markup and setup dots).
- **Board**: a badge at the top-right of the current move's stone, via a new
  `annotationMap` prop on the shudan `Goban` (a `BoardMap<AnnotationBadge>`,
  so later work can badge more than one stone).
- **Setting marks**: the game tree menu gets **Mark move ›** and **Mark
  position ›** flyout submenus. Items are radio items showing the current
  mark; picking the current one again clears it, and each submenu ends with
  **Clear mark**. **Mark move** is disabled on nodes without a `B`/`W` move,
  where FF[4] does not allow move annotations. The context menu gained
  generic submenu support (hover, click/tap, ArrowRight/ArrowLeft) and
  shortcut hints.
- **Shortcuts** (customizable, `edit` category): Alt/⌥+1 good, +Shift !!,
  ⌥2 interesting, ⌥3 doubtful, ⌥4 bad, +Shift ??, ⌥0 clear. They toggle, like
  the menu. macOS Option rewrites `event.key` (⌥1 is `¡`), so bindings with
  Alt or Shift also match on the physical key (`event.code`), and recording a
  binding stores the physical letter or digit.

## Alternatives considered

- **A mark bar in the comment panel** (one-click toggle buttons). Kept for
  later; the menu plus shortcuts fit the existing tree workflow without a new
  panel row.
- **Colour-only marks** (coloured rings). Rejected: indistinguishable for
  colour-blind users and clashes with the current-node ring.
- **`HO` hotspot**: not part of this change; it means "important node", not
  a judgement of the move.

## Limitations

- Only the current move's mark shows on the board. A Moves list that shows
  every mark (and badges all marked stones) is planned as a follow-up.
- Position marks have no default shortcut.
