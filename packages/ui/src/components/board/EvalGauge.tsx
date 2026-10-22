/**
 * EvalGauge - vertical bar showing who is ahead in the current position.
 *
 * Black fills from the bottom; by default on a log scale of the score lead
 * (View › Eval Bar switches to win rate), see evalGaugeScale.ts. It keeps its
 * place while analysis is off (greyed out, click to start), so turning
 * analysis on or off never moves the board.
 *
 * While a new position is being analyzed the bar holds the last evaluation
 * instead of falling back to the middle, and only moves once the search has
 * done a quarter of its visits, so stepping through moves doesn't flicker.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameTreeAI, useGameTreeBoard } from '../../contexts/selectors';
import { useAIAnalysis } from '../ai/AIAnalysisOverlay';
import { evalGaugeShare } from './evalGaugeScale';
import './EvalGauge.css';

interface EvalGaugeProps {
  /** Pixel height of the board, so the gauge lines up with it. */
  height: number;
}

interface Evaluation {
  winRate: number;
  scoreLead: number | null;
}

/** Share of the configured visits after which live search results are shown. */
const SETTLED_FRACTION = 0.25;

export const EvalGauge: React.FC<EvalGaugeProps> = ({ height }) => {
  const { t } = useTranslation();
  const { showAnalysisBar, toggleShowAnalysisBar } = useGameTreeAI();
  const { gameSettings } = useGameTreeBoard();
  const { analysisResult, mctsProgress, isAnalyzing, isInitializing } = useAIAnalysis();

  const settledProgress =
    mctsProgress &&
    mctsProgress.completedVisits >= Math.max(1, mctsProgress.totalVisits * SETTLED_FRACTION)
      ? mctsProgress
      : null;
  const fresh: Evaluation | null = analysisResult
    ? { winRate: analysisResult.winRate, scoreLead: analysisResult.scoreLead ?? null }
    : settledProgress
      ? { winRate: settledProgress.winRate, scoreLead: settledProgress.scoreLead }
      : null;

  // Hold the last evaluation while the next one is on its way
  const [held, setHeld] = useState<Evaluation | null>(null);
  const freshWinRate = fresh?.winRate;
  const freshLead = fresh?.scoreLead;
  useEffect(() => {
    if (!showAnalysisBar) setHeld(null);
    else if (freshWinRate !== undefined) {
      setHeld({ winRate: freshWinRate, scoreLead: freshLead ?? null });
    }
  }, [showAnalysisBar, freshWinRate, freshLead]);
  const shown = showAnalysisBar ? (fresh ?? held) : null;

  const scale = gameSettings.evalGaugeScale;
  const blackShare = shown ? evalGaugeShare(scale, shown.winRate, shown.scoreLead) : 0.5;
  const lead =
    shown?.scoreLead != null
      ? `${shown.scoreLead >= 0 ? 'B' : 'W'}+${Math.abs(shown.scoreLead).toFixed(1)}`
      : null;
  const label = !shown ? null : scale === 'winRate' ? `${(shown.winRate * 100).toFixed(0)}%` : lead;
  const blackAhead = shown ? (shown.scoreLead ?? shown.winRate - 0.5) >= 0 : true;

  const title = !showAnalysisBar
    ? t('evalGauge.start')
    : shown
      ? t('evalGauge.value', { winRate: (shown.winRate * 100).toFixed(1), lead: lead ?? '—' })
      : t('evalGauge.waiting');

  return (
    <button
      type="button"
      className={`eval-gauge${shown ? '' : ' is-idle'}${isAnalyzing || isInitializing ? ' is-busy' : ''}`}
      style={{ height }}
      onClick={toggleShowAnalysisBar}
      title={title}
      aria-label={title}
      aria-pressed={showAnalysisBar}
    >
      <span className="eval-gauge__black" style={{ height: `${blackShare * 100}%` }} />
      <span className="eval-gauge__midline" />
      {label && (
        <span
          className={`eval-gauge__label ${blackAhead ? 'eval-gauge__label--black' : 'eval-gauge__label--white'}`}
        >
          {label}
        </span>
      )}
    </button>
  );
};
