/**
 * Tests for the Moves panel rows: the branch, coordinates, marks, mark
 * navigation and which marked stones keep a badge on the board.
 *
 * See specs/2026-10-21-moves-list.md.
 */

import { describe, test, expect } from 'bun:test';
import { GameTree, type GameTreeNode } from '@kaya/gametree';
import { parse, sgfNodeToGameTreeNode } from '@kaya/sgf';
import type { SGFProperty } from '../src/types/game';
import { clearAllCaches, reconstructBoard } from '../src/utils/gameCache';
import {
  buildMoveRows,
  collectBoardMoveMarks,
  findMarkedRow,
  getBranch,
} from '../src/utils/moveList';

type Tree = GameTree<SGFProperty>;
type Node = GameTreeNode<SGFProperty>;

function treeFromSGF(sgf: string): Tree {
  const [root] = parse(sgf);
  return new GameTree<SGFProperty>({
    root: sgfNodeToGameTreeNode(root, { value: 0 }, null) as unknown as Node,
  });
}

function mainLineNode(tree: Tree, depth: number): Node {
  let node = tree.root;
  for (let i = 0; i < depth; i++) node = node.children[0];
  return node;
}

describe('buildMoveRows', () => {
  const tree = treeFromSGF(
    '(;SZ[9]GB[1];B[cg]TE[2]C[Good shape\nsecond line];W[]DO[](;B[gc]BM[1])(;B[gg]))'
  );

  test('covers the branch through the current node to its end', () => {
    const rows = buildMoveRows(getBranch(tree, mainLineNode(tree, 1).id), 9);
    expect(rows.map(r => r.coord)).toEqual(['', 'C3', 'pass', 'G7']);
    expect(rows.map(r => r.moveNumber)).toEqual([0, 1, 2, 3]);
    expect(rows.map(r => r.color)).toEqual([null, 'black', 'white', 'black']);
  });

  test('follows the variation the current node is on', () => {
    const variation = mainLineNode(tree, 2).children[1];
    const rows = buildMoveRows(getBranch(tree, variation.id), 9);
    expect(rows[3].coord).toBe('G3');
    expect(rows[3].moveMark).toBeNull();
  });

  test('reads marks and the first comment line', () => {
    const rows = buildMoveRows(getBranch(tree, tree.root.id), 9);
    expect(rows[0].positionMark?.glyph).toBe('+B');
    expect(rows[1].moveMark?.glyph).toBe('!!');
    expect(rows[1].comment).toBe('Good shape');
    expect(rows[2].moveMark?.glyph).toBe('?!');
    expect(rows[3].moveMark?.glyph).toBe('?');
  });
});

describe('findMarkedRow', () => {
  const tree = treeFromSGF('(;SZ[9];B[aa]TE[1];W[bb];B[cc];W[dd]UC[1];B[ee])');
  const rows = buildMoveRows(getBranch(tree, tree.root.id), 9);

  test('finds the next and previous marked node', () => {
    expect(findMarkedRow(rows, 2, 1)?.coord).toBe('D6');
    expect(findMarkedRow(rows, 2, -1)?.coord).toBe('A9');
  });

  test('skips the node it starts from', () => {
    expect(findMarkedRow(rows, 1, 1)?.index).toBe(4);
    expect(findMarkedRow(rows, 4, -1)?.index).toBe(1);
  });

  test('returns null past the last mark', () => {
    expect(findMarkedRow(rows, 4, 1)).toBeNull();
    expect(findMarkedRow(rows, 1, -1)).toBeNull();
  });
});

describe('collectBoardMoveMarks', () => {
  test('badges marked stones up to the current move that are still on the board', () => {
    clearAllCaches();
    // Black A1 (?) is captured by White B1 (!) and A2; Black C3 (!?) comes later.
    const tree = treeFromSGF('(;SZ[9];B[ai]BM[1];W[bi]TE[1];B[ee];W[ah];B[cg]IT[])');
    const current = mainLineNode(tree, 4);
    const rows = buildMoveRows(getBranch(tree, current.id), 9);
    const board = reconstructBoard(tree, current.id, 9);
    const marks = collectBoardMoveMarks(rows, 4, board.signMap);

    // The captured black stone at A1 loses its badge; C3 is not played yet.
    expect(marks.map(m => [m.x, m.y, m.mark.glyph])).toEqual([[1, 8, '!']]);
  });

  test('a later unmarked stone on the same point clears the old badge', () => {
    // Rows do not check legality: stand in for "captured, then replayed".
    const tree = treeFromSGF('(;SZ[9];B[ai]TE[1];W[ee];B[ai])');
    const rows = buildMoveRows(getBranch(tree, tree.root.id), 9);
    const signMap = Array.from({ length: 9 }, () => Array(9).fill(0));
    signMap[8][0] = 1;
    signMap[4][4] = -1;
    expect(collectBoardMoveMarks(rows, 3, signMap)).toEqual([]);
    expect(collectBoardMoveMarks(rows, 1, signMap).map(m => m.mark.glyph)).toEqual(['!']);
  });
});
