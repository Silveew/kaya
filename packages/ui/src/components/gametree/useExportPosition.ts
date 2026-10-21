/**
 * Export the position at a game tree node to the library's Positions folder.
 *
 * See specs/2026-10-21-export-position.md.
 */

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLibraryStorage, type LibraryItemId } from '@kaya/game-library';
import type { GameTree } from '@kaya/gametree';
import type { GoBoard } from '@kaya/goboard';
import { useGameTree } from '../../contexts/GameTreeContext';
import { useLibrary } from '../../contexts/LibraryContext';
import { useToast } from '../ui/Toast';
import type { SGFProperty } from '../../types/game';
import { exportPosition } from '../../utils/exportPosition';

/** Top-level library folder that exported positions go to. */
export const POSITIONS_FOLDER = 'Positions';

interface PendingExport {
  tree: GameTree<SGFProperty>;
  nodeId: number | string;
  board: GoBoard;
  sourceName: string;
  defaultName: string;
}

export function useExportPosition() {
  const { t } = useTranslation();
  const { gameTree, currentNodeId, currentBoard, filename } = useGameTree();
  const { createFolder, createFile } = useLibrary();
  const { showToast } = useToast();
  const [pending, setPending] = useState<PendingExport | null>(null);

  /**
   * Open the dialog for the current node. The tree and board are captured now,
   * so navigating while the dialog is open does not change what is exported.
   */
  const open = useCallback(() => {
    if (!gameTree || currentNodeId === null) return;
    const sourceName = filename ?? '';
    const preview = exportPosition(gameTree, currentNodeId, { board: currentBoard, sourceName });
    if (!preview) return;
    setPending({
      tree: gameTree,
      nodeId: currentNodeId,
      board: currentBoard,
      sourceName,
      defaultName: preview.fileName,
    });
  }, [gameTree, currentNodeId, currentBoard, filename]);

  const close = useCallback(() => setPending(null), []);

  const confirm = useCallback(
    async (title: string) => {
      if (!pending) return;
      const result = exportPosition(pending.tree, pending.nodeId, {
        board: pending.board,
        title,
        sourceName: pending.sourceName,
      });
      if (!result) return;

      try {
        const rootItems = await getLibraryStorage().getItems(null);
        const existing = rootItems.find(
          item => item.type === 'folder' && item.name === POSITIONS_FOLDER
        );
        const folderId: LibraryItemId =
          existing?.id ?? (await createFolder(POSITIONS_FOLDER, null)).id;
        const file = await createFile(result.fileName, result.sgf, folderId);
        showToast(
          t('toast.positionExported', { folder: POSITIONS_FOLDER, filename: file.name }),
          'success'
        );
      } catch (error) {
        showToast(t('toast.positionExportFailed', { error: String(error) }), 'error');
      }
    },
    [pending, createFolder, createFile, showToast, t]
  );

  return {
    isOpen: pending !== null,
    defaultName: pending?.defaultName ?? '',
    folderName: POSITIONS_FOLDER,
    open,
    close,
    confirm,
  };
}
