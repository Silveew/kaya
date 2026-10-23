/**
 * Tests for the final position shown in the library preview.
 */

import { describe, test, expect } from 'bun:test';
import { finalPositionFromSGF } from '../src/utils/finalPosition';

describe('finalPositionFromSGF', () => {
  test('replays the main line, not variations', () => {
    const position = finalPositionFromSGF('(;SZ[9];B[aa](;W[bb];B[cc])(;W[dd]))');
    expect(position?.board.get([0, 0])).toBe(1);
    expect(position?.board.get([1, 1])).toBe(-1);
    expect(position?.board.get([2, 2])).toBe(1);
    expect(position?.board.get([3, 3])).toBe(0);
    expect(position?.lastMove).toEqual([2, 2]);
  });

  test('applies setup stones and removes captures', () => {
    const position = finalPositionFromSGF('(;SZ[9]AB[ba][ab]AW[aa])');
    expect(position?.board.get([0, 0])).toBe(-1);

    const captured = finalPositionFromSGF('(;SZ[9]AB[ba]AW[aa];B[ab])');
    expect(captured?.board.get([0, 0])).toBe(0);
  });

  test('uses the board size from SZ, including rectangular boards', () => {
    const position = finalPositionFromSGF('(;SZ[9:13];B[am])');
    expect(position?.board.width).toBe(9);
    expect(position?.board.height).toBe(13);
    expect(position?.board.get([0, 12])).toBe(1);
  });

  test('a final pass leaves no last move', () => {
    const position = finalPositionFromSGF('(;SZ[9];B[aa];W[])');
    expect(position?.board.get([0, 0])).toBe(1);
    expect(position?.lastMove).toBeNull();
  });
});
