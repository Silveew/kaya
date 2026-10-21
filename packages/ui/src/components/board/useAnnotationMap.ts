/**
 * Annotation badges for the board: the move mark (TE/BM/IT/DO) of the
 * current node, drawn on the stone it played. With "show all marks" on, every
 * marked stone of the current branch that is still on the board gets one.
 *
 * See specs/2026-10-21-annotation-marks.md and specs/2026-10-21-moves-list.md.
 */

import { useMemo } from 'react';
import type { AnnotationBadge, BoardMap, Vertex } from '@kaya/shudan';
import type { GameTree } from '@kaya/gametree';
import type { SGFProperty } from '../../types/game';
import { getMoveMark, MARK_TONE_COLORS, type MarkDefinition } from '../../utils/annotations';
import { buildMoveRows, collectBoardMoveMarks, getBranch } from '../../utils/moveList';

interface AnnotationMapInput {
  gameTree: GameTree<SGFProperty> | null;
  currentNodeId: number | string | null;
  currentNode: { data: SGFProperty } | null;
  lastMove: Vertex | null;
  signMap: number[][];
  showAll: boolean;
}

export function useAnnotationMap({
  gameTree,
  currentNodeId,
  currentNode,
  lastMove,
  signMap,
  showAll,
}: AnnotationMapInput): BoardMap<AnnotationBadge> | null {
  return useMemo(() => {
    const height = signMap.length;
    const width = signMap[0]?.length ?? height;
    const marks: { x: number; y: number; mark: MarkDefinition<string> }[] = [];

    if (showAll && gameTree && currentNodeId !== null) {
      const path = getBranch(gameTree, currentNodeId);
      const currentIndex = path.findIndex(n => String(n.id) === String(currentNodeId));
      marks.push(...collectBoardMoveMarks(buildMoveRows(path, height), currentIndex, signMap));
    } else if (currentNode && lastMove) {
      const mark = getMoveMark(currentNode.data);
      if (mark) marks.push({ x: lastMove[0], y: lastMove[1], mark });
    }

    const onBoard = marks.filter(({ x, y }) => x >= 0 && y >= 0 && x < width && y < height);
    if (onBoard.length === 0) return null;

    const map: BoardMap<AnnotationBadge> = Array.from({ length: height }, () =>
      Array<AnnotationBadge | null>(width).fill(null)
    );
    for (const { x, y, mark } of onBoard) {
      map[y][x] = { text: mark.glyph, color: MARK_TONE_COLORS[mark.tone] };
    }
    return map;
  }, [gameTree, currentNodeId, currentNode, lastMove, signMap, showAll]);
}
