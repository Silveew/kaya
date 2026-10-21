/**
 * Moves panel: the current branch as a list with each move's annotation marks
 * and comment. Clicking a row goes to that move; Previous/Next mark jump
 * between marked nodes. Marks are set from the comment panel's mark bar.
 *
 * See specs/2026-10-21-moves-list.md.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuChevronLeft, LuChevronRight, LuFilter, LuEye } from 'react-icons/lu';
import { useGameTreeBoard, useGameTreeCore, useGameTreeNavigation } from '../../contexts/selectors';
import { MARK_TONE_COLORS, type MarkDefinition } from '../../utils/annotations';
import {
  buildMoveRows,
  findMarkedRow,
  getBranch,
  hasMark,
  type MoveRow,
} from '../../utils/moveList';
import './MovesPanel.css';

function MarkBadge({ mark }: { mark: MarkDefinition<string> }) {
  return (
    <span className="moves-panel-badge" style={{ backgroundColor: MARK_TONE_COLORS[mark.tone] }}>
      {mark.glyph}
    </span>
  );
}

export const MovesPanel: React.FC = () => {
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
    <div className="moves-panel">
      <div className="moves-panel-toolbar">
        <button
          type="button"
          className="moves-panel-button"
          title={t('moves.previousMark')}
          aria-label={t('moves.previousMark')}
          disabled={!previousMarked}
          onClick={() => previousMarked && goToNode(previousMarked.nodeId)}
        >
          <LuChevronLeft size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="moves-panel-button"
          title={t('moves.nextMark')}
          aria-label={t('moves.nextMark')}
          disabled={!nextMarked}
          onClick={() => nextMarked && goToNode(nextMarked.nodeId)}
        >
          <LuChevronRight size={14} aria-hidden="true" />
        </button>
        <span className="moves-panel-toolbar-spacer" />
        <button
          type="button"
          className="moves-panel-button"
          title={t('moves.markedOnly')}
          aria-label={t('moves.markedOnly')}
          aria-pressed={markedOnly}
          onClick={() => setMarkedOnly(on => !on)}
        >
          <LuFilter size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="moves-panel-button"
          title={t('moves.allMarksOnBoard')}
          aria-label={t('moves.allMarksOnBoard')}
          aria-pressed={gameSettings.showAllMoveMarks}
          onClick={() => setGameSettings({ showAllMoveMarks: !gameSettings.showAllMoveMarks })}
        >
          <LuEye size={14} aria-hidden="true" />
        </button>
      </div>

      {visibleRows.length === 0 ? (
        <div className="moves-panel-empty">
          {markedOnly ? t('moves.noMarkedMoves') : t('moves.noMoves')}
        </div>
      ) : (
        <ol ref={listRef} className="moves-panel-list" aria-label={t('panels.moves')}>
          {visibleRows.map(row => (
            <li key={row.nodeId}>
              <button
                type="button"
                className="moves-panel-row"
                aria-current={row.index === currentIndex ? 'true' : undefined}
                onClick={() => goToNode(row.nodeId)}
              >
                <span className="moves-panel-number">{row.color ? row.moveNumber : ''}</span>
                <span
                  className={`moves-panel-stone${row.color ? ` moves-panel-stone-${row.color}` : ''}`}
                  aria-label={row.color ? t(`moves.${row.color}`) : undefined}
                />
                <span className="moves-panel-coord">{rowLabel(row)}</span>
                <span className="moves-panel-marks">
                  {row.moveMark && <MarkBadge mark={row.moveMark} />}
                  {row.positionMark && <MarkBadge mark={row.positionMark} />}
                </span>
                <span className="moves-panel-comment">{row.comment}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
