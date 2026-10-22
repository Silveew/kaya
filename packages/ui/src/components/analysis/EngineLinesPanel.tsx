/**
 * EngineLinesPanel - the engine's candidate moves for the current position,
 * best first, with their evaluation; like a chess engine's top lines.
 *
 * A header row carries the search depth (visits per position) and live
 * progress; the list below fills the rest of the panel and scrolls.
 * Clicking a row plays that move on the board (as a variation when it differs
 * from the game). Continuations (principal variations) aren't shown yet: the
 * engine reports one move per candidate.
 */

import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuSearch } from 'react-icons/lu';
import { useGameTreeAI, useGameTreeActions, useGameTreeBoard } from '../../contexts/selectors';
import { useAIAnalysis } from '../ai/AIAnalysisOverlay';
import { VISITS_PRESETS } from '../ai/mcts-visits-presets';
import { MctsVisitsPopover } from '../board/MctsVisitsPopover';
import { parseGTPCoordinate } from '../../utils/gtpUtils';
import './EngineLinesPanel.css';

const MAX_LINES = 10;

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
  const { showAnalysisBar, toggleShowAnalysisBar, setAISettings } = useGameTreeAI();
  const { currentBoard } = useGameTreeBoard();
  const { playMove } = useGameTreeActions();
  const { analysisResult, mctsProgress, nextMoveInfo, configuredNumVisits } = useAIAnalysis();
  const [depthOpen, setDepthOpen] = useState(false);
  const depthButtonRef = useRef<HTMLButtonElement>(null);

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

  return (
    <div className="engine-lines">
      <div className="engine-lines__bar">
        <button
          ref={depthButtonRef}
          type="button"
          className="engine-lines__depth"
          onClick={() => setDepthOpen(open => !open)}
          aria-haspopup="dialog"
          aria-expanded={depthOpen}
          title={t('analysisBar.visitsTooltip', { count: configuredNumVisits })}
        >
          <LuSearch size={13} />
          {t('engineLines.visits', { count: configuredNumVisits })}
        </button>
        <MctsVisitsPopover
          open={depthOpen}
          presets={VISITS_PRESETS}
          current={configuredNumVisits}
          anchorRef={depthButtonRef}
          onSelect={value => setAISettings({ numVisits: value })}
          onClose={() => setDepthOpen(false)}
        />
        {mctsProgress && mctsProgress.completedVisits < mctsProgress.totalVisits && (
          <span className="engine-lines__progress">
            {mctsProgress.completedVisits}/{mctsProgress.totalVisits}
          </span>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="engine-lines--empty engine-lines__waiting">{t('engineLines.waiting')}</div>
      ) : (
        <div className="engine-lines__table" role="table" aria-label={t('engineLines.title')}>
          <div className="engine-lines__row engine-lines__row--head" role="row">
            <span role="columnheader">#</span>
            <span role="columnheader">{t('engineLines.move')}</span>
            <span role="columnheader">{t('engineLines.score')}</span>
            <span role="columnheader">{t('engineLines.winRate')}</span>
            <span role="columnheader">{t('engineLines.policy')}</span>
          </div>
          <div className="engine-lines__body">
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
                  <span role="cell">
                    {line.policy !== undefined ? formatPercent(line.policy) : '—'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
