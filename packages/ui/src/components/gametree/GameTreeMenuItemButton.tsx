/**
 * One row of the game tree context menu or one of its submenus: an optional
 * separator, then the item button (icon, label, shortcut hint, check mark or
 * submenu arrow).
 */

import React from 'react';
import { LuCheck, LuChevronRight } from 'react-icons/lu';
import type { GameTreeMenuItem } from './GameTreeContextMenu';

export interface GameTreeMenuItemButtonProps {
  item: GameTreeMenuItem;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseEnter?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Set on an item whose submenu is open. */
  expanded?: boolean;
  /** Exposed as data-item-id so the menu can find the button again. */
  dataItemId?: string;
}

export const GameTreeMenuItemButton: React.FC<GameTreeMenuItemButtonProps> = ({
  item,
  onClick,
  onMouseEnter,
  expanded,
  dataItemId,
}) => {
  const hasSubmenu = !!item.submenu;
  const role = item.checked === undefined ? 'menuitem' : 'menuitemradio';

  return (
    <>
      {item.separatorBefore && <div className="gametree-context-menu-separator" role="separator" />}
      <button
        type="button"
        role={role}
        aria-checked={item.checked === undefined ? undefined : item.checked}
        aria-haspopup={hasSubmenu ? 'menu' : undefined}
        aria-expanded={hasSubmenu ? !!expanded : undefined}
        className={`gametree-context-menu-item${item.danger ? ' danger' : ''}${
          item.disabled ? ' disabled' : ''
        }${expanded ? ' expanded' : ''}`}
        disabled={item.disabled}
        data-item-id={dataItemId}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
      >
        <span className="gametree-context-menu-item-icon">{item.icon}</span>
        <span className="gametree-context-menu-item-label">{item.label}</span>
        {item.shortcut && (
          <span className="gametree-context-menu-item-shortcut" aria-hidden="true">
            {item.shortcut}
          </span>
        )}
        {item.checked && (
          <span className="gametree-context-menu-item-check" aria-hidden="true">
            <LuCheck size={14} />
          </span>
        )}
        {hasSubmenu && (
          <span className="gametree-context-menu-item-arrow" aria-hidden="true">
            <LuChevronRight size={14} />
          </span>
        )}
      </button>
    </>
  );
};
