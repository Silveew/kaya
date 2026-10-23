/**
 * Desktop workspaces: Library (browse games, edit game info) and Analyze
 * (board, tree, comments, analysis). One window, switched like tabs.
 */

import { useCallback, useEffect, useState } from 'react';
import { useCommand } from '../../commands/CommandsContext';

export type Workspace = 'library' | 'analyze';

const STORAGE_KEY = 'kaya-workspace';

function loadWorkspace(): Workspace {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'library' ? 'library' : 'analyze';
  } catch {
    return 'analyze';
  }
}

export function useWorkspace(): [Workspace, (workspace: Workspace) => void] {
  const [workspace, setWorkspace] = useState<Workspace>(loadWorkspace);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, workspace);
    } catch {
      // Storage unavailable: the choice just isn't remembered
    }
  }, [workspace]);
  return [workspace, setWorkspace];
}

/** ⌘1 / ⌘2, and the View menu's Library / Analyze items. */
export function useWorkspaceCommands(
  workspace: Workspace,
  setWorkspace: (workspace: Workspace) => void
): void {
  const showLibrary = useCallback(() => setWorkspace('library'), [setWorkspace]);
  const showAnalyze = useCallback(() => setWorkspace('analyze'), [setWorkspace]);
  useCommand('view.library', showLibrary, { checked: workspace === 'library', allowInInput: true });
  useCommand('view.analyze', showAnalyze, { checked: workspace === 'analyze', allowInInput: true });
}
