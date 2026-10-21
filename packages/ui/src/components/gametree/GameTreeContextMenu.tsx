/**
 * Context menu for game tree graph nodes.
 *
 * Opened by right-click (desktop) or long-press (touch) on a stone node.
 * Rendered as a portal so it escapes the React Flow canvas' stacking and
 * overflow context. Positioning is clamped to the viewport.
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCloseOnBack } from '../../hooks/useCloseOnBack';
import { GameTreeMenuItemButton } from './GameTreeMenuItemButton';
import { GameTreeSubmenu } from './GameTreeSubmenu';
import './GameTreeContextMenu.css';

const VIEWPORT_MARGIN = 8;

export interface GameTreeMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  separatorBefore?: boolean;
  /** Radio-style state: set on every item of a pick-one group. */
  checked?: boolean;
  /** Shortcut hint shown at the end of the row, e.g. "⌥1". */
  shortcut?: string;
  /** Items of a flyout submenu. `onSelect` is not called for such an item. */
  submenu?: GameTreeMenuItem[];
  onSelect: () => void;
}

interface OpenSubmenu {
  item: GameTreeMenuItem;
  anchor: DOMRect;
  /** Keyboard and click opens focus the submenu; hover leaves focus alone. */
  focus: boolean;
}

export interface GameTreeContextMenuProps {
  /** Viewport (client) coordinates of the originating event. */
  x: number;
  y: number;
  /** Accessible label for the menu, e.g. "Branch actions". */
  ariaLabel: string;
  items: GameTreeMenuItem[];
  onClose: () => void;
}

export const GameTreeContextMenu: React.FC<GameTreeContextMenuProps> = ({
  x,
  y,
  ariaLabel,
  items,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });
  const [submenu, setSubmenu] = useState<OpenSubmenu | null>(null);

  // Mounted only while open: the Android back gesture closes the menu
  // instead of leaving the app.
  useCloseOnBack(true, onClose);

  // Clamp into the viewport once the menu has been measured.
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const maxX = Math.max(window.innerWidth - rect.width - VIEWPORT_MARGIN, VIEWPORT_MARGIN);
    const maxY = Math.max(window.innerHeight - rect.height - VIEWPORT_MARGIN, VIEWPORT_MARGIN);

    setPosition({
      x: Math.min(Math.max(x, VIEWPORT_MARGIN), maxX),
      y: Math.min(Math.max(y, VIEWPORT_MARGIN), maxY),
    });
  }, [x, y, items.length]);

  const handleSelect = useCallback(
    (item: GameTreeMenuItem) => {
      if (item.disabled) return;
      item.onSelect();
      onClose();
    },
    [onClose]
  );

  const openSubmenu = useCallback((item: GameTreeMenuItem, button: HTMLElement, focus: boolean) => {
    if (item.disabled || !item.submenu) return;
    setSubmenu({ item, anchor: button.getBoundingClientRect(), focus });
  }, []);

  // `role="menu"` obliges us to support arrow-key navigation, so the items are
  // focusable buttons and the menu owns a roving focus.
  const getEnabledItems = useCallback(
    () =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLButtonElement>(':scope > button:not(:disabled)') ?? []
      ),
    []
  );

  const focusItem = useCallback(
    (index: number) => {
      const enabled = getEnabledItems();
      if (enabled.length === 0) return;
      const clamped = (index + enabled.length) % enabled.length;
      enabled[clamped].focus({ preventScroll: true });
    },
    [getEnabledItems]
  );

  // Move focus into the menu on open, as users of context menus expect, and
  // hand it back to where it was when the menu closes. The element may be gone
  // by then (a deleted node), in which case focus stays where the browser put it.
  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    focusItem(0);
    return () => {
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [focusItem]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const enabled = getEnabledItems();
      const currentIndex = enabled.indexOf(document.activeElement as HTMLButtonElement);

      if (event.key === 'Tab') {
        onClose();
        return;
      }

      if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        return;
      }

      // Home/End/arrows are also global board-navigation shortcuts; the menu is
      // focused, so it must claim them. Left/Right do nothing in a vertical
      // menu, but claiming them keeps them from moving the board behind it.
      event.preventDefault();
      event.stopPropagation();

      switch (event.key) {
        case 'ArrowRight': {
          const item = items.find(i => i.id === enabled[currentIndex]?.dataset.itemId);
          if (item?.submenu) openSubmenu(item, enabled[currentIndex], true);
          break;
        }
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
        default:
          break;
      }
    },
    [getEnabledItems, focusItem, onClose, items, openSubmenu]
  );

  // Dismiss on outside pointer press, Escape, scroll, resize or blur. Using
  // capture on pointerdown means the menu closes before React Flow starts
  // panning the canvas underneath.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    const onDismiss = () => onClose();

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', onDismiss);
    window.addEventListener('blur', onDismiss);
    // Capture phase catches scrolling in any ancestor (React Flow pane,
    // panels, …) without needing to identify it.
    window.addEventListener('scroll', onDismiss, true);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('resize', onDismiss);
      window.removeEventListener('blur', onDismiss);
      window.removeEventListener('scroll', onDismiss, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className="gametree-context-menu"
      role="menu"
      aria-label={ariaLabel}
      style={{ left: position.x, top: position.y }}
      onContextMenu={event => event.preventDefault()}
      onKeyDown={handleKeyDown}
    >
      {items.map(item => (
        <GameTreeMenuItemButton
          key={item.id}
          item={item}
          dataItemId={item.id}
          expanded={submenu?.item.id === item.id}
          onClick={event => {
            if (!item.submenu) {
              handleSelect(item);
            } else if (submenu?.item.id === item.id) {
              setSubmenu(null);
            } else {
              openSubmenu(item, event.currentTarget, true);
            }
          }}
          onMouseEnter={event => {
            if (item.submenu) openSubmenu(item, event.currentTarget, false);
            else setSubmenu(null);
          }}
        />
      ))}
      {submenu?.item.submenu && (
        <GameTreeSubmenu
          anchor={submenu.anchor}
          ariaLabel={submenu.item.label}
          items={submenu.item.submenu}
          autoFocus={submenu.focus}
          onSelect={handleSelect}
          onBack={() => {
            const id = submenu.item.id;
            setSubmenu(null);
            menuRef.current
              ?.querySelector<HTMLButtonElement>(`:scope > button[data-item-id="${id}"]`)
              ?.focus({ preventScroll: true });
          }}
        />
      )}
    </div>,
    document.body
  );
};
