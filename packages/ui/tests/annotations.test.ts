/**
 * Tests for SGF annotation marks (TE/BM/IT/DO move marks, GB/GW/DM/UC
 * position marks) and the Alt/Option shortcuts that set them.
 *
 * See specs/2026-10-21-annotation-marks.md.
 */

import { describe, test, expect } from 'bun:test';
import { GameTree, type GameTreeNode } from '@kaya/gametree';
import { parse, stringify, sgfNodeToGameTreeNode } from '@kaya/sgf';
import type { SGFProperty } from '../src/types/game';
import {
  getMoveMark,
  getMoveMarkById,
  getPositionMark,
  getPositionMarkById,
  markPropertyEdits,
  type MarkDefinition,
} from '../src/utils/annotations';
import { createBinding } from '../src/hooks/shortcutTypes';
import { createBindingFromEvent, eventMatchesBinding } from '../src/hooks/shortcutUtils';

type Tree = GameTree<SGFProperty>;
type Node = GameTreeNode<SGFProperty>;

function treeFromSGF(sgf: string): Tree {
  const [root] = parse(sgf);
  return new GameTree<SGFProperty>({
    root: sgfNodeToGameTreeNode(root, { value: 0 }, null) as unknown as Node,
  });
}

/** Apply a mark the way useGameModification.setAnnotationMark does. */
function applyMark(
  tree: Tree,
  nodeId: Node['id'],
  kind: 'move' | 'position',
  mark: MarkDefinition<string> | null
): Tree {
  return tree.mutate(draft => {
    for (const [prop, values] of Object.entries(markPropertyEdits(kind, mark))) {
      if (values) draft.updateProperty(nodeId, prop, values);
      else draft.removeProperty(nodeId, prop);
    }
  });
}

function toSGF(tree: Tree): string {
  return stringify([tree.root as never]).replace(/\s+/g, '');
}

describe('reading marks', () => {
  test.each([
    ['TE[1]', 'good', '!'],
    ['TE[2]', 'veryGood', '!!'],
    ['IT[]', 'interesting', '!?'],
    ['DO[]', 'doubtful', '?!'],
    ['BM[1]', 'bad', '?'],
    ['BM[2]', 'veryBad', '??'],
  ])('%s reads as %s', (prop, id, glyph) => {
    const tree = treeFromSGF(`(;SZ[9];B[cc]${prop})`);
    const mark = getMoveMark(tree.root.children[0].data);
    expect(mark?.id).toBe(id as never);
    expect(mark?.glyph).toBe(glyph);
  });

  test.each([
    ['GB[1]', 'goodForBlack', '+B'],
    ['GB[2]', 'clearlyGoodForBlack', '++B'],
    ['GW[1]', 'goodForWhite', '+W'],
    ['GW[2]', 'clearlyGoodForWhite', '++W'],
    ['DM[1]', 'even', '='],
    ['UC[1]', 'unclear', '∞'],
  ])('%s reads as %s', (prop, id, glyph) => {
    const tree = treeFromSGF(`(;SZ[9];B[cc]${prop})`);
    const mark = getPositionMark(tree.root.children[0].data);
    expect(mark?.id).toBe(id as never);
    expect(mark?.glyph).toBe(glyph);
  });

  test('a missing or malformed double value reads as 1', () => {
    expect(getMoveMark({ TE: [''] })?.id).toBe('good');
    expect(getMoveMark({ BM: ['x'] })?.id).toBe('bad');
    expect(getPositionMark({ DM: ['2'] })?.id).toBe('even');
  });

  test('a node without marks has none', () => {
    expect(getMoveMark({ B: ['cc'], C: ['hi'] })).toBeNull();
    expect(getPositionMark({ B: ['cc'] })).toBeNull();
  });

  test('conflicting move properties from other editors resolve to one mark', () => {
    expect(getMoveMark({ BM: ['1'], TE: ['1'] })?.id).toBe('good');
  });
});

describe('setting marks', () => {
  test('writes the property and round-trips through SGF', () => {
    let tree = treeFromSGF('(;SZ[9];B[cc];W[dd])');
    const move = tree.root.children[0];
    tree = applyMark(tree, move.id, 'move', getMoveMarkById('veryGood'));
    tree = applyMark(tree, move.id, 'position', getPositionMarkById('goodForBlack'));

    expect(toSGF(tree)).toBe('(;SZ[9];B[cc]TE[2]GB[1];W[dd])');
    const reread = treeFromSGF(toSGF(tree)).root.children[0].data;
    expect(getMoveMark(reread)?.id).toBe('veryGood');
    expect(getPositionMark(reread)?.id).toBe('goodForBlack');
  });

  test('a new mark replaces the old one of the same kind only', () => {
    let tree = treeFromSGF('(;SZ[9];B[cc]TE[1]DO[]UC[1])');
    const move = tree.root.children[0];
    tree = applyMark(tree, move.id, 'move', getMoveMarkById('bad'));
    const data = tree.get(move.id)!.data;
    expect(data.BM).toEqual(['1']);
    expect(data.TE).toBeUndefined();
    expect(data.DO).toBeUndefined();
    expect(data.UC).toEqual(['1']);
  });

  test('IT and DO are written without a value', () => {
    let tree = treeFromSGF('(;SZ[9];B[cc])');
    const move = tree.root.children[0];
    tree = applyMark(tree, move.id, 'move', getMoveMarkById('interesting'));
    expect(toSGF(tree)).toBe('(;SZ[9];B[cc]IT[])');
  });

  test('clearing removes every mark of that kind and keeps the rest', () => {
    let tree = treeFromSGF('(;SZ[9];B[cc]C[note]TE[2]GW[1])');
    const move = tree.root.children[0];
    tree = applyMark(tree, move.id, 'move', null);
    expect(toSGF(tree)).toBe('(;SZ[9];B[cc]C[note]GW[1])');
    tree = applyMark(tree, move.id, 'position', null);
    expect(toSGF(tree)).toBe('(;SZ[9];B[cc]C[note])');
  });
});

describe('Alt/Option shortcuts', () => {
  const keydown = (init: KeyboardEventInit) =>
    ({
      key: init.key ?? '',
      code: init.code ?? '',
      ctrlKey: !!init.ctrlKey,
      shiftKey: !!init.shiftKey,
      altKey: !!init.altKey,
      metaKey: !!init.metaKey,
    }) as KeyboardEvent;

  test('macOS Option+1 ("¡") matches Alt+1', () => {
    const binding = createBinding('1', { alt: true });
    expect(eventMatchesBinding(keydown({ key: '¡', code: 'Digit1', altKey: true }), binding)).toBe(
      true
    );
    expect(eventMatchesBinding(keydown({ key: '1', code: 'Digit1', altKey: true }), binding)).toBe(
      true
    );
  });

  test('Shift+Option+1 matches Alt+Shift+1, not Alt+1', () => {
    const event = keydown({ key: '⁄', code: 'Digit1', altKey: true, shiftKey: true });
    expect(eventMatchesBinding(event, createBinding('1', { alt: true, shift: true }))).toBe(true);
    expect(eventMatchesBinding(event, createBinding('1', { alt: true }))).toBe(false);
  });

  test('a plain digit does not match Alt+1', () => {
    expect(
      eventMatchesBinding(keydown({ key: '1', code: 'Digit1' }), createBinding('1', { alt: true }))
    ).toBe(false);
  });

  test('recording Option+2 stores the physical key', () => {
    const binding = createBindingFromEvent(keydown({ key: '™', code: 'Digit2', altKey: true }));
    expect(binding?.key).toBe('2');
    expect(binding?.modifiers.alt).toBe(true);
  });
});
