/**
 * GameBoard Component
 *
 * Main Go game board integrated with GameTreeContext
 * Includes the board and control bar at the bottom
 */

import React, { useCallback, useRef, useEffect, useState, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Goban } from '@kaya/shudan';
import type { Vertex } from '@kaya/shudan';
import { sgfToVertex } from '@kaya/sgf';
import { useGameSounds } from '../../useGameSounds';
import {
  useGameTreeBoard,
  useGameTreeActions,
  useGameTreeScore,
  useGameTreeAI,
  useGameTreeEdit,
  useGameTreeNavigation,
  useGameTreeCore,
} from '../../contexts/selectors';
import { useBoardNavigation } from '../../contexts/BoardNavigationContext';
import { useFuzzyPlacement } from '../../useFuzzyPlacement';
import { useBoardSwipeNavigation } from '../../hooks/useSwipeGesture';
import { useIsTouchDevice, useLayoutMode } from '../../hooks/useMediaQuery';
import { GameBoardFooter, GameBoardScoreEstimator } from './GameBoardFooter';
import { BoardToolRail } from './BoardToolRail';
import { EvalGauge } from './EvalGauge';
import { useBoardToolCommands } from './boardTools';
import { EditToolbar } from '../editors/EditToolbar';
import { useAIAnalysis } from '../ai/AIAnalysisOverlay';
import { useGameTree } from '../../contexts/GameTreeContext';
import { ConfirmationDialog } from '../dialogs/ConfirmationDialog';
import { AnalysisLegendModal } from '../analysis/AnalysisLegendModal';
import { AnalysisBar } from './AnalysisBar';
import { GameBoardActionBar } from './GameBoardActionBar';
import {
  useGameBoardState,
  useAIMoveGeneration,
  useGameBoardKeyboard,
  useNavigationModeHandler,
} from './gameboard-hooks';
import {
  usePlaceOrToggleMarker,
  useLastMove,
  useVertexSize,
  useVertexClickHandler,
  useMarkerDragHandlers,
  useVertexRightClickHandler,
  useScoringDimmedVertices,
} from './gameboard-interactions';
import { useBoardControlsKeyNav } from './useBoardControlsKeyNav';
import { useAnnotationMap } from './useAnnotationMap';
import { useAnnotationShortcuts } from '../../hooks/useAnnotationMarks';
import { useCommand } from '../../commands/CommandsContext';
import './GameBoard.css';
import './GameBoardFramed.css';
import './GameBoardAnalysisSummary.css';

