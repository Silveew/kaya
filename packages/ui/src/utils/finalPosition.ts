/**
 * The board at the end of a game's main line, or at the start of a position.
 *
 * Works on any tree of `{ data, children }` nodes, so both a parsed SGF file
 * and the loaded game tree go through the same replay. Kept apart from
 * `reconstructBoard`, whose cache is keyed by node id and so only holds
 * boards of the loaded game.
 */

import { GoBoard, type Vertex } from '@kaya/goboard';
import { parse, parseBoardSize, sgfToVertex } from '@kaya/sgf';

interface PositionNode {
  data: Record<string, string[] | undefined>;
  children: PositionNode[];
}

export interface FinalPosition {
  board: GoBoard;
  lastMove: Vertex | null;
}

/**
 * A file that starts from set-up stones without a handicap is a position or a
 * problem: its moves are the answer, so the preview stops at the start.
 */
export function isSetupPosition(root: PositionNode): boolean {
  const { AB, AW, HA } = root.data;
  return (AB !== undefined || AW !== undefined) && Number(HA?.[0] ?? 0) < 2;
}

export function finalPosition(root: PositionNode): FinalPosition {
  if (isSetupPosition(root)) root = { data: root.data, children: [] };
  const { boardSize, boardHeight } = parseBoardSize(root.data.SZ?.[0]);
  let board = GoBoard.fromDimensions(boardSize, boardHeight);
  let lastMove: Vertex | null = null;

  const setStones = (coords: string[] | undefined, sign: -1 | 0 | 1) => {
    for (const sgf of coords ?? []) {
      const v = sgfToVertex(sgf);
      if (v && board.has(v)) board.set(v, sign);
    }
  };

  for (let node: PositionNode | undefined = root; node; node = node.children[0]) {
    const { data } = node;
    setStones(data.AE, 0);
    setStones(data.AB, 1);
    setStones(data.AW, -1);

    const coord = data.B?.[0] ?? data.W?.[0];
    if (coord === undefined) continue;
    const vertex = sgfToVertex(coord);
    if (!vertex || !board.has(vertex)) {
      lastMove = null; // a pass
      continue;
    }
    try {
      board = board.makeMove(data.B ? 1 : -1, vertex, { mutate: true });
      lastMove = vertex;
    } catch {
      // Invalid move in SGF, skip
    }
  }

  return { board, lastMove };
}

export function finalPositionFromSGF(content: string): FinalPosition | null {
  try {
    const [root] = parse(content);
    return root ? finalPosition(root as PositionNode) : null;
  } catch {
    return null;
  }
}
