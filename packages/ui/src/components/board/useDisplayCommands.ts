/**
 * Display preferences as View-menu commands, so their buttons can leave the
 * panels: comment text size, pattern names, what the heatmap measures.
 */

import { useGameTree } from '../../contexts/GameTreeContext';
import { useGameTreeAI, useGameTreeBoard } from '../../contexts/selectors';
import { useCommand } from '../../commands/CommandsContext';
import {
  COMMENT_FONT_SCALE_MAX,
  COMMENT_FONT_SCALE_MIN,
  COMMENT_FONT_SCALE_STEP,
  clampCommentFontScale,
} from '../../utils/commentFontScale';

export function useDisplayCommands(): void {
  const { gameSettings, setGameSettings } = useGameTreeBoard();
  const { patternMatchingEnabled, togglePatternMatching } = useGameTree();
  const { aiSettings, setAISettings } = useGameTreeAI();

  const scale = gameSettings.commentFontScale;
  const setScale = (delta: number) =>
    setGameSettings({ commentFontScale: clampCommentFontScale(scale + delta) });
  useCommand('view.commentLarger', () => setScale(COMMENT_FONT_SCALE_STEP), {
    enabled: scale < COMMENT_FONT_SCALE_MAX,
    allowInInput: true,
  });
  useCommand('view.commentSmaller', () => setScale(-COMMENT_FONT_SCALE_STEP), {
    enabled: scale > COMMENT_FONT_SCALE_MIN,
    allowInInput: true,
  });

  useCommand('view.patternNames', togglePatternMatching, { checked: patternMatchingEnabled });

  const metric = aiSettings.heatMapMetric ?? 'policy';
  useCommand('ai.heatmapPolicy', () => setAISettings({ heatMapMetric: 'policy' }), {
    checked: metric === 'policy',
  });
  useCommand('ai.heatmapWinRate', () => setAISettings({ heatMapMetric: 'winRate' }), {
    checked: metric === 'winRate',
  });
  useCommand('ai.heatmapScore', () => setAISettings({ heatMapMetric: 'scoreLead' }), {
    checked: metric === 'scoreLead',
  });
}
