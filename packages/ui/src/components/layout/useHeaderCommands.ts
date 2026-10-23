import { useCommand } from '../../commands/CommandsContext';
import { useGameTreeBoard, useGameTreeCore, useGameTreeEdit } from '../../contexts/selectors';
import { canShiftVariation, type ShiftDirection } from '../../hooks/game/branchOperations';

/** File, edit-history, branch and app-level commands owned by the header. */
export function useHeaderCommands(handlers: {
  handleNewGame: () => void;
  handleQuickNewGame: () => void;
  handleOpenClick: () => void;
  handleScanBoardClick: () => void;
  handleSaveClick: () => void;
  handleSaveAsClick: () => void;
  handleExportClick: () => void;
  handleCopyClick: () => void;
  handlePasteClick: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  setAIConfigOpen: (open: boolean) => void;
}): void {
  const { currentNode } = useGameTreeBoard();
  const {
    makeMainVariation,
    shiftVariation,
    undo,
    redo,
    canUndo,
    canRedo,
    copiedBranch,
    copyBranch,
    cutNode,
    pasteBranch,
    deleteContinuation,
    deleteBranch,
    deleteOtherBranches,
    clearSetupStones,
    clearAllMarkersAndLabels,
  } = useGameTreeEdit();
  const { gameTree, currentNodeId } = useGameTreeCore();
  const isRoot = currentNode?.parentId == null;
  const canShift = (direction: ShiftDirection): boolean =>
    !!gameTree && currentNodeId != null && canShiftVariation(gameTree, currentNodeId, direction);

  useCommand('file.new', handlers.handleNewGame);
  useCommand('file.quickNew', handlers.handleQuickNewGame);
  useCommand('file.open', handlers.handleOpenClick, { allowInInput: true });
  useCommand('file.scanBoard', handlers.handleScanBoardClick);
  useCommand('file.save', handlers.handleSaveClick, { allowInInput: true });
  useCommand('file.saveAs', handlers.handleSaveAsClick, { allowInInput: true });
  useCommand('file.export', handlers.handleExportClick);
  useCommand('file.copySgf', handlers.handleCopyClick);
  // ⌘V reaches the document's paste listener (useDropZoneEffects) as a native
  // paste event, so the key itself must be left alone.
  useCommand('file.paste', handlers.handlePasteClick, { keyboard: false });

  useCommand('edit.undo', undo, { enabled: canUndo });
  useCommand('edit.redo', redo, { enabled: canRedo });
  useCommand('edit.makeMainBranch', makeMainVariation);
  useCommand('edit.promoteVariation', () => shiftVariation('left'), {
    enabled: canShift('left'),
  });
  useCommand('edit.demoteVariation', () => shiftVariation('right'), {
    enabled: canShift('right'),
  });
  useCommand('edit.copyBranch', copyBranch, { enabled: !isRoot });
  useCommand('edit.cutBranch', cutNode, { enabled: !isRoot });
  useCommand('edit.pasteBranch', pasteBranch, { enabled: !!copiedBranch });
  useCommand('edit.deleteContinuation', deleteContinuation, {
    enabled: !!currentNode?.children?.length,
  });
  useCommand('edit.deleteBranch', deleteBranch, { enabled: !isRoot });
  useCommand('edit.deleteOtherBranches', deleteOtherBranches);
  useCommand('edit.clearSetupStones', clearSetupStones);
  useCommand('edit.clearMarkers', clearAllMarkersAndLabels);

  useCommand('view.openSettings', () => handlers.setAIConfigOpen(true), { allowInInput: true });
  useCommand('view.toggleTheme', handlers.toggleTheme, { checked: handlers.isDark });
  useCommand('view.toggleFullscreen', handlers.toggleFullscreen, {
    checked: handlers.isFullscreen,
    allowInInput: true,
  });
  useCommand('board.toggleSound', handlers.toggleSound, { checked: handlers.soundEnabled });
}
