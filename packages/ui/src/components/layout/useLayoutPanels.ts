import { useState, useEffect, useCallback } from 'react';

// Storage keys for panel visibility
const STORAGE_KEY = 'kaya-sidebar-panels';
const LEFT_PANEL_STORAGE_KEY = 'kaya-left-panels';

export interface SidebarPanelVisibility {
  gameTree: boolean;
  moves: boolean;
  gameInfo: boolean;
  comment: boolean;
}

export interface LeftPanelVisibility {
  library: boolean;
  analysisGraph: boolean;
}

const DEFAULT_VISIBILITY: SidebarPanelVisibility = {
  gameTree: true,
  moves: true,
  gameInfo: true,
  comment: true,
};

const PANEL_WEIGHTS: Record<keyof SidebarPanelVisibility, number> = {
  gameTree: 45,
  moves: 25,
  gameInfo: 15,
  comment: 15,
};

const DEFAULT_LEFT_VISIBILITY: LeftPanelVisibility = {
  library: true,
  analysisGraph: true,
};

export function useLayoutPanels() {
  // Load initial visibility from localStorage (right sidebar)
  const [panelVisibility, setPanelVisibility] = useState<SidebarPanelVisibility>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_VISIBILITY, ...JSON.parse(saved) };
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_VISIBILITY;
  });

  // Load initial visibility for left panel sections
  const [leftPanelVisibility, setLeftPanelVisibility] = useState<LeftPanelVisibility>(() => {
    try {
      const saved = localStorage.getItem(LEFT_PANEL_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_LEFT_VISIBILITY, ...JSON.parse(saved) };
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_LEFT_VISIBILITY;
  });

  // Save visibility to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(panelVisibility));
  }, [panelVisibility]);

  useEffect(() => {
    localStorage.setItem(LEFT_PANEL_STORAGE_KEY, JSON.stringify(leftPanelVisibility));
  }, [leftPanelVisibility]);

  const togglePanel = useCallback((panel: keyof SidebarPanelVisibility) => {
    setPanelVisibility(prev => ({ ...prev, [panel]: !prev[panel] }));
  }, []);

  const toggleLeftPanel = useCallback((panel: keyof LeftPanelVisibility) => {
    setLeftPanelVisibility(prev => ({ ...prev, [panel]: !prev[panel] }));
  }, []);

  // Count visible panels for sizing (right sidebar)
  const visiblePanelCount = [
    panelVisibility.gameTree,
    panelVisibility.moves,
    panelVisibility.gameInfo,
    panelVisibility.comment,
  ].filter(Boolean).length;

  // Calculate default sizes based on visible panels. With all four visible:
  // Game Tree 45%, Moves 25%, Game Info 15%, Comment 15%; otherwise the
  // visible ones keep these proportions.
  const getDefaultSize = (isVisible: boolean, panelName: keyof SidebarPanelVisibility) => {
    if (!isVisible) return 0;
    const total = (Object.keys(PANEL_WEIGHTS) as (keyof SidebarPanelVisibility)[])
      .filter(name => panelVisibility[name])
      .reduce((sum, name) => sum + PANEL_WEIGHTS[name], 0);
    return (PANEL_WEIGHTS[panelName] / total) * 100;
  };

  // Count visible left panels for sizing
  const visibleLeftPanelCount = [
    leftPanelVisibility.library,
    leftPanelVisibility.analysisGraph,
  ].filter(Boolean).length;

  const getLeftPanelSize = (isVisible: boolean) => {
    if (!isVisible) return 0;
    return visibleLeftPanelCount === 2 ? 60 : 100;
  };

  return {
    panelVisibility,
    leftPanelVisibility,
    togglePanel,
    toggleLeftPanel,
    visiblePanelCount,
    visibleLeftPanelCount,
    getDefaultSize,
    getLeftPanelSize,
  };
}
