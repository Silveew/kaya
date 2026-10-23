/**
 * Read and toggle the annotation marks of the current node.
 *
 * Shared by the game tree menu and the keyboard shortcuts. Picking the mark a
 * node already has clears it, so one shortcut both sets and removes a mark.
 *
 * See specs/2026-10-21-annotation-marks.md.
 */

import { useCallback } from 'react';
import { useGameTreeBoard, useGameTreeEdit } from '../contexts/selectors';
import { useCommand } from '../commands/CommandsContext';
import {
  getMoveMark,
  getMoveMarkById,
  getPositionMark,
  getPositionMarkById,
  type MoveMarkId,
  type PositionMarkId,
} from '../utils/annotations';

export function useAnnotationMarks() {
  const { currentNode } = useGameTreeBoard();
  const { setAnnotationMark } = useGameTreeEdit();

  const moveMark = currentNode ? getMoveMark(currentNode.data) : null;
  const positionMark = currentNode ? getPositionMark(currentNode.data) : null;
  const moveMarkId = moveMark?.id ?? null;
  const positionMarkId = positionMark?.id ?? null;

  const toggleMoveMark = useCallback(
    (id: MoveMarkId) => setAnnotationMark('move', id === moveMarkId ? null : getMoveMarkById(id)),
    [setAnnotationMark, moveMarkId]
  );

  const togglePositionMark = useCallback(
    (id: PositionMarkId) =>
      setAnnotationMark('position', id === positionMarkId ? null : getPositionMarkById(id)),
    [setAnnotationMark, positionMarkId]
  );

  const clearMoveMark = useCallback(() => setAnnotationMark('move', null), [setAnnotationMark]);
  const clearPositionMark = useCallback(
    () => setAnnotationMark('position', null),
    [setAnnotationMark]
  );

  return {
    /** The current node plays a move (B or W), so a move mark applies to it. */
    isMove: !!(currentNode?.data.B || currentNode?.data.W),
    moveMark,
    positionMark,
    toggleMoveMark,
    togglePositionMark,
    clearMoveMark,
    clearPositionMark,
  };
}

/** Keyboard shortcuts for move marks on the current node (⌥1 … ⌥4, ⌥0 clears). */
export function useAnnotationShortcuts(): void {
  const { isMove, moveMark, toggleMoveMark, clearMoveMark } = useAnnotationMarks();
  const current = moveMark?.id ?? null;
  const markOptions = (id: MoveMarkId) => ({ enabled: isMove, checked: current === id });

  useCommand('mark.good', () => toggleMoveMark('good'), markOptions('good'));
  useCommand('mark.veryGood', () => toggleMoveMark('veryGood'), markOptions('veryGood'));
  useCommand('mark.interesting', () => toggleMoveMark('interesting'), markOptions('interesting'));
  useCommand('mark.doubtful', () => toggleMoveMark('doubtful'), markOptions('doubtful'));
  useCommand('mark.bad', () => toggleMoveMark('bad'), markOptions('bad'));
  useCommand('mark.veryBad', () => toggleMoveMark('veryBad'), markOptions('veryBad'));
  useCommand('mark.clear', clearMoveMark, { enabled: isMove && current !== null });
}
