/**
 * SGF annotation marks: move marks (TE, BM, IT, DO) and position marks
 * (GB, GW, DM, UC).
 *
 * Each mark is a native FF[4] property. TE/BM/GB/GW/DM/UC take a "double"
 * value where 2 means emphasized ("very good move", "clearly good for
 * Black"); IT and DO take none. A node holds at most one move mark and one
 * position mark. Glyphs follow the chess convention so the shape carries the
 * meaning and colour only reinforces it.
 *
 * See specs/2026-10-21-annotation-marks.md.
 */

import type { SGFProperty } from '../types/game';

export type MoveMarkId = 'veryGood' | 'good' | 'interesting' | 'doubtful' | 'bad' | 'veryBad';
export type PositionMarkId =
  | 'goodForBlack'
  | 'clearlyGoodForBlack'
  | 'goodForWhite'
  | 'clearlyGoodForWhite'
  | 'even'
  | 'unclear';

/** Colour family of a mark: drives the badge colour in the tree and on the board. */
export type MarkTone = 'good' | 'interesting' | 'doubtful' | 'bad' | 'position';

export interface MarkDefinition<Id extends string> {
  id: Id;
  /** SGF property identifier. */
  prop: string;
  /** SGF value written for this mark ('' for IT/DO, which take none). */
  value: string;
  glyph: string;
  tone: MarkTone;
}

/** Move marks, ordered from best to worst (menu order). */
export const MOVE_MARKS: readonly MarkDefinition<MoveMarkId>[] = [
  { id: 'good', prop: 'TE', value: '1', glyph: '!', tone: 'good' },
  { id: 'veryGood', prop: 'TE', value: '2', glyph: '!!', tone: 'good' },
  { id: 'interesting', prop: 'IT', value: '', glyph: '!?', tone: 'interesting' },
  { id: 'doubtful', prop: 'DO', value: '', glyph: '?!', tone: 'doubtful' },
  { id: 'bad', prop: 'BM', value: '1', glyph: '?', tone: 'bad' },
  { id: 'veryBad', prop: 'BM', value: '2', glyph: '??', tone: 'bad' },
];

export const POSITION_MARKS: readonly MarkDefinition<PositionMarkId>[] = [
  { id: 'goodForBlack', prop: 'GB', value: '1', glyph: '+B', tone: 'position' },
  { id: 'clearlyGoodForBlack', prop: 'GB', value: '2', glyph: '++B', tone: 'position' },
  { id: 'goodForWhite', prop: 'GW', value: '1', glyph: '+W', tone: 'position' },
  { id: 'clearlyGoodForWhite', prop: 'GW', value: '2', glyph: '++W', tone: 'position' },
  { id: 'even', prop: 'DM', value: '1', glyph: '=', tone: 'position' },
  { id: 'unclear', prop: 'UC', value: '1', glyph: '∞', tone: 'position' },
];

export const MOVE_MARK_PROPS = ['TE', 'BM', 'IT', 'DO'] as const;
export const POSITION_MARK_PROPS = ['GB', 'GW', 'DM', 'UC'] as const;

/**
 * Find the mark a node carries among `marks`. Files from other editors may
 * hold several conflicting properties; the first in `props` order wins. A
 * double value other than 2 (including a missing or malformed one) reads as 1.
 */
function findMark<Id extends string>(
  data: SGFProperty,
  props: readonly string[],
  marks: readonly MarkDefinition<Id>[]
): MarkDefinition<Id> | null {
  for (const prop of props) {
    const values = data[prop];
    if (!values) continue;
    const emphasized = values[0]?.trim() === '2';
    const candidates = marks.filter(m => m.prop === prop);
    return candidates.find(m => m.value === '2' && emphasized) ?? candidates[0] ?? null;
  }
  return null;
}

export function getMoveMark(data: SGFProperty): MarkDefinition<MoveMarkId> | null {
  return findMark(data, MOVE_MARK_PROPS, MOVE_MARKS);
}

export function getPositionMark(data: SGFProperty): MarkDefinition<PositionMarkId> | null {
  return findMark(data, POSITION_MARK_PROPS, POSITION_MARKS);
}

export function getMoveMarkById(id: MoveMarkId): MarkDefinition<MoveMarkId> {
  return MOVE_MARKS.find(m => m.id === id)!;
}

export function getPositionMarkById(id: PositionMarkId): MarkDefinition<PositionMarkId> {
  return POSITION_MARKS.find(m => m.id === id)!;
}

/**
 * Property edits that put `mark` on a node and clear every other mark of the
 * same kind. `null` clears them all. Keys map to the new values, or to `null`
 * for a property to remove.
 */
export function markPropertyEdits(
  kind: 'move' | 'position',
  mark: MarkDefinition<string> | null
): Record<string, string[] | null> {
  const props = kind === 'move' ? MOVE_MARK_PROPS : POSITION_MARK_PROPS;
  const edits: Record<string, string[] | null> = {};
  for (const prop of props) edits[prop] = null;
  if (mark) edits[mark.prop] = [mark.value];
  return edits;
}

/**
 * Badge background per tone. Badges carry dark text on these, which reads in
 * both the light and dark UI themes and on every board theme.
 */
export const MARK_TONE_COLORS: Record<MarkTone, string> = {
  good: 'var(--mark-good, #4caf50)',
  interesting: 'var(--mark-interesting, #4a9eff)',
  doubtful: 'var(--mark-doubtful, #ffb300)',
  bad: 'var(--mark-bad, #f44336)',
  position: 'var(--mark-position, #e6e6e6)',
};
