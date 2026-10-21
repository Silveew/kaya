/**
 * Export a position from a game as a standalone SGF.
 *
 * The exported game starts at the chosen node: its root holds the board at
 * that node as setup stones, with `PL` set to the side to move, and the rest of
 * the tree below the node (main line, variations, analysis) is copied under it.
 *
 * See specs/2026-10-21-export-position.md.
 */

import type { GameTree, GameTreeNode } from '@kaya/gametree';
import type { GoBoard } from '@kaya/goboard';
import { stringify, vertexToSGF, type SGFNode } from '@kaya/sgf';
import type { SGFProperty } from '../types/game';
import { getPathToNode } from './gameCache';

/** Root properties copied from the source game: format and game info. */
// prettier-ignore
const ROOT_PROPERTIES = [
  'GM', 'FF', 'CA', 'AP', 'ST', 'SZ', 'KM', 'RU', 'TM', 'OT',
  'PB', 'PW', 'BR', 'WR', 'BT', 'WT',
  'GN', 'EV', 'RO', 'DT', 'PC', 'RE', 'AN', 'SO', 'CP', 'US', 'ON', 'GC',
];

/**
 * Properties of the chosen node that describe its move rather than the
 * position after it. The move itself is folded into the setup stones.
 */
// prettier-ignore
const MOVE_PROPERTIES = new Set([
  'B', 'W', 'KO', 'MN', 'BM', 'TE', 'DO', 'IT', 'BL', 'WL', 'OB', 'OW',
]);

/** Properties the export sets itself on the new root. */
const SETUP_PROPERTIES = new Set(['AB', 'AW', 'AE', 'PL', 'HA']);

export interface ExportPositionOptions {
  /** Board at the chosen node, as Kaya shows it. */
  board: GoBoard;
  /** Optional title, written to `GN`. */
  title?: string;
  /** File name of the source game, recorded in `GC`. */
  sourceName?: string;
}

export interface ExportedPosition {
  sgf: string;
  /** Number of moves played up to the chosen node. */
  moveNumber: number;
  /** Suggested file name (without extension). */
  fileName: string;
}

const isMove = (data: SGFProperty): boolean => data.B !== undefined || data.W !== undefined;

/** Side to move at the end of `path`, following the same rules as analysis. */
export function nextToPlay(path: GameTreeNode<SGFProperty>[]): 'B' | 'W' {
  for (let i = path.length - 1; i >= 0; i--) {
    const { data } = path[i];
    if (data.PL?.[0] === 'B' || data.PL?.[0] === 'W') return data.PL[0];
    if (data.B !== undefined) return 'W';
    if (data.W !== undefined) return 'B';
  }
  const handicap = Number(path[0]?.data.HA?.[0] ?? 0);
  return handicap >= 2 ? 'W' : 'B';
}

function copyNodes(
  nodes: GameTreeNode<SGFProperty>[],
  parentId: number,
  ids: { next: number }
): SGFNode[] {
  return nodes.map(node => {
    const id = ids.next++;
    const data: SGFProperty = {};
    for (const [ident, values] of Object.entries(node.data)) data[ident] = [...values];
    return { id, data, parentId, children: copyNodes(node.children, id, ids) };
  });
}

function setupStones(board: GoBoard): { AB: string[]; AW: string[] } {
  const AB: string[] = [];
  const AW: string[] = [];
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const sign = board.signMap[y][x];
      if (sign === 1) AB.push(vertexToSGF([x, y]));
      else if (sign === -1) AW.push(vertexToSGF([x, y]));
    }
  }
  return { AB, AW };
}

export function exportPosition(
  tree: GameTree<SGFProperty>,
  nodeId: number | string,
  { board, title, sourceName }: ExportPositionOptions
): ExportedPosition | null {
  const node = tree.get(nodeId);
  if (!node) return null;

  const path = getPathToNode(tree, nodeId);
  const source = path[0].data;
  const moveNumber = path.filter(n => isMove(n.data)).length;

  const data: SGFProperty = {};
  for (const ident of ROOT_PROPERTIES) {
    if (source[ident]) data[ident] = [...source[ident]];
  }

  // The chosen node's own comment, name, markup and analysis describe the
  // position after its move, which is now the root position.
  for (const [ident, values] of Object.entries(node.data)) {
    if (MOVE_PROPERTIES.has(ident) || SETUP_PROPERTIES.has(ident)) continue;
    if (ROOT_PROPERTIES.includes(ident)) continue;
    data[ident] = [...values];
  }

  const { AB, AW } = setupStones(board);
  if (AB.length) data.AB = AB;
  if (AW.length) data.AW = AW;
  data.PL = [nextToPlay(path)];

  const trimmedTitle = title?.trim();
  if (trimmedTitle) data.GN = [trimmedTitle];

  const baseName = (sourceName ?? '').replace(/\.sgf$/i, '').trim();
  const origin = `${baseName ? `From ${baseName}` : 'Exported'}, move ${moveNumber}`;
  data.GC = source.GC?.[0] ? [`${origin}\n\n${source.GC[0]}`] : [origin];

  const root: SGFNode = {
    id: 0,
    data,
    parentId: null,
    children: copyNodes(node.children, 0, { next: 1 }),
  };

  return {
    sgf: stringify([root]),
    moveNumber,
    fileName: trimmedTitle || `${baseName || 'Position'} - move ${moveNumber}`,
  };
}
