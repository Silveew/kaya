/**
 * EngineLinesPanel - the engine's candidate moves for the current position,
 * best first, with their evaluation; like a chess engine's top lines.
 *
 * Clicking a row plays that move on the board (as a variation when it differs
 * from the game). Continuations (principal variations) aren't shown yet: the
 * engine reports one move per candidate.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGameTreeAI, useGameTreeActions, useGameTreeBoard } from '../../contexts/selectors';
import { useAIAnalysis } from '../ai/AIAnalysisOverlay';
import { parseGTPCoordinate } from '../../utils/gtpUtils';
import './EngineLinesPanel.css';

const MAX_LINES = 8;

interface EngineLine {
  move: string;
  winRate?: number;
  scoreLead?: number;
  policy?: number;
}

const formatLead = (lead: number) => `${lead >= 0 ? 'B' : 'W'}+${Math.abs(lead).toFixed(1)}`;
const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

export const EngineLinesPanel: React.FC = () => {
  const { t } = useTranslation();
  const { showAnalysisBar, toggleShowAnalysisBar } = useGameTreeAI();
  const { currentBoard } = useGameTreeBoard();
  const { playMove } = useGameTreeActions();
  const { analysisResult, mctsProgress, nextMoveInfo } = useAIAnalysis();

  if (!showAnalysisBar) {
    return (
      <div className="engine-lines engine-lines--empty">
        <button type="button" className="engine-lines__start" onClick={toggleShowAnalysisBar}>
          {t('engineLines.start')}
        </button>
      </div>
    );
  }

  const lines: EngineLine[] = mctsProgress?.topMoves.length
    ? mctsProgress.topMoves.map(m => ({ move: m.move, winRate: m.winRate, scoreLead: m.scoreLead }))
    : (analysisResult?.moveSuggestions ?? []).map(s => ({
        move: s.move,
        winRate: s.winRate,
        scoreLead: s.scoreLead,
        policy: s.probability,
      }));
  const shown = lines.slice(0, MAX_LINES);
  const sign = analysisResult?.currentTurn === 'W' ? -1 : 1;
  const boardSize = currentBoard.signMap.length;

  if (shown.length === 0) {
    return <div className="engine-lines engine-lines--empty">{t('engineLines.waiting')}</div>;
  }

  return (
    <div className="engine-lines" role="table" aria-label={t('engineLines.title')}>
      <div className="engine-lines__row engine-lines__row--head" role="row">
        <span role="columnheader">#</span>
        <span role="columnheader">{t('engineLines.move')}</span>
        <span role="columnheader">{t('engineLines.score')}</span>
        <span role="columnheader">{t('engineLines.winRate')}</span>
        <span role="columnheader">{t('engineLines.policy')}</span>
      </div>
      {shown.map((line, index) => {
        const vertex = parseGTPCoordinate(line.move, boardSize);
        const isPlayed = nextMoveInfo?.gtp === line.move;
        return (
          <button
            type="button"
            role="row"
            key={line.move}
            className={`engine-lines__row${index === 0 ? ' is-best' : ''}${isPlayed ? ' is-played' : ''}`}
            onClick={() => vertex && playMove(vertex, sign as 1 | -1)}
            disabled={!vertex}
            title={isPlayed ? t('engineLines.played') : t('engineLines.playIt')}
          >
            <span role="cell">{index + 1}</span>
            <span role="cell" className="engine-lines__move">
              {line.move}
            </span>
            <span role="cell">
              {line.scoreLead !== undefined ? formatLead(line.scoreLead) : '—'}
            </span>
            <span role="cell">
              {line.winRate !== undefined ? formatPercent(line.winRate) : '—'}
            </span>
            <span role="cell">{line.policy !== undefined ? formatPercent(line.policy) : '—'}</span>
          </button>
        );
      })}
    </div>
  );
};
