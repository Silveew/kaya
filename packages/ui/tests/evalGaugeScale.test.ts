import { test, expect, describe } from 'bun:test';
import { evalGaugeShare, SCORE_SCALE_CAP } from '../src/components/board/evalGaugeScale';

describe('evalGaugeShare on the score scale', () => {
  test('an even game sits in the middle', () => {
    expect(evalGaugeShare('score', 0.9, 0)).toBe(0.5);
  });

  test('is symmetric between Black and White', () => {
    for (const lead of [0.5, 3, 12, 40]) {
      expect(evalGaugeShare('score', 0.5, -lead)).toBeCloseTo(
        1 - evalGaugeShare('score', 0.5, lead)
      );
    }
  });

  test('keeps separating leads well past the point where win rate saturates', () => {
    const shares = [1, 3, 10, 30].map(lead => evalGaugeShare('score', 0.5, lead));
    for (let i = 1; i < shares.length; i++) {
      expect(shares[i] - shares[i - 1]).toBeGreaterThan(0.05);
    }
  });

  test('fills the bar at the cap and stays within it beyond', () => {
    expect(evalGaugeShare('score', 0.5, SCORE_SCALE_CAP)).toBeCloseTo(1);
    expect(evalGaugeShare('score', 0.5, -500)).toBe(0);
  });
});

describe('evalGaugeShare on the win-rate scale', () => {
  test("is Black's win rate, clamped", () => {
    expect(evalGaugeShare('winRate', 0.68, 4.5)).toBe(0.68);
    expect(evalGaugeShare('winRate', 1.2, 4.5)).toBe(1);
  });
});
