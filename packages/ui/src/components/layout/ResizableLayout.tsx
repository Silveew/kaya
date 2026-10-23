import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import {
  LuLibrary,
  LuPanelRight,
  LuGitBranch,
  LuInfo,
  LuMessageSquare,
  LuChartLine,
  LuListOrdered,
} from 'react-icons/lu';
import { useLayoutMode, useOrientation } from '../../hooks/useMediaQuery';
import type { MobileTab } from './MobileTabBar';
import { useLayoutPanels } from './useLayoutPanels';
import { CollapsibleSectionHeader } from './CollapsibleSectionHeader';
import { SidebarSection } from './SidebarSection';
import { ResizableLayoutMobile } from './ResizableLayoutMobile';
import { DesktopWorkspaceLayout } from './DesktopWorkspaceLayout';
import type { Workspace } from './useWorkspace';
import './ResizableLayout.css';
import './ResizableLayoutMobile.css';

interface ResizableLayoutProps {
  libraryContent?: React.ReactNode;
  analysisGraphContent?: React.ReactNode;
  boardContent?: React.ReactNode;
  gameTreeContent?: React.ReactNode;
  /** Moves list, shown under the game tree. */
  movesContent?: React.ReactNode;
  gameInfoContent?: React.ReactNode;
  commentContent?: React.ReactNode;
  gameTreeHeaderActions?: React.ReactNode;
  gameInfoHeaderActions?: React.ReactNode;
  commentHeaderActions?: React.ReactNode;
  showLibrary?: boolean;
  showSidebar?: boolean;
  onToggleLibrary?: () => void;
  onToggleSidebar?: () => void;
  /** Controlled active tab for mobile */
  activeMobileTab?: MobileTab;
  /** Callback for mobile tab change */
  onMobileTabChange?: (tab: MobileTab) => void;
  /** Desktop only: lay out by workspace (Library / Analyze) instead of panels. */
  workspace?: Workspace;
  /** Library workspace: the selected game's details. */
  gameDetailsContent?: React.ReactNode;
}

