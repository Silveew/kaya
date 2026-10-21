/**
 * Moves tab: the current branch as a list with each move's annotation marks
 * and comment. Clicking a row goes to that move; the mark bar on top sets the
 * current node's marks; Previous/Next mark jump between marked nodes.
 *
 * See specs/2026-10-21-moves-list.md.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuChevronLeft, LuChevronRight, LuFilter, LuEye } from 'react-icons/lu';
import { useGameTreeBoard, useGameTreeCore, useGameTreeNavigation } from '../../contexts/selectors';
import { AnnotationMarkBar } from '../editors/AnnotationMarkBar';
import { MARK_TONE_COLORS, type MarkDefinition } from '../../utils/annotations';
import {
  buildMoveRows,
  findMarkedRow,
  getBranch,
  hasMark,
  type MoveRow,
} from '../../utils/moveList';
import './MovesTab.css';

function MarkBadge({ mark }: { mark: MarkDefinition<string> }) {
  return (
    <span className="moves-tab-badge" style={{ backgroundColor: MARK_TONE_COLORS[mark.tone] }}>
      {mark.glyph}
    </span>
  );
}

export const MovesTab: React.FC = () => {
  const { t } = useTranslation();
  const { gameTree, currentNodeId } = useGameTreeCore();
  const { gameInfo, gameSettings, setGameSettings } = useGameTreeBoard();
  const { goToNode } = useGameTreeNavigation();
  const [markedOnly, setMarkedOnly] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);

  const rows = useMemo(() => {
    if (!gameTree || currentNodeId === null) return [];
    return buildMoveRows(getBranch(gameTree, currentNodeId), gameInfo.boardSize ?? 19);
  }, [gameTree, currentNodeId, gameInfo.boardSize]);

  const currentIndex = rows.findIndex(r => String(r.nodeId) === String(currentNodeId));
  const visibleRows = markedOnly ? rows.filter(hasMark) : rows;
  const previousMarked = findMarkedRow(rows, currentIndex, -1);
  const nextMarked = findMarkedRow(rows, currentIndex, 1);

  // Keep the current row in view without scrolling anything outside the list.
  useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!list || !row) return;
    // The list is positioned, so offsetTop is relative to it.
    const top = row.offsetTop;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = top + row.offsetHeight - list.clientHeight;
    }
  }, [currentNodeId, markedOnly]);

  const rowLabel = (row: MoveRow) =>
    row.index === 0 ? t('moves.start') : row.coord === 'pass' ? t('moves.pass') : row.coord;

  return (
    <div className="moves-tab">
      <div className="moves-tab-toolbar">
        <button
          type="button"
          className="moves-tab-button"
          title={t('moves.previousMark')}
          aria-label={t('moves.previousMark')}
          disabled={!previousMarked}
          onClick={() => previousMarked && goToNode(previousMarked.nodeId)}
        >
          <LuChevronLeft size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="moves-tab-button"
          title={t('moves.nextMark')}
          aria-label={t('moves.nextMark')}
          disabled={!nextMarked}
          onClick={() => nextMarked && goToNode(nextMarked.nodeId)}
        >
          <LuChevronRight size={14} aria-hidden="true" />
        </button>
        <span className="moves-tab-toolbar-spacer" />
        <button
          type="button"
          className="moves-tab-button"
          title={t('moves.markedOnly')}
          aria-label={t('moves.markedOnly')}
          aria-pressed={markedOnly}
          onClick={() => setMarkedOnly(on => !on)}
        >
          <LuFilter size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="moves-tab-button"
          title={t('moves.allMarksOnBoard')}
          aria-label={t('moves.allMarksOnBoard')}
          aria-pressed={gameSettings.showAllMoveMarks}
          onClick={() => setGameSettings({ showAllMoveMarks: !gameSettings.showAllMoveMarks })}
        >
          <LuEye size={14} aria-hidden="true" />
        </button>
      </div>

      {currentIndex >= 0 && <AnnotationMarkBar className="moves-tab-picker" />}

      {visibleRows.length === 0 ? (
        <div className="moves-tab-empty">
          {markedOnly ? t('moves.noMarkedMoves') : t('moves.noMoves')}
        </div>
      ) : (
        <ol ref={listRef} className="moves-tab-list" aria-label={t('analysisPanel.movesTab')}>
          {visibleRows.map(row => (
            <li key={row.nodeId}>
              <button
                type="button"
                className="moves-tab-row"
                aria-current={row.index === currentIndex ? 'true' : undefined}
                onClick={() => goToNode(row.nodeId)}
              >
                <span className="moves-tab-number">{row.color ? row.moveNumber : ''}</span>
                <span
                  className={`moves-tab-stone${row.color ? ` moves-tab-stone-${row.color}` : ''}`}
                  aria-label={row.color ? t(`moves.${row.color}`) : undefined}
                />
                <span className="moves-tab-coord">{rowLabel(row)}</span>
                <span className="moves-tab-marks">
                  {row.moveMark && <MarkBadge mark={row.moveMark} />}
                  {row.positionMark && <MarkBadge mark={row.positionMark} />}
                </span>
                <span className="moves-tab-comment">{row.comment}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
