/**
 * EvalGauge - vertical bar showing who is ahead in the current position.
 *
 * Black fills from the bottom by Black's win rate; the label carries the
 * score lead. It keeps its place while analysis is off (greyed out, click to
 * start), so turning analysis on or off never moves the board.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGameTreeAI } from '../../contexts/selectors';
import { useAIAnalysis } from '../ai/AIAnalysisOverlay';
import './EvalGauge.css';

interface EvalGaugeProps {
  /** Pixel height of the board, so the gauge lines up with it. */
  height: number;
}

export const EvalGauge: React.FC<EvalGaugeProps> = ({ height }) => {
  const { t } = useTranslation();
  const { showAnalysisBar, toggleShowAnalysisBar } = useGameTreeAI();
  const { analysisResult, mctsProgress, isAnalyzing, isInitializing } = useAIAnalysis();

  const winRate = mctsProgress?.winRate ?? analysisResult?.winRate ?? null;
  const scoreLead = mctsProgress?.scoreLead ?? analysisResult?.scoreLead ?? null;
  const active = showAnalysisBar && winRate !== null;

  const blackShare = active ? Math.min(Math.max(winRate, 0), 1) : 0.5;
  const lead =
    active && scoreLead !== null
      ? `${scoreLead >= 0 ? 'B' : 'W'}+${Math.abs(scoreLead).toFixed(1)}`
      : null;
  const blackAhead = (scoreLead ?? 0) >= 0;

  const title = !showAnalysisBar
    ? t('evalGauge.start')
    : active
      ? t('evalGauge.value', {
          winRate: (blackShare * 100).toFixed(1),
          lead: lead ?? '—',
        })
      : t('evalGauge.waiting');

  return (
    <button
      type="button"
      className={`eval-gauge${active ? '' : ' is-idle'}${isAnalyzing || isInitializing ? ' is-busy' : ''}`}
      style={{ height }}
      onClick={toggleShowAnalysisBar}
      title={title}
      aria-label={title}
      aria-pressed={showAnalysisBar}
    >
      <span className="eval-gauge__black" style={{ height: `${blackShare * 100}%` }} />
      <span className="eval-gauge__midline" />
      {lead && (
        <span
          className={`eval-gauge__label ${blackAhead ? 'eval-gauge__label--black' : 'eval-gauge__label--white'}`}
        >
          {lead}
        </span>
      )}
    </button>
  );
};
