/**
 * Tests for exporting a position (board at a node + the tree below it) as a
 * standalone SGF.
 *
 * See specs/2026-10-21-export-position.md.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { GameTree, type GameTreeNode } from '@kaya/gametree';
import { parse, sgfNodeToGameTreeNode } from '@kaya/sgf';
import type { SGFProperty } from '../src/types/game';
import { clearAllCaches, reconstructBoard } from '../src/utils/gameCache';
import { exportPosition } from '../src/utils/exportPosition';

type Tree = GameTree<SGFProperty>;
type Node = GameTreeNode<SGFProperty>;

function treeFromSGF(sgf: string): Tree {
  const [root] = parse(sgf);
  return new GameTree<SGFProperty>({
    root: sgfNodeToGameTreeNode(root, { value: 0 }, null) as unknown as Node,
  });
}

/** Follow the first child `depth` times from the root. */
function mainLineNode(tree: Tree, depth: number): Node {
  let node = tree.root;
  for (let i = 0; i < depth; i++) node = node.children[0];
  return node;
}

function exportAt(
  tree: Tree,
  depth: number,
  options: { title?: string; sourceName?: string } = {}
) {
  const node = mainLineNode(tree, depth);
  const board = reconstructBoard(tree, node.id, 9);
  const result = exportPosition(tree, node.id, { board, ...options });
  if (!result) throw new Error('export failed');
  const [root] = parse(result.sgf);
  return { result, root };
}

const GAME =
  '(;GM[1]FF[4]SZ[9]KM[6.5]PB[Black]PW[GNU Go]DT[2026-10-19]C[game comment]' +
  ';B[cc];W[gg]C[the key moment]KA[{"w":0.4}]TR[ee]' +
  ';B[gc](;W[cg]C[main];B[ee])(;W[ce]C[variation]))';

beforeEach(() => clearAllCaches());

describe('exportPosition', () => {
  test('root holds the board after the chosen move as setup stones', () => {
    const { root } = exportAt(treeFromSGF(GAME), 2);
    expect(root.data.AB).toEqual(['cc']);
    expect(root.data.AW).toEqual(['gg']);
    expect(root.data.B).toBeUndefined();
    expect(root.data.W).toBeUndefined();
  });

  test('side to move follows the last move', () => {
    expect(exportAt(treeFromSGF(GAME), 2).root.data.PL).toEqual(['B']);
    expect(exportAt(treeFromSGF(GAME), 3).root.data.PL).toEqual(['W']);
  });

  test("chosen node's comment, markup and analysis move to the root", () => {
    const { root } = exportAt(treeFromSGF(GAME), 2);
    expect(root.data.C).toEqual(['the key moment']);
    expect(root.data.KA).toEqual(['{"w":0.4}']);
    expect(root.data.TR).toEqual(['ee']);
  });

  test('game info is kept, the source root comment is not', () => {
    const { root } = exportAt(treeFromSGF(GAME), 2);
    expect(root.data.SZ).toEqual(['9']);
    expect(root.data.KM).toEqual(['6.5']);
    expect(root.data.PB).toEqual(['Black']);
    expect(root.data.PW).toEqual(['GNU Go']);
    expect(root.data.DT).toEqual(['2026-10-19']);
    expect(root.data.C).not.toEqual(['game comment']);
  });

  test('the whole tree below the node is copied, variations included', () => {
    const { root } = exportAt(treeFromSGF(GAME), 2);
    expect(root.children).toHaveLength(1);
    const next = root.children[0];
    expect(next.data.B).toEqual(['gc']);
    expect(next.children.map(c => c.data.C?.[0])).toEqual(['main', 'variation']);
    expect(next.children[0].children[0].data.B).toEqual(['ee']);
  });

  test('captured stones are not in the exported position', () => {
    // B[bb] takes White's last liberty at ba.
    const sgf = '(;GM[1]SZ[9];B[aa];W[ba];B[ca];W[ee];B[bb])';
    const { root } = exportAt(treeFromSGF(sgf), 5);
    expect(root.data.AB).toEqual(['aa', 'ca', 'bb']);
    expect(root.data.AW).toEqual(['ee']);
  });

  test('handicap stones are part of the position and HA is dropped', () => {
    const sgf = '(;GM[1]SZ[9]HA[2]AB[cc][gg]PL[W];W[ee])';
    const { root } = exportAt(treeFromSGF(sgf), 1);
    expect(root.data.AB).toEqual(['cc', 'gg']);
    expect(root.data.AW).toEqual(['ee']);
    expect(root.data.HA).toBeUndefined();
    expect(root.data.PL).toEqual(['B']);
  });

  test('title goes to GN and the file name; source and move to GC', () => {
    const tree = treeFromSGF(GAME);
    const titled = exportAt(tree, 2, { title: '  Invasion at 3-3 ', sourceName: 'vs GNU Go.sgf' });
    expect(titled.root.data.GN).toEqual(['Invasion at 3-3']);
    expect(titled.root.data.GC).toEqual(['From vs GNU Go, move 2']);
    expect(titled.result.fileName).toBe('Invasion at 3-3');

    const untitled = exportAt(tree, 2, { sourceName: 'vs GNU Go.sgf' });
    expect(untitled.root.data.GN).toBeUndefined();
    expect(untitled.result.fileName).toBe('vs GNU Go - move 2');
  });

  test('the source game is left untouched', () => {
    const tree = treeFromSGF(GAME);
    const before = JSON.stringify(tree.root);
    exportAt(tree, 2, { title: 'x' });
    expect(JSON.stringify(tree.root)).toBe(before);
  });
});
