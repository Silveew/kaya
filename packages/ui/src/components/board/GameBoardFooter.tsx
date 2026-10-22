/**
 * GameBoardFooter - what sits under the board: the score estimator while
 * scoring, otherwise the players and navigation (BoardControls).
 *
 * Framed (desktop): BoardControls always, at a fixed height; the score
 * estimator floats over the board instead, so scoring doesn't resize it.
 * Otherwise the controls can be collapsed and scoring replaces them.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { LuChevronDown, LuChevronUp } from 'react-icons/lu';
import { useGameTreeBoard, useGameTreeScore } from '../../contexts/selectors';
import { BoardControls } from './BoardControls';
import { ScoreEstimator } from './ScoreEstimator';

interface GameBoardFooterProps {
  framed: boolean;
}

/** The score estimator, wired to the scoring state. Null when not scoring. */
export const GameBoardScoreEstimator: React.FC = () => {
  const { gameInfo } = useGameTreeBoard();
  const {
    scoringMode,
    scoreData,
    deadStones,
    clearDeadStones,
    autoEstimateDeadStones,
    toggleScoringMode,
    isEstimating,
    estimationMode,
    toggleEstimationMode,
  } = useGameTreeScore();
  if (!scoringMode || !scoreData) return null;
  return (
    <ScoreEstimator
      scoreData={scoreData}
      deadStones={deadStones}
      playerBlack={gameInfo.playerBlack}
      playerWhite={gameInfo.playerWhite}
      onClear={clearDeadStones}
      onAutoEstimate={autoEstimateDeadStones}
      onDone={toggleScoringMode}
      isEstimating={isEstimating}
      estimationMode={estimationMode}
      onToggleEstimationMode={toggleEstimationMode}
    />
  );
};

export const GameBoardFooter: React.FC<GameBoardFooterProps> = ({ framed }) => {
  const { t } = useTranslation();
  const { gameSettings, setGameSettings } = useGameTreeBoard();
  const { scoringMode, scoreData } = useGameTreeScore();

  if (framed) {
    return (
      <div className="gameboard-footer--framed">
        <BoardControls reserveBranchRow />
      </div>
    );
  }

  const showControls = gameSettings.showBoardControls;
  return (
    <>
      {!scoringMode && (
        <button
          className="board-controls-collapse-bar"
          onClick={() => setGameSettings({ showBoardControls: !showControls })}
          tabIndex={-1}
          title={
            showControls ? t('gameboardActions.hideControls') : t('gameboardActions.showControls')
          }
        >
          {showControls ? <LuChevronDown size={10} /> : <LuChevronUp size={10} />}
        </button>
      )}
      {scoringMode && scoreData ? <GameBoardScoreEstimator /> : showControls && <BoardControls />}
    </>
  );
};
