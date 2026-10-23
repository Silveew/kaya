/**
 * Hook for keyboard and mouse wheel navigation on the board.
 * Handles arrow keys, home/end, and wheel scrolling with throttling.
 */

import { useEffect, useRef } from 'react';
import { useGameTreeNavigation } from '../../contexts/selectors';
import { useBoardNavigation } from '../../contexts/BoardNavigationContext';
import { useCommand, useCommandWithContext } from '../../commands/CommandsContext';
import type { CommandContext } from '../../commands/commandRegistry';

export function useBoardControlsKeyNav(): void {
  const {
    goBack,
    goForward,
    goToStart,
    goToEnd,
    switchBranch,
    branchInfo,
    canGoBack,
    canGoForward,
  } = useGameTreeNavigation();
  const { navigationMode } = useBoardNavigation();

  // Throttle held keys so auto-repeat doesn't outrun rendering
  const lastStepRef = useRef(0);
  const KEY_THROTTLE_MS = 80; // ~12.5 navigations per second max
  const step = (ctx: CommandContext, action: () => void) => {
    const now = performance.now();
    if (ctx.repeat && now - lastStepRef.current < KEY_THROTTLE_MS) return;
    lastStepRef.current = now;
    requestAnimationFrame(action);
  };

  // Gamepad-style navigation mode owns the arrow keys while it is on
  const keyNav = !navigationMode;
  useCommandWithContext('nav.back', ctx => step(ctx, goBack), { enabled: keyNav && canGoBack });
  useCommandWithContext('nav.forward', ctx => step(ctx, goForward), {
    enabled: keyNav && canGoForward,
  });
  useCommandWithContext('nav.branchUp', ctx => step(ctx, () => switchBranch('next')), {
    enabled: keyNav && branchInfo.hasBranches,
  });
  useCommandWithContext('nav.branchDown', ctx => step(ctx, () => switchBranch('previous')), {
    enabled: keyNav && branchInfo.hasBranches,
  });
  useCommand('nav.start', () => requestAnimationFrame(() => goToStart()), {
    enabled: keyNav && canGoBack,
  });
  useCommand('nav.end', () => requestAnimationFrame(() => goToEnd()), {
    enabled: keyNav && canGoForward,
  });

  useEffect(() => {
    // THROTTLE instead of debounce - execute immediately, then cooldown
    let isThrottled = false;
    let lastDelta = 0;
    const WHEEL_THRESHOLD = 30;
    const THROTTLE_MS = 50; // Minimum time between wheel navigations

    const handleWheel = (e: WheelEvent) => {
      // Only handle wheel events when scrolling over the board wrapper (goban) or game tree
      // Exclude scrollable elements like edit toolbar, score estimator, etc.
      const target = e.target as HTMLElement;
      const isOnBoardWrapper = target.closest('.gameboard-board-wrapper');
      const isOnGameTree = target.closest('.react-flow');
      const isOnScrollableElement = target.closest(
        '.edit-toolbar, .score-estimator, .ai-analysis-config'
      );

      if ((isOnBoardWrapper || isOnGameTree) && !isOnScrollableElement && !isThrottled) {
        // Don't preventDefault - causes warnings with passive listeners
        lastDelta += e.deltaY;

        if (Math.abs(lastDelta) > WHEEL_THRESHOLD) {
          isThrottled = true;

          // Execute navigation immediately in next frame
          requestAnimationFrame(() => {
            if (lastDelta < 0 && canGoBack) {
              goBack();
            } else if (lastDelta > 0 && canGoForward) {
              goForward();
            }
            lastDelta = 0;
          });

          // Reset throttle after cooldown
          setTimeout(() => {
            isThrottled = false;
          }, THROTTLE_MS);
        }
      }
    };

    // Add passive flag to prevent warnings
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [canGoBack, canGoForward, goBack, goForward]);
}
