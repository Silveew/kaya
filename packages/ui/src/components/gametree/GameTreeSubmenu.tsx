/**
 * Flyout submenu of the game tree context menu (e.g. "Mark move ›").
 *
 * Rendered inside the parent menu's element so the parent's outside-press
 * check treats it as part of the menu. It opens beside its anchor item, to the
 * right when there is room and to the left otherwise, clamped to the viewport.
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { GameTreeMenuItem } from './GameTreeContextMenu';
import { GameTreeMenuItemButton } from './GameTreeMenuItemButton';

const VIEWPORT_MARGIN = 8;

export interface GameTreeSubmenuProps {
  /** Viewport rect of the item that opened the submenu. */
  anchor: DOMRect;
  ariaLabel: string;
  items: GameTreeMenuItem[];
  /** Move focus into the submenu when it opens (keyboard and click opens). */
  autoFocus: boolean;
  onSelect: (item: GameTreeMenuItem) => void;
  /** Close the submenu and return focus to its anchor item. */
  onBack: () => void;
}

export const GameTreeSubmenu: React.FC<GameTreeSubmenuProps> = ({
  anchor,
  ariaLabel,
  items,
  autoFocus,
  onSelect,
  onBack,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: anchor.right, y: anchor.top });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const fitsRight = anchor.right + width + VIEWPORT_MARGIN <= window.innerWidth;
    const fitsLeft = anchor.left - width - VIEWPORT_MARGIN >= 0;
    let x = anchor.right - 2;
    if (!fitsRight) {
      x = fitsLeft ? anchor.left - width + 2 : window.innerWidth - width - VIEWPORT_MARGIN;
    }
    const maxY = Math.max(window.innerHeight - height - VIEWPORT_MARGIN, VIEWPORT_MARGIN);
    setPosition({
      x: Math.max(x, VIEWPORT_MARGIN),
      y: Math.min(Math.max(anchor.top - 4, VIEWPORT_MARGIN), maxY),
    });
  }, [anchor, items.length]);

  const getEnabledItems = useCallback(
    () =>
      Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []),
    []
  );

  const focusItem = useCallback(
    (index: number) => {
      const enabled = getEnabledItems();
      if (enabled.length === 0) return;
      enabled[(index + enabled.length) % enabled.length].focus({ preventScroll: true });
    },
    [getEnabledItems]
  );

  useEffect(() => {
    if (autoFocus) focusItem(0);
  }, [autoFocus, focusItem]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        return;
      }
      // The parent menu handles the same keys for its own items.
      event.preventDefault();
      event.stopPropagation();

      const enabled = getEnabledItems();
      const currentIndex = enabled.indexOf(document.activeElement as HTMLButtonElement);
      switch (event.key) {
        case 'ArrowDown':
          focusItem(currentIndex + 1);
          break;
        case 'ArrowUp':
          focusItem(currentIndex - 1);
          break;
        case 'Home':
          focusItem(0);
          break;
        case 'End':
          focusItem(enabled.length - 1);
          break;
        case 'ArrowLeft':
          onBack();
          break;
        default:
          break;
      }
    },
    [getEnabledItems, focusItem, onBack]
  );

  return (
    <div
      ref={ref}
      className="gametree-context-menu gametree-context-submenu"
      role="menu"
      aria-label={ariaLabel}
      style={{ left: position.x, top: position.y }}
      onKeyDown={handleKeyDown}
    >
      {items.map(item => (
        <GameTreeMenuItemButton key={item.id} item={item} onClick={() => onSelect(item)} />
      ))}
    </div>
  );
};
