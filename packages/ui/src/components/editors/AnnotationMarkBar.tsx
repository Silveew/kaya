/**
 * Toggle buttons for the current node's annotation marks: move marks
 * (! !! !? ?! ? ??) and position marks (+B ++B +W ++W = ∞). Used in the
 * comment panel (compact: position marks behind a "±" button) and the Moves
 * tab.
 *
 * See specs/2026-10-21-moves-list.md.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAnnotationMarks } from '../../hooks/useAnnotationMarks';
import { useKeyboardShortcuts } from '../../contexts/KeyboardShortcutsContext';
import type { ShortcutId } from '../../hooks/shortcutTypes';
import {
  MARK_TONE_COLORS,
  MOVE_MARKS,
  POSITION_MARKS,
  type MarkDefinition,
} from '../../utils/annotations';
import './AnnotationMarkBar.css';

export interface AnnotationMarkBarProps {
  className?: string;
  /** One row: position marks open from a "±" button (comment panel). */
  compact?: boolean;
}

interface MarkButtonProps {
  mark: MarkDefinition<string>;
  label: string;
  title?: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function MarkButton({ mark, label, title, selected, disabled, onClick }: MarkButtonProps) {
  return (
    <button
      type="button"
      className="annotation-mark-button"
      title={title ?? label}
      aria-label={label}
      aria-pressed={selected}
      disabled={disabled}
      style={selected ? { backgroundColor: MARK_TONE_COLORS[mark.tone] } : undefined}
      onClick={onClick}
    >
      {mark.glyph}
    </button>
  );
}

export const AnnotationMarkBar: React.FC<AnnotationMarkBarProps> = ({
  className = '',
  compact = false,
}) => {
  const { t } = useTranslation();
  const { isMove, moveMark, positionMark, toggleMoveMark, togglePositionMark } =
    useAnnotationMarks();
  const { getBinding, bindingToDisplayString } = useKeyboardShortcuts();
  const [positionsOpen, setPositionsOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState({ left: 0, top: 0 });

  // The comment panel clips its content, so the popover is portaled and
  // placed below the button, or above it when there is no room below.
  useLayoutEffect(() => {
    if (!positionsOpen || !anchorRef.current || !popoverRef.current) return;
    const anchor = anchorRef.current.getBoundingClientRect();
    const { width, height } = popoverRef.current.getBoundingClientRect();
    const below = anchor.bottom + 4;
    const top = below + height + 8 <= window.innerHeight ? below : anchor.top - height - 4;
    const left = Math.max(8, Math.min(anchor.right - width, window.innerWidth - width - 8));
    setPopoverPosition({ left, top: Math.max(8, top) });
  }, [positionsOpen]);

  // Tooltip with the shortcut, e.g. "Good move (⌥1)".
  const withShortcut = (label: string, id: ShortcutId) => {
    const binding = getBinding(id);
    return binding.key ? `${label} (${bindingToDisplayString(binding)})` : label;
  };

  // Close the position popover on an outside press or Escape.
  useEffect(() => {
    if (!positionsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      setPositionsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPositionsOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [positionsOpen]);

  const positionGroup = (
    <div role="group" aria-label={t('annotations.markPosition')} className="annotation-mark-group">
      {POSITION_MARKS.map(mark => (
        <MarkButton
          key={mark.id}
          mark={mark}
          label={t(`annotations.position.${mark.id}`)}
          selected={positionMark?.id === mark.id}
          onClick={() => {
            togglePositionMark(mark.id);
            setPositionsOpen(false);
          }}
        />
      ))}
    </div>
  );

  return (
    <div
      className={`annotation-mark-bar${compact ? ' annotation-mark-bar--compact' : ''} ${className}`}
    >
      <div role="group" aria-label={t('annotations.markMove')} className="annotation-mark-group">
        {MOVE_MARKS.map(mark => (
          <MarkButton
            key={mark.id}
            mark={mark}
            label={t(`annotations.move.${mark.id}`)}
            title={withShortcut(t(`annotations.move.${mark.id}`), `mark.${mark.id}` as ShortcutId)}
            selected={moveMark?.id === mark.id}
            disabled={!isMove}
            onClick={() => toggleMoveMark(mark.id)}
          />
        ))}
      </div>
      {compact ? (
        <>
          <button
            ref={anchorRef}
            type="button"
            className="annotation-mark-button"
            title={positionMark ? t(`annotations.position.${positionMark.id}`) : undefined}
            aria-label={t('annotations.markPosition')}
            aria-haspopup="true"
            aria-expanded={positionsOpen}
            style={positionMark ? { backgroundColor: MARK_TONE_COLORS.position } : undefined}
            onClick={() => setPositionsOpen(open => !open)}
          >
            {positionMark?.glyph ?? '±'}
          </button>
          {positionsOpen &&
            createPortal(
              <div ref={popoverRef} className="annotation-mark-popover" style={popoverPosition}>
                {positionGroup}
              </div>,
              document.body
            )}
        </>
      ) : (
        positionGroup
      )}
    </div>
  );
};
