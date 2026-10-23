/**
 * Desktop layout, by workspace.
 *
 * Library: the library, with the selected game's details beside it.
 * Analyze: see AnalyzeWorkspace.
 *
 * See specs/2026-10-21-desktop-workspaces.md.
 */

import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { AnalyzeWorkspace, type AnalyzeWorkspaceProps } from './AnalyzeWorkspace';
import type { Workspace } from './useWorkspace';
import './DesktopWorkspaceLayout.css';

interface DesktopWorkspaceLayoutProps extends AnalyzeWorkspaceProps {
  workspace: Workspace;
  libraryContent?: React.ReactNode;
  gameDetailsContent?: React.ReactNode;
}

export const DesktopWorkspaceLayout: React.FC<DesktopWorkspaceLayoutProps> = ({
  workspace,
  libraryContent,
  gameDetailsContent,
  ...analyzeProps
}) => {
  if (workspace === 'analyze') {
    return <AnalyzeWorkspace {...analyzeProps} />;
  }

  return (
    <PanelGroup
      direction="horizontal"
      id="library-workspace"
      autoSaveId="kaya-library-workspace"
      className="panel-group"
    >
      <Panel id="library-main" order={1} defaultSize={62} minSize={30} className="panel">
        <div className="workspace-library">{libraryContent}</div>
      </Panel>
      <PanelResizeHandle className="resize-handle resize-handle-vertical" />
      <Panel
        id="library-details"
        order={2}
        defaultSize={38}
        minSize={20}
        maxSize={60}
        className="panel sidebar-panel"
      >
        {gameDetailsContent}
      </Panel>
    </PanelGroup>
  );
};
