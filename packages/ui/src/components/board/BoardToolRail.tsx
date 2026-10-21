/**
 * BoardToolRail - the vertical strip of board tools beside the board.
 *
 * Always present on desktop, at a fixed width, so picking a tool never
 * changes the size of the board.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useKeyboardShortcuts } from '../../contexts/KeyboardShortcutsContext';
import { BOARD_TOOLS, useActiveBoardTool, useSelectBoardTool } from './boardTools';
import './BoardToolRail.css';

export const BoardToolRail: React.FC = () => {
  const { t } = useTranslation();
  const { getBinding, bindingToDisplayString } = useKeyboardShortcuts();
  const active = useActiveBoardTool();
  const select = useSelectBoardTool();

  return (
    <div
      className="board-tool-rail"
      role="toolbar"
      aria-orientation="vertical"
      aria-label={t('boardTools.label')}
    >
      {BOARD_TOOLS.map(tool => {
        const label = t(`shortcuts.actions.${tool.command}`);
        const binding = getBinding(tool.command);
        const title = binding.key ? `${label} (${bindingToDisplayString(binding)})` : label;
        const isActive = active === tool.command;
        return (
          <React.Fragment key={tool.command}>
            {tool.groupStart && <div className="board-tool-rail__divider" />}
            <button
              type="button"
              className={`board-tool-rail__button${isActive ? ' is-active' : ''}`}
              onClick={() => select(tool)}
              title={title}
              aria-label={label}
              aria-pressed={isActive}
            >
              {tool.icon}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};