export const ResizableLayout: React.FC<ResizableLayoutProps> = ({
  libraryContent,
  analysisGraphContent,
  boardContent,
  gameTreeContent,
  movesContent,
  gameInfoContent,
  commentContent,
  gameTreeHeaderActions,
  gameInfoHeaderActions,
  commentHeaderActions,
  showLibrary = false,
  showSidebar = true,
  onToggleLibrary,
  onToggleSidebar,
  activeMobileTab,
  onMobileTabChange,
  workspace,
  gameDetailsContent,
}) => {
  const { t } = useTranslation();

  // Detect layout mode (mobile/tablet/desktop)
  const layoutMode = useLayoutMode();
  const orientation = useOrientation();
  // Treat tablet as mobile for layout purposes (use tabs instead of panels)
  const isMobile = layoutMode === 'mobile' || layoutMode === 'tablet';
  const isLandscape = orientation === 'landscape';

  // Mobile tab state (controlled or uncontrolled)
  const [internalActiveTab, setInternalActiveTab] = useState<MobileTab>('board');
  const activeTab = activeMobileTab ?? internalActiveTab;
  const handleTabChange = onMobileTabChange ?? setInternalActiveTab;

  // Panel visibility and sizing from extracted hook
  const {
    panelVisibility,
    leftPanelVisibility,
    togglePanel,
    toggleLeftPanel,
    visibleLeftPanelCount,
    getDefaultSize,
    getLeftPanelSize,
  } = useLayoutPanels();

  // =========================
  // Mobile Layout
  // =========================
  if (isMobile) {
    return (
      <ResizableLayoutMobile
        boardContent={boardContent}
        gameTreeContent={gameTreeContent}
        movesContent={movesContent}
        gameInfoContent={gameInfoContent}
        gameInfoHeaderActions={gameInfoHeaderActions}
        commentContent={commentContent}
        libraryContent={libraryContent}
        analysisGraphContent={analysisGraphContent}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isLandscape={isLandscape}
      />
    );
  }

  if (workspace) {
    return (
      <DesktopWorkspaceLayout
        workspace={workspace}
        boardContent={boardContent}
        gameTreeContent={gameTreeContent}
        gameTreeHeaderActions={gameTreeHeaderActions}
        commentContent={commentContent}
        commentHeaderActions={commentHeaderActions}
        movesContent={movesContent}
        libraryContent={libraryContent}
        gameDetailsContent={gameDetailsContent}
      />
    );
  }

  // =========================
  // Desktop/Tablet Layout
  // =========================
  return (
    <PanelGroup
      direction="horizontal"
      id="main-layout"
      autoSaveId="kaya-main-layout"
      className="panel-group"
    >
      {/* Left panel (Library + Analysis Graph) - always rendered when content exists */}
      {(libraryContent || analysisGraphContent) && (
        <>
          {showLibrary ? (
            <Panel
              id="left-panel"
              order={1}
              defaultSize={25}
              minSize={10}
              maxSize={50}
              className="panel left-panel-container"
            >
              <PanelGroup
                direction="vertical"
                id="left-panel-group"
                autoSaveId="kaya-left-panel-group"
              >
                {/* Library Section */}
                {leftPanelVisibility.library && libraryContent ? (
                  <>
                    <Panel
                      id="library-section"
                      order={1}
                      defaultSize={getLeftPanelSize(leftPanelVisibility.library)}
                      minSize={15}
                      className="panel library-section"
                    >
                      <div className="left-panel-section">
                        <CollapsibleSectionHeader
                          title={t('panels.library')}
                          icon={<LuLibrary size={14} />}
                          isVisible={leftPanelVisibility.library}
                          onToggle={() => toggleLeftPanel('library')}
                        />
                        <div className="left-panel-section-content">{libraryContent}</div>
                      </div>
                    </Panel>
                    {leftPanelVisibility.analysisGraph && analysisGraphContent && (
                      <PanelResizeHandle className="resize-handle resize-handle-horizontal" />
                    )}
                  </>
                ) : libraryContent ? (
                  <div className="collapsed-section-bar">
                    <CollapsibleSectionHeader
                      title={t('panels.library')}
                      icon={<LuLibrary size={14} />}
                      isVisible={false}
                      onToggle={() => toggleLeftPanel('library')}
                    />
                  </div>
                ) : null}

                {/* Analysis Graph Section */}
                {leftPanelVisibility.analysisGraph && analysisGraphContent ? (
                  <Panel
                    id="analysis-graph-section"
                    order={2}
                    defaultSize={visibleLeftPanelCount === 2 ? 40 : 100}
                    minSize={15}
                    className="panel analysis-graph-section"
                  >
                    <div className="left-panel-section">
                      <CollapsibleSectionHeader
                        title={t('panels.analysis')}
                        icon={<LuChartLine size={14} />}
                        isVisible={leftPanelVisibility.analysisGraph}
                        onToggle={() => toggleLeftPanel('analysisGraph')}
                      />
                      <div className="left-panel-section-content">{analysisGraphContent}</div>
                    </div>
                  </Panel>
                ) : analysisGraphContent ? (
                  <div className="collapsed-section-bar">
                    <CollapsibleSectionHeader
                      title={t('panels.analysis')}
                      icon={<LuChartLine size={14} />}
                      isVisible={false}
                      onToggle={() => toggleLeftPanel('analysisGraph')}
                    />
                  </div>
                ) : null}
              </PanelGroup>
            </Panel>
          ) : (
            <div
              className="library-collapsed-indicator"
              onClick={onToggleLibrary}
              title={t('panels.showLibrary')}
            >
              <LuLibrary size={16} />
            </div>
          )}
          {showLibrary && <PanelResizeHandle className="resize-handle resize-handle-vertical" />}
        </>
      )}

      {/* Main board area */}
      <Panel
        id="board-panel"
        order={2}
        defaultSize={showSidebar ? 75 : 100}
        minSize={30}
        className="panel board-panel"
      >
        {boardContent || <div className="placeholder">Board Placeholder</div>}
      </Panel>

      {showSidebar ? (
        <>
          {/* Vertical resize handle */}
          <PanelResizeHandle className="resize-handle resize-handle-vertical" />

          {/* Sidebar with three vertical sections */}
          <Panel
            id="sidebar-panel"
            order={3}
            defaultSize={25}
            minSize={20}
            maxSize={50}
            className="panel sidebar-panel"
          >
            <PanelGroup direction="vertical" id="sidebar-group" autoSaveId="kaya-sidebar-group">
              <SidebarSection
                id="game-tree-panel"
                order={1}
                className="game-tree-section"
                title={t('panels.gameTree')}
                icon={<LuGitBranch size={14} />}
                isVisible={panelVisibility.gameTree}
                onToggle={() => togglePanel('gameTree')}
                defaultSize={getDefaultSize(panelVisibility.gameTree, 'gameTree')}
                headerActions={gameTreeHeaderActions}
                showResizeHandle={
                  (!!movesContent && panelVisibility.moves) ||
                  panelVisibility.gameInfo ||
                  panelVisibility.comment
                }
              >
                {gameTreeContent || <div className="placeholder">Tree Placeholder</div>}
              </SidebarSection>

              {movesContent && (
                <SidebarSection
                  id="moves-panel"
                  order={2}
                  className="moves-section"
                  title={t('panels.moves')}
                  icon={<LuListOrdered size={14} />}
                  isVisible={panelVisibility.moves}
                  onToggle={() => togglePanel('moves')}
                  defaultSize={getDefaultSize(panelVisibility.moves, 'moves')}
                  showResizeHandle={panelVisibility.gameInfo || panelVisibility.comment}
                >
                  {movesContent}
                </SidebarSection>
              )}

              <SidebarSection
                id="game-info-panel"
                order={3}
                className="game-info-section"
                title={t('panels.gameInfo')}
                icon={<LuInfo size={14} />}
                isVisible={panelVisibility.gameInfo}
                onToggle={() => togglePanel('gameInfo')}
                defaultSize={getDefaultSize(panelVisibility.gameInfo, 'gameInfo')}
                headerActions={gameInfoHeaderActions}
                showResizeHandle={panelVisibility.comment}
              >
                {gameInfoContent || <div className="placeholder">Game Info</div>}
              </SidebarSection>

              <SidebarSection
                id="comment-panel"
                order={4}
                className="comments-section"
                title={t('panels.comment')}
                icon={<LuMessageSquare size={14} />}
                isVisible={panelVisibility.comment}
                onToggle={() => togglePanel('comment')}
                defaultSize={getDefaultSize(panelVisibility.comment, 'comment')}
                headerActions={commentHeaderActions}
              >
                {commentContent || <div className="placeholder">Comments</div>}
              </SidebarSection>
            </PanelGroup>
          </Panel>
        </>
      ) : (
        /* Collapsed sidebar indicator */
        <div
          className="sidebar-collapsed-indicator"
          onClick={onToggleSidebar}
          title={t('panels.showSidebar')}
        >
          <LuPanelRight size={16} />
        </div>
      )}
    </PanelGroup>
  );
};
