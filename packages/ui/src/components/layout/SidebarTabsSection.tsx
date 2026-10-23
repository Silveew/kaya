import React from 'react';
import { Panel } from 'react-resizable-panels';
import { LuChevronDown, LuChevronRight } from 'react-icons/lu';

export interface SidebarTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface SidebarTabsSectionProps {
  id: string;
  order: number;
  tabs: SidebarTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  isVisible: boolean;
  onToggle: () => void;
  defaultSize: number;
  collapseLabel: string;
}

/**
 * A sidebar section whose header is a row of tabs: the secondary analysis
 * views that are useful now and then but needn't be on screen all the time.
 * Collapsed, only the tab row remains.
 */
export const SidebarTabsSection: React.FC<SidebarTabsSectionProps> = ({
  id,
  order,
  tabs,
  activeTab,
  onTabChange,
  isVisible,
  onToggle,
  defaultSize,
  collapseLabel,
}) => {
  const current = tabs.find(tab => tab.id === activeTab) ?? tabs[0];

  const header = (
    <div className="sidebar-tabs-header" role="tablist">
      <button
        type="button"
        className="sidebar-tabs-toggle"
        onClick={onToggle}
        title={collapseLabel}
        aria-label={collapseLabel}
        aria-expanded={isVisible}
      >
        {isVisible ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
      </button>
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={isVisible && tab.id === current.id}
          className={`sidebar-tabs-tab${isVisible && tab.id === current.id ? ' is-active' : ''}`}
          onClick={() => {
            onTabChange(tab.id);
            if (!isVisible) onToggle();
          }}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );

  if (!isVisible) {
    return <div className="collapsed-section-bar">{header}</div>;
  }

  return (
    <Panel id={id} order={order} defaultSize={defaultSize} minSize={10} className="panel">
      <div className="sidebar-section sidebar-section--tabs">
        {header}
        <div className="sidebar-section-content" role="tabpanel">
          {current.content}
        </div>
      </div>
    </Panel>
  );
};
