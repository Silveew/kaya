import { useEffect, useState } from 'react';

/** Which Analyze sections are open, and the selected tab; remembered. */
export interface AnalyzePanels {
  gameTree: boolean;
  moves: boolean;
  comment: boolean;
  details: boolean;
  detailsTab: string;
}

export type AnalyzeSection = 'gameTree' | 'moves' | 'comment' | 'details';

const PANELS_KEY = 'kaya-analyze-panels';
const DEFAULT_PANELS: AnalyzePanels = {
  gameTree: true,
  moves: true,
  comment: true,
  details: true,
  detailsTab: 'engine',
};

export function useAnalyzePanels() {
  const [panels, setPanels] = useState<AnalyzePanels>(() => {
    try {
      const saved = localStorage.getItem(PANELS_KEY);
      return saved ? { ...DEFAULT_PANELS, ...JSON.parse(saved) } : DEFAULT_PANELS;
    } catch {
      return DEFAULT_PANELS;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(PANELS_KEY, JSON.stringify(panels));
    } catch {
      // Storage unavailable: the layout just isn't remembered
    }
  }, [panels]);
  const toggle = (key: AnalyzeSection) => setPanels(prev => ({ ...prev, [key]: !prev[key] }));
  const setTab = (detailsTab: string) => setPanels(prev => ({ ...prev, detailsTab }));
  return { panels, toggle, setTab };
}

/** Default sizes (%) for the visible sections, keeping the given weights. */
export function sectionSizes<K extends AnalyzeSection>(
  weights: Record<K, number>,
  panels: AnalyzePanels
): Record<K, number> {
  const keys = Object.keys(weights) as K[];
  const total = keys.reduce((sum, key) => sum + (panels[key] ? weights[key] : 0), 0);
  const sizes = {} as Record<K, number>;
  for (const key of keys) sizes[key] = total && panels[key] ? (weights[key] / total) * 100 : 0;
  return sizes;
}
