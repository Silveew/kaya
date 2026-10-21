/**
 * LibraryGameDetails - the Library workspace's side panel.
 *
 * For the game on the board: its full, editable game info. For another
 * selected game: what the library knows about it, and a button to open it.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { LuArrowRight } from 'react-icons/lu';
import type { LibraryFile } from '@kaya/game-library';
import { useLibrary } from '../../contexts/LibraryContext';
import {
  GameInfoEditor,
  GameInfoHeaderActions,
  useGameInfoEditMode,
} from '../editors/GameInfoEditor';
import './LibraryGameDetails.css';

interface LibraryGameDetailsProps {
  /** Switch to the Analyze workspace. */
  onShowAnalyze: () => void;
}

export const LibraryGameDetails: React.FC<LibraryGameDetailsProps> = ({ onShowAnalyze }) => {
  const { t } = useTranslation();
  const { items, selectedId, loadedFileId, openFile } = useLibrary();
  const { isEditMode, setIsEditMode, toggleEditMode } = useGameInfoEditMode();

  const selected = items.find(item => item.id === selectedId);
  const selectedFile = selected?.type === 'file' ? (selected as LibraryFile) : null;
  const showsLoadedGame = !selectedFile || selectedFile.id === loadedFileId;

  if (showsLoadedGame) {
    return (
      <div className="library-details">
        <div className="library-details__header">
          <h3>{t('panels.gameInfo')}</h3>
          <GameInfoHeaderActions isEditMode={isEditMode} onToggle={toggleEditMode} />
        </div>
        <div className="library-details__body">
          <GameInfoEditor isEditMode={isEditMode} onEditModeChange={setIsEditMode} />
        </div>
        <button type="button" className="library-details__open" onClick={onShowAnalyze}>
          {t('gameDetails.open')}
          <LuArrowRight size={16} />
        </button>
      </div>
    );
  }

  const meta = selectedFile.metadata ?? {};
  const player = (name?: string, rank?: string) =>
    name ? (rank ? `${name} (${rank})` : name) : undefined;
  const rows: [string, string | number | undefined][] = [
    [t('gameInfo.game'), meta.gameName],
    [t('gameInfo.black'), player(meta.blackPlayer, meta.blackRank)],
    [t('gameInfo.white'), player(meta.whitePlayer, meta.whiteRank)],
    [t('gameInfo.date'), meta.date],
    [t('gameInfo.result'), meta.result],
    [t('gameInfo.event'), meta.event],
    [t('gameInfo.komi'), meta.komi],
    [t('gameInfo.handicap'), meta.handicap || undefined],
    [
      t('gameDetails.boardSize'),
      meta.boardSize ? `${meta.boardSize}×${meta.boardSize}` : undefined,
    ],
    [t('gameDetails.moveCount'), meta.moveCount],
  ];

  return (
    <div className="library-details">
      <div className="library-details__header">
        <h3>{selectedFile.name}</h3>
      </div>
      <dl className="library-details__body library-details__facts">
        {rows
          .filter(([, value]) => value !== undefined && value !== '')
          .map(([label, value]) => (
            <React.Fragment key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </React.Fragment>
          ))}
      </dl>
      <button
        type="button"
        className="library-details__open"
        onClick={() => void openFile(selectedFile.id)}
      >
        {t('gameDetails.open')}
        <LuArrowRight size={16} />
      </button>
    </div>
  );
};
