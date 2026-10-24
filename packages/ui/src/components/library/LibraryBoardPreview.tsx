/**
 * LibraryBoardPreview - a game's final position, drawn small and read-only.
 */

import React, { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Goban } from '@kaya/shudan';
import { useGameTree } from '../../contexts/GameTreeContext';
import { useVertexSize } from '../board/gameboard-interactions';
import { finalPosition, finalPositionFromSGF, type FinalPosition } from '../../utils/finalPosition';
import './LibraryBoardPreview.css';

const BoardPreview: React.FC<{ position: FinalPosition }> = ({ position }) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const { board, lastMove } = position;
  const vertexSize = useVertexSize(containerRef, board.width, board.height, false);

  return (
    <div ref={containerRef} className="library-preview" aria-label={t('gameDetails.preview')}>
      <Goban
        vertexSize={vertexSize}
        signMap={board.signMap}
        showCoordinates={false}
        lastMove={lastMove}
      />
    </div>
  );
};

/** Final position of a library file. */
export const LibraryFilePreview: React.FC<{ content: string }> = ({ content }) => {
  const position = useMemo(() => finalPositionFromSGF(content), [content]);
  return position ? <BoardPreview position={position} /> : null;
};

/** Final position of the game on the board, including unsaved changes. */
export const LoadedGamePreview: React.FC = () => {
  const { gameTree } = useGameTree();
  const position = useMemo(() => (gameTree ? finalPosition(gameTree.root) : null), [gameTree]);
  return position ? <BoardPreview position={position} /> : null;
};
