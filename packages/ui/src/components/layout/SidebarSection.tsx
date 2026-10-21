import React from 'react';
import { Panel, PanelResizeHandle } from 'react-resizable-panels';
import { CollapsibleSectionHeader } from './CollapsibleSectionHeader';

interface SidebarSectionProps {
  id: string;
  order: number;
  className: string;
  title: string;
  icon: React.ReactNode;
  isVisible: boolean;
  onToggle: () => void;
  defaultSize: number;
  headerActions?: React.ReactNode;
  /** Draw a resize handle below the section (a later section is visible). */
  showResizeHandle?: boolean;
  children: React.ReactNode;
}

/**
 * One section of the right sidebar: a resizable panel with a collapsible
 * header, or just the header bar while it is hidden.
 */
export const SidebarSection: React.FC<SidebarSectionProps> = ({
  id,
  order,
  className,
  title,
  icon,
  isVisible,
  onToggle,
  defaultSize,
  headerActions,
  showResizeHandle = false,
  children,
}) => {
  if (!isVisible) {
    return (
      <div className="collapsed-section-bar">
        <CollapsibleSectionHeader title={title} icon={icon} isVisible={false} onToggle={onToggle} />
      </div>
    );
  }

  return (
    <>
      <Panel
        id={id}
        order={order}
        defaultSize={defaultSize}
        minSize={10}
        className={`panel ${className}`}
      >
        <div className="sidebar-section">
          <CollapsibleSectionHeader
            title={title}
            icon={icon}
            isVisible
            onToggle={onToggle}
            headerActions={headerActions}
          />
          <div className="sidebar-section-content">{children}</div>
        </div>
      </Panel>
      {showResizeHandle && <PanelResizeHandle className="resize-handle resize-handle-horizontal" />}
    </>
  );
};
