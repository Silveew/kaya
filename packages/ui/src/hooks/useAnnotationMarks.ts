/**
 * Read and toggle the annotation marks of the current node.
 *
 * Shared by the game tree menu and the keyboard shortcuts. Picking the mark a
 * node already has clears it, so one shortcut both sets and removes a mark.
 *
 * See specs/2026-10-21-annotation-marks.md.
 */

import { useCallback, useEffect } from 'react';
import { useGameTreeBoard, useGameTreeEdit } from '../contexts/selectors';
import { useKeyboardShortcuts } from '../contexts/KeyboardShortcutsContext';
import type { ShortcutId } from './shortcutTypes';
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

const MOVE_MARK_SHORTCUTS: [ShortcutId, MoveMarkId][] = [
  ['mark.good', 'good'],
  ['mark.veryGood', 'veryGood'],
  ['mark.interesting', 'interesting'],
  ['mark.doubtful', 'doubtful'],
  ['mark.bad', 'bad'],
  ['mark.veryBad', 'veryBad'],
];

/** Keyboard shortcuts for move marks on the current node (⌥1 … ⌥4, ⌥0 clears). */
export function useAnnotationShortcuts(): void {
  const { matchesShortcut } = useKeyboardShortcuts();
  const { isMove, toggleMoveMark, clearMoveMark } = useAnnotationMarks();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }
      if (!isMove) return;

      for (const [shortcutId, markId] of MOVE_MARK_SHORTCUTS) {
        if (matchesShortcut(e, shortcutId)) {
          e.preventDefault();
          toggleMoveMark(markId);
          return;
        }
      }
      if (matchesShortcut(e, 'mark.clear')) {
        e.preventDefault();
        clearMoveMark();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [matchesShortcut, isMove, toggleMoveMark, clearMoveMark]);
}
