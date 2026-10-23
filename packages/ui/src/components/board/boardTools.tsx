/**
 * Board tools: what a click on the board does. "Play" plays moves; every
 * other tool puts the board in edit mode with that tool, so there is no
 * separate edit-mode switch to find first.
 */

import React from 'react';
import {
  LuCircle,
  LuSquare,
  LuTriangle,
  LuX,
  LuEraser,
  LuType,
  LuHash,
  LuRefreshCw,
  LuMousePointer2,
} from 'react-icons/lu';
import { useGameTreeEdit } from '../../contexts/selectors';
import { useCommand } from '../../commands/CommandsContext';
import type { CommandId } from '../../commands/commandRegistry';

export interface BoardTool {
  command: CommandId;
  /** The edit tool id, or null for Play. */
  editTool: string | null;
  icon: React.ReactNode;
  /** Starts a new group in the rail. */
  groupStart?: boolean;
}

export const BOARD_TOOLS: BoardTool[] = [
  { command: 'tool.play', editTool: null, icon: <LuMousePointer2 size={16} /> },
  {
    command: 'tool.black',
    editTool: 'black',
    icon: <span className="board-tool-stone board-tool-stone--black" />,
    groupStart: true,
  },
  {
    command: 'tool.white',
    editTool: 'white',
    icon: <span className="board-tool-stone board-tool-stone--white" />,
  },
  { command: 'tool.alternate', editTool: 'alternate', icon: <LuRefreshCw size={16} /> },
  {
    command: 'tool.triangle',
    editTool: 'triangle',
    icon: <LuTriangle size={16} />,
    groupStart: true,
  },
  { command: 'tool.square', editTool: 'square', icon: <LuSquare size={16} /> },
  { command: 'tool.circle', editTool: 'circle', icon: <LuCircle size={16} /> },
  { command: 'tool.cross', editTool: 'cross', icon: <LuX size={16} /> },
  { command: 'tool.labelAlpha', editTool: 'label-alpha', icon: <LuType size={16} /> },
  { command: 'tool.labelNum', editTool: 'label-num', icon: <LuHash size={16} /> },
  {
    command: 'tool.eraser',
    editTool: 'erase-marker',
    icon: <LuEraser size={16} />,
    groupStart: true,
  },
];

/** The tool currently in effect. */
export function useActiveBoardTool(): CommandId {
  const { editMode, editTool } = useGameTreeEdit();
  if (!editMode) return 'tool.play';
  return BOARD_TOOLS.find(tool => tool.editTool === editTool)?.command ?? 'tool.play';
}

/** Selects a board tool. */
export function useSelectBoardTool(): (tool: BoardTool) => void {
  const { setEditMode, setEditTool } = useGameTreeEdit();
  return tool => {
    if (tool.editTool === null) {
      setEditMode(false);
      return;
    }
    setEditTool(tool.editTool);
    setEditMode(true);
  };
}

function useToolCommand(tool: BoardTool, active: CommandId, select: (tool: BoardTool) => void) {
  useCommand(tool.command, () => select(tool), { checked: active === tool.command });
}

/** Registers one command per tool (the number keys, by default). */
export function useBoardToolCommands(): void {
  const active = useActiveBoardTool();
  const select = useSelectBoardTool();
  // BOARD_TOOLS is a module constant, so these calls keep their order
  useToolCommand(BOARD_TOOLS[0], active, select);
  useToolCommand(BOARD_TOOLS[1], active, select);
  useToolCommand(BOARD_TOOLS[2], active, select);
  useToolCommand(BOARD_TOOLS[3], active, select);
  useToolCommand(BOARD_TOOLS[4], active, select);
  useToolCommand(BOARD_TOOLS[5], active, select);
  useToolCommand(BOARD_TOOLS[6], active, select);
  useToolCommand(BOARD_TOOLS[7], active, select);
  useToolCommand(BOARD_TOOLS[8], active, select);
  useToolCommand(BOARD_TOOLS[9], active, select);
  useToolCommand(BOARD_TOOLS[10], active, select);
}
