/**
 * Rows of the Moves panel: the current branch (root → current node → end of the
 * branch along first children) with each node's move, annotation marks and
 * comment, plus the board badges for every marked stone still on the board.
 *
 * See specs/2026-10-21-moves-list.md.
 */

import type { GameTree, GameTreeNode } from '@kaya/gametree';
import type { SGFProperty } from '../types/game';
import { getPathToNode } from './gameCache';
import { vertexToGTP } from './gtpUtils';
import { getMoveMark, getPositionMark, type MarkDefinition } from './annotations';

export interface MoveRow {
  nodeId: number | string;
  /** Position on the branch; 0 is the root. */
  index: number;
  /** Number of moves played up to and including this node (setup nodes repeat it). */
  moveNumber: number;
  color: 'black' | 'white' | null;
  /** GTP coordinate ("D4"), "pass", or '' for a node without a move. */
  coord: string;
  /** SGF coordinate of the move, or null for a pass or a node without a move. */
  sgfCoord: string | null;
  moveMark: MarkDefinition<string> | null;
  positionMark: MarkDefinition<string> | null;
  /** First line of the comment, trimmed; '' when there is none. */
  comment: string;
}

function isPassCoord(coord: string, boardSize: number): boolean {
  return coord === '' || (coord === 'tt' && boardSize <= 19);
}

function sgfCoordToVertex(coord: string): [number, number] {
  return [coord.charCodeAt(0) - 97, coord.charCodeAt(1) - 97];
}

/** The branch through `currentNodeId`, extended to its end along first children. */
export function getBranch(
  tree: GameTree<SGFProperty>,
  currentNodeId: number | string
): GameTreeNode<SGFProperty>[] {
  const path = getPathToNode(tree, currentNodeId);
  let last = path[path.length - 1];
  while (last && last.children.length > 0) {
    last = last.children[0];
    path.push(last);
  }
  return path;
}

export function buildMoveRows(branch: GameTreeNode<SGFProperty>[], boardSize: number): MoveRow[] {
  let moveNumber = 0;
  return branch.map((node, index) => {
    const black = node.data.B?.[0];
    const white = node.data.W?.[0];
    const played = black ?? white;
    if (played !== undefined) moveNumber++;

    let coord = '';
    let sgfCoord: string | null = null;
    if (played !== undefined) {
      if (isPassCoord(played, boardSize)) {
        coord = 'pass';
      } else {
        sgfCoord = played;
        coord = vertexToGTP(sgfCoordToVertex(played), boardSize);
      }
    }

    return {
      nodeId: node.id,
      index,
      moveNumber,
      color: black !== undefined ? 'black' : white !== undefined ? 'white' : null,
      coord,
      sgfCoord,
      moveMark: getMoveMark(node.data),
      positionMark: getPositionMark(node.data),
      comment: (node.data.C?.[0] ?? '').trim().split('\n')[0].trim(),
    };
  });
}

export function hasMark(row: MoveRow): boolean {
  return row.moveMark !== null || row.positionMark !== null;
}

/**
 * The nearest row before (`-1`) or after (`1`) `fromIndex` that carries a move
 * or position mark, or null when there is none in that direction.
 */
export function findMarkedRow(
  rows: MoveRow[],
  fromIndex: number,
  direction: -1 | 1
): MoveRow | null {
  for (let i = fromIndex + direction; i >= 0 && i < rows.length; i += direction) {
    if (hasMark(rows[i])) return rows[i];
  }
  return null;
}

export interface BoardMoveMark {
  x: number;
  y: number;
  mark: MarkDefinition<string>;
}

/**
 * Move marks of the rows up to and including `currentIndex` whose stone is
 * still on the board: same colour at the same point, so a captured stone (or
 * one replaced after a capture) loses its badge. The latest move at a point
 * wins.
 */
export function collectBoardMoveMarks(
  rows: MoveRow[],
  currentIndex: number,
  signMap: number[][]
): BoardMoveMark[] {
  const byPoint = new Map<string, BoardMoveMark & { sign: number }>();
  for (const row of rows.slice(0, currentIndex + 1)) {
    if (!row.sgfCoord || !row.color) continue;
    const [x, y] = sgfCoordToVertex(row.sgfCoord);
    const key = `${x},${y}`;
    if (!row.moveMark) {
      byPoint.delete(key);
      continue;
    }
    byPoint.set(key, { x, y, mark: row.moveMark, sign: row.color === 'black' ? 1 : -1 });
  }
  return [...byPoint.values()]
    .filter(({ x, y, sign }) => signMap[y]?.[x] === sign)
    .map(({ x, y, mark }) => ({ x, y, mark }));
}