export const GameBoard: React.FC = memo(() => {
  const { t } = useTranslation();
  const {
    currentBoard,
    currentNode,
    nextMoveNode,
    markerMap,
    gameInfo,
    gameId,
    gameSettings,
    setGameSettings,
  } = useGameTreeBoard();
  const { playMove, resign, placeStoneDirect, removeSetupStone } = useGameTreeActions();
  const { scoringMode, deadStones, toggleDeadStones, toggleScoringMode, territoryMap } =
    useGameTreeScore();
  const layoutMode = useLayoutMode();
  const { showAnalysisBar, toggleShowAnalysisBar } = useGameTreeAI();
  const [showMoveStrengthInfo, setShowMoveStrengthInfo] = useState(false);
  const { editMode, toggleEditMode, editTool, editPlayMode, addMarker, removeMarker } =
    useGameTreeEdit();
  const { goBack, goForward } = useGameTreeNavigation();

  const { navigationMode, cursorX, cursorY, toggleNavigationMode } = useBoardNavigation();
  const containerRef = useRef<HTMLDivElement>(null);
  const { playSound } = useGameSounds();

  // Touch/swipe support
  const isTouch = useIsTouchDevice();
  const swipeEnabled = isTouch && !scoringMode && !editMode;
  const swipeHandlers = useBoardSwipeNavigation(goBack, goForward, swipeEnabled);

  const [showResignConfirm, setShowResignConfirm] = useState(false);

  // Keyboard and wheel navigation (always active, even when board controls are collapsed)
  useBoardControlsKeyNav();
  // Annotation mark shortcuts (⌥1 … ⌥4) on the current move
  useAnnotationShortcuts();
  // Board tool shortcuts (number row), on every layout
  useBoardToolCommands();

  // AI Analysis integration (for heatMap/ownershipMap on the board)
  const { isModelLoaded } = useGameTree();
  const { heatMap, ownershipMap } = useAIAnalysis();
  // Extracted hooks
  const { currentPlayer, ghostStonePlayer, ghostMarker, lastPlacedColor, setLastPlacedColor } =
    useGameBoardState();

  const {
    isGeneratingMove,
    pendingSuggestMove,
    isEngineReady,
    handleSuggestMove: suggestMoveRaw,
    executeGenerateMove,
  } = useAIMoveGeneration(playSound);

  const handleSuggestMove = useCallback(
    () => suggestMoveRaw(currentPlayer),
    [suggestMoveRaw, currentPlayer]
  );

  // Auto-trigger move generation when engine becomes available
  useEffect(() => {
    if (pendingSuggestMove && isEngineReady && isModelLoaded) {
      executeGenerateMove(currentPlayer);
    }
  }, [pendingSuggestMove, isEngineReady, isModelLoaded, executeGenerateMove, currentPlayer]);

  const handleToggleEditMode = useCallback(() => {
    toggleEditMode();
  }, [toggleEditMode]);

  const { showNextMove, setShowNextMove } = useGameBoardKeyboard({
    handleToggleEditMode,
    isModelLoaded,
    scoringMode,
    editMode,
    isGeneratingMove,
    handleSuggestMove,
  });

  // Stable identity: an inline arrow here rebuilt the action bar's `items`
  // array on every render, which made OverflowMenu re-measure the bar.
  const handleToggleNextMove = useCallback(() => {
    setShowNextMove(current => !current);
  }, [setShowNextMove]);

  const nextMove = useMemo(() => {
    if (!showNextMove || !nextMoveNode) return null;
    const moveData = nextMoveNode.data.B?.[0] || nextMoveNode.data.W?.[0];
    if (!moveData) return null;
    return sgfToVertex(moveData);
  }, [showNextMove, nextMoveNode]);

  const nextMovePlayer = useMemo(() => {
    if (!nextMoveNode) return undefined;
    return nextMoveNode.data.B ? 1 : -1;
  }, [nextMoveNode]);

  // Board dimensions & fuzzy placement
  const boardHeight = currentBoard.signMap.length;
  const boardWidth = currentBoard.signMap[0]?.length ?? boardHeight;
  const fuzzyEnabled = gameSettings.fuzzyStonePlacement;
  const { shiftMap, randomMap } = useFuzzyPlacement({
    enabled: fuzzyEnabled,
    width: boardWidth,
    height: boardHeight,
    gameId,
  });

  // Marker helper
  const placeOrToggleMarker = usePlaceOrToggleMarker(markerMap, addMarker, removeMarker);

  // Navigation mode handler
  useNavigationModeHandler({
    currentPlayer,
    lastPlacedColor,
    setLastPlacedColor,
    placeOrToggleMarker,
    playSound,
  });

  // Get last move from current node
  const lastMove = useLastMove(currentNode);
  const { gameTree, currentNodeId } = useGameTreeCore();
  const annotationMap = useAnnotationMap({
    gameTree,
    currentNodeId,
    currentNode,
    lastMove,
    signMap: currentBoard.signMap,
    showAll: gameSettings.showAllMoveMarks,
  });

  const vertexSize = useVertexSize(
    containerRef,
    boardWidth,
    boardHeight,
    gameSettings.showCoordinates
  );

  // Marker drag-to-paint handlers
  const { handleVertexMouseDown, handleVertexMouseMove, handledInMouseDownRef } =
    useMarkerDragHandlers({ editMode, editTool, placeOrToggleMarker, removeMarker });

  const handleVertexClick = useVertexClickHandler({
    scoringMode,
    editMode,
    editTool,
    editPlayMode,
    currentBoard,
    currentPlayer,
    lastPlacedColor,
    setLastPlacedColor,
    deadStones,
    toggleDeadStones,
    playMove,
    placeStoneDirect,
    addMarker,
    removeMarker,
    placeOrToggleMarker,
    playSound,
    handledInMouseDownRef,
  });

  const handlePass = useCallback(() => {
    playMove([-1, -1], currentPlayer);
  }, [playMove, currentPlayer]);

  const handleResign = useCallback(() => setShowResignConfirm(true), []);

  const handleResignConfirm = useCallback(() => {
    resign(currentPlayer);
    setShowResignConfirm(false);
  }, [currentPlayer, resign]);

  const handleResignCancel = useCallback(() => setShowResignConfirm(false), []);

  useCommand('game.pass', handlePass, { enabled: !scoringMode && !editMode });
  useCommand('game.resign', handleResign, { enabled: !scoringMode && !editMode });

  // Scoring dimmed vertices
  const dimmedVertices = useScoringDimmedVertices({
    scoringMode,
    deadStones,
  });

  // Auto-open board controls area when scoring mode activates
  useEffect(() => {
    if (scoringMode && !gameSettings.showBoardControls) {
      setGameSettings({ showBoardControls: true });
    }
  }, [scoringMode, gameSettings.showBoardControls, setGameSettings]);

  // Right-click handler
  const handleVertexRightClick = useVertexRightClickHandler({
    editMode,
    currentBoard,
    markerMap,
    removeMarker,
    addMarker,
    removeSetupStone,
  });

  // Desktop frames the board: tool rail and eval gauge beside it, a fixed
  // footer under it, nothing above. Every action that used to sit in bars
  // around the board is in the menu bar, so nothing appears or disappears
  // around the board and its size only follows the window.
  const framed = layoutMode === 'desktop';
  const boardPixelHeight = vertexSize * (boardHeight + (gameSettings.showCoordinates ? 2 : 0)) + 8;

  return (
    <div className={`gameboard-container${framed ? ' gameboard-container--framed' : ''}`}>
      {!framed && (
        <GameBoardActionBar
          onPass={handlePass}
          onResign={handleResign}
          onToggleScoringMode={toggleScoringMode}
          onToggleAnalysisBar={toggleShowAnalysisBar}
          onToggleNavigationMode={toggleNavigationMode}
          onToggleEditMode={handleToggleEditMode}
          onToggleNextMove={handleToggleNextMove}
          onSuggestMove={handleSuggestMove}
          scoringMode={scoringMode}
          editMode={editMode}
          showAnalysisBar={showAnalysisBar}
          navigationMode={navigationMode}
          showNextMove={showNextMove}
          isModelLoaded={isModelLoaded}
          isGeneratingMove={isGeneratingMove}
        />
      )}
      {!framed && <AnalysisBar onShowLegend={() => setShowMoveStrengthInfo(true)} />}

      <div className="gameboard-board-area">
        {framed && <BoardToolRail />}
        {framed && <EvalGauge height={boardPixelHeight} />}
        <div
          ref={containerRef}
          className={`gameboard-board-wrapper ${!gameSettings.showCoordinates ? 'no-coordinates' : ''}`}
          {...swipeHandlers}
        >
          <Goban
            key={gameId}
            gameId={gameId}
            vertexSize={vertexSize}
            signMap={currentBoard.signMap}
            showCoordinates={gameSettings.showCoordinates}
            fuzzyStonePlacement={fuzzyEnabled}
            shiftMap={shiftMap}
            randomMap={randomMap}
            lastMove={lastMove}
            nextMove={nextMove}
            nextMovePlayer={nextMovePlayer}
            currentPlayer={ghostStonePlayer}
            onVertexClick={handleVertexClick}
            onVertexMouseDown={handleVertexMouseDown}
            onVertexMouseMove={handleVertexMouseMove}
            dimmedVertices={dimmedVertices}
            paintMap={territoryMap}
            markerMap={markerMap ?? undefined}
            annotationMap={annotationMap ?? undefined}
            cursorPosition={navigationMode ? [cursorX, cursorY] : null}
            ghostMarker={ghostMarker}
            heatMap={heatMap ?? undefined}
            ownershipMap={ownershipMap ?? undefined}
            onVertexRightClick={handleVertexRightClick}
          />
        </div>
        {!framed && editMode && <EditToolbar />}
        {framed && scoringMode && (
          <div className="gameboard-score-overlay">
            <GameBoardScoreEstimator />
          </div>
        )}
      </div>

      <GameBoardFooter framed={framed} />

      {/* Move Strength Info Modal */}
      <AnalysisLegendModal
        isOpen={showMoveStrengthInfo}
        onClose={() => setShowMoveStrengthInfo(false)}
      />

      {/* Resign Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showResignConfirm}
        title={t('boardControls.resignGame')}
        message={t('boardControls.resignConfirm', {
          player: currentPlayer === 1 ? t('gameInfo.black') : t('gameInfo.white'),
        })}
        confirmLabel={t('boardControls.resign')}
        cancelLabel={t('cancel')}
        onConfirm={handleResignConfirm}
        onCancel={handleResignCancel}
      />
    </div>
  );
});
