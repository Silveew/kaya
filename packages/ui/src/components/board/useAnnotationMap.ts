/**
 * Annotation badges for the board: the move mark (TE/BM/IT/DO) of the
 * current node, drawn on the stone it played.
 *
 * See specs/2026-10-21-annotation-marks.md.
 */

import { useMemo } from 'react';
import type { AnnotationBadge, BoardMap, Vertex } from '@kaya/shudan';
import type { SGFProperty } from '../../types/game';
import { getMoveMark, MARK_TONE_COLORS } from '../../utils/annotations';

export function useAnnotationMap(
  currentNode: { data: SGFProperty } | null,
  lastMove: Vertex | null,
  width: number,
  height: number
): BoardMap<AnnotationBadge> | null {
  return useMemo(() => {
    if (!currentNode || !lastMove) return null;
    const mark = getMoveMark(currentNode.data);
    if (!mark) return null;
    const [x, y] = lastMove;
    if (x < 0 || y < 0 || x >= width || y >= height) return null;

    const map: BoardMap<AnnotationBadge> = Array.from({ length: height }, () =>
      Array<AnnotationBadge | null>(width).fill(null)
    );
    map[y][x] = { text: mark.glyph, color: MARK_TONE_COLORS[mark.tone] };
    return map;
  }, [currentNode, lastMove, width, height]);
}
