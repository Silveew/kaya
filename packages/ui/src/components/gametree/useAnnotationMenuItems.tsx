/**
 * "Mark move ›" and "Mark position ›" submenus of the game tree menu.
 *
 * The menu always acts on the current node (opening it selects the node), so
 * these read and set the current node's marks.
 *
 * See specs/2026-10-21-annotation-marks.md.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { LuMessageSquareMore, LuScale } from 'react-icons/lu';
import { useAnnotationMarks } from '../../hooks/useAnnotationMarks';
import { useKeyboardShortcuts } from '../../contexts/KeyboardShortcutsContext';
import type { ShortcutId } from '../../hooks/shortcutTypes';
import {
  MARK_TONE_COLORS,
  MOVE_MARKS,
  POSITION_MARKS,
  type MarkDefinition,
} from '../../utils/annotations';
import type { GameTreeMenuItem } from './GameTreeContextMenu';

function Glyph({ mark }: { mark: MarkDefinition<string> }) {
  return (
    <span
      className="gametree-context-menu-glyph"
      style={{ backgroundColor: MARK_TONE_COLORS[mark.tone] }}
    >
      {mark.glyph}
    </span>
  );
}

export function useAnnotationMenuItems(): GameTreeMenuItem[] {
  const { t } = useTranslation();
  const { getBinding, bindingToDisplayString } = useKeyboardShortcuts();
  const {
    isMove,
    moveMark,
    positionMark,
    toggleMoveMark,
    togglePositionMark,
    clearMoveMark,
    clearPositionMark,
  } = useAnnotationMarks();

  const shortcutFor = (id: ShortcutId): string | undefined => {
    const binding = getBinding(id);
    return binding.key ? bindingToDisplayString(binding) : undefined;
  };

  const moveItems: GameTreeMenuItem[] = MOVE_MARKS.map(mark => ({
    id: `mark-move-${mark.id}`,
    label: t(`annotations.move.${mark.id}`),
    icon: <Glyph mark={mark} />,
    checked: moveMark?.id === mark.id,
    shortcut: shortcutFor(`mark.${mark.id}` as ShortcutId),
    onSelect: () => toggleMoveMark(mark.id),
  }));
  moveItems.push({
    id: 'mark-move-clear',
    label: t('annotations.clear'),
    disabled: !moveMark,
    separatorBefore: true,
    shortcut: shortcutFor('mark.clear'),
    onSelect: clearMoveMark,
  });

  const positionItems: GameTreeMenuItem[] = POSITION_MARKS.map(mark => ({
    id: `mark-position-${mark.id}`,
    label: t(`annotations.position.${mark.id}`),
    icon: <Glyph mark={mark} />,
    checked: positionMark?.id === mark.id,
    onSelect: () => togglePositionMark(mark.id),
  }));
  positionItems.push({
    id: 'mark-position-clear',
    label: t('annotations.clear'),
    disabled: !positionMark,
    separatorBefore: true,
    onSelect: clearPositionMark,
  });

  return [
    {
      id: 'mark-move',
      label: t('annotations.markMove'),
      icon: <LuMessageSquareMore size={14} />,
      // FF[4] allows move annotations only on nodes that play a move.
      disabled: !isMove,
      separatorBefore: true,
      submenu: moveItems,
      onSelect: () => {},
    },
    {
      id: 'mark-position',
      label: t('annotations.markPosition'),
      icon: <LuScale size={14} />,
      submenu: positionItems,
      onSelect: () => {},
    },
  ];
}
