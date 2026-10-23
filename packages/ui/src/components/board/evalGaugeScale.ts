/**
 * Where the eval gauge's Black/White boundary sits, as Black's share of the
 * bar (0 = all White, 1 = all Black).
 *
 * Score scale: symmetric log of the score lead, so a 1-point and a 3-point
 * lead look different, and so do a 15- and a 40-point lead. Win rate
 * saturates within a few points, which made a linear win-rate bar look full
 * at ±3.
 */

export type EvalGaugeScale = 'score' | 'winRate';

/** A lead this large (in points) fills the bar. */
export const SCORE_SCALE_CAP = 60;

export function evalGaugeShare(
  scale: EvalGaugeScale,
  winRate: number,
  scoreLead: number | null
): number {
  if (scale === 'winRate' || scoreLead === null) {
    return Math.min(Math.max(winRate, 0), 1);
  }
  const magnitude = Math.min(Math.log1p(Math.abs(scoreLead)) / Math.log1p(SCORE_SCALE_CAP), 1);
  return 0.5 + 0.5 * Math.sign(scoreLead) * magnitude;
}
