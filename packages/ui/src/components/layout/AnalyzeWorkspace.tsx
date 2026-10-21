/**
 * The Analyze workspace: the board and the panels needed while reviewing.
 *
 * One sidebar (layout A): game tree, comment (the largest section) and a tab
 * section with Engine, Analysis and Moves.
 * Wide windows (layout B): the game tree and moves list on the left, the
 * comment and the Engine / Analysis tabs on the right.
 *
 * See specs/2026-10-21-desktop-workspaces.md.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import {
  LuGitBranch,
  LuMessageSquare,
  LuChartLine,
  LuListOrdered,
  LuListTree,
} from 'react-icons/lu';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { EngineLinesPanel } from '../analysis/EngineLinesPanel';
import { SidebarSection } from './SidebarSection';
import { SidebarTabsSection, type SidebarTab } from './SidebarTabsSection';
import { useAnalyzePanels, sectionSizes } from './useAnalyzePanels';

/** From this window width the panels go on both sides of the board. */
const WIDE_QUERY = '(min-width: 1600px)';

export interface AnalyzeWorkspaceProps {
  boardContent?: React.ReactNode;
  gameTreeContent?: React.ReactNode;
  gameTreeHeaderActions?: React.ReactNode;
  commentContent?: React.ReactNode;
  commentHeaderActions?: React.ReactNode;
  analysisContent?: React.ReactNode;
  movesContent?: React.ReactNode;
}

export const AnalyzeWorkspace: React.FC<AnalyzeWorkspaceProps> = ({
  boardContent,
  gameTreeContent,
  gameTreeHeaderActions,
  commentContent,
  commentHeaderActions,
  analysisContent,
  movesContent,
}) => {
  const { t } = useTranslation();
  const wide = useMediaQuery(WIDE_QUERY);
  const { panels, toggle, setTab } = useAnalyzePanels();

  const engineTab: SidebarTab = {
    id: 'engine',
    label: t('engineLines.title'),
    icon: <LuListTree size={14} />,
    content: <EngineLinesPanel />,
  };
  const analysisTab: SidebarTab = {
    id: 'analysis',
    label: t('panels.analysis'),
    icon: <LuChartLine size={14} />,
    content: analysisContent,
  };
  const movesTab: SidebarTab = {
    id: 'moves',
    label: t('panels.moves'),
    icon: <LuListOrdered size={14} />,
    content: movesContent,
  };

  const tree = (size: number, handle: boolean) => (
    <SidebarSection
      id="analyze-tree"
      order={1}
      className="game-tree-section"
      title={t('panels.gameTree')}
      icon={<LuGitBranch size={14} />}
      isVisible={panels.gameTree}
      onToggle={() => toggle('gameTree')}
      defaultSize={size}
      headerActions={gameTreeHeaderActions}
      showResizeHandle={handle}
    >
      {gameTreeContent}
    </SidebarSection>
  );
  const comment = (order: number, size: number, handle: boolean) => (
    <SidebarSection
      id="analyze-comment"
      order={order}
      className="comments-section"
      title={t('panels.comment')}
      icon={<LuMessageSquare size={14} />}
      isVisible={panels.comment}
      onToggle={() => toggle('comment')}
      defaultSize={size}
      headerActions={commentHeaderActions}
      showResizeHandle={handle}
    >
      {commentContent}
    </SidebarSection>
  );
  const details = (order: number, size: number, tabs: SidebarTab[]) => (
    <SidebarTabsSection
      id="analyze-details"
      order={order}
      tabs={tabs}
      activeTab={panels.detailsTab}
      onTabChange={setTab}
      isVisible={panels.details}
      onToggle={() => toggle('details')}
      defaultSize={size}
      collapseLabel={panels.details ? t('workspace.collapse') : t('workspace.expand')}
    />
  );
  const board = (order: number, size: number) => (
    <Panel
      id="analyze-board"
      order={order}
      defaultSize={size}
      minSize={35}
      className="panel board-panel"
    >
      {boardContent}
    </Panel>
  );

  if (wide) {
    const left = sectionSizes({ gameTree: 65, moves: 35 }, panels);
    const right = sectionSizes({ comment: 55, details: 45 }, panels);
    return (
      <PanelGroup
        direction="horizontal"
        id="analyze-wide"
        autoSaveId="kaya-analyze-wide"
        className="panel-group"
      >
        <Panel
          id="analyze-left"
          order={1}
          defaultSize={20}
          minSize={12}
          maxSize={32}
          className="panel sidebar-panel"
        >
          <PanelGroup direction="vertical" id="analyze-left-group" autoSaveId="kaya-analyze-left">
            {tree(left.gameTree, panels.moves)}
            <SidebarSection
              id="analyze-moves"
              order={2}
              className="moves-section"
              title={t('panels.moves')}
              icon={<LuListOrdered size={14} />}
              isVisible={panels.moves}
              onToggle={() => toggle('moves')}
              defaultSize={left.moves}
            >
              {movesContent}
            </SidebarSection>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle className="resize-handle resize-handle-vertical" />
        {board(2, 54)}
        <PanelResizeHandle className="resize-handle resize-handle-vertical" />
        <Panel
          id="analyze-right"
          order={3}
          defaultSize={26}
          minSize={16}
          maxSize={40}
          className="panel sidebar-panel"
        >
          <PanelGroup direction="vertical" id="analyze-right-group" autoSaveId="kaya-analyze-right">
            {comment(1, right.comment, panels.details)}
            {details(2, right.details, [engineTab, analysisTab])}
          </PanelGroup>
        </Panel>
      </PanelGroup>
    );
  }

  const sizes = sectionSizes({ gameTree: 30, comment: 40, details: 30 }, panels);
  return (
    <PanelGroup
      direction="horizontal"
      id="analyze-workspace"
      autoSaveId="kaya-analyze-workspace"
      className="panel-group"
    >
      {board(1, 68)}
      <PanelResizeHandle className="resize-handle resize-handle-vertical" />
      <Panel
        id="analyze-sidebar"
        order={2}
        defaultSize={32}
        minSize={20}
        maxSize={50}
        className="panel sidebar-panel"
      >
        <PanelGroup
          direction="vertical"
          id="analyze-sidebar-group"
          autoSaveId="kaya-analyze-sidebar"
        >
          {tree(sizes.gameTree, panels.comment || panels.details)}
          {comment(2, sizes.comment, panels.details)}
          {details(3, sizes.details, [engineTab, analysisTab, movesTab])}
        </PanelGroup>
      </Panel>
    </PanelGroup>
  );
};
