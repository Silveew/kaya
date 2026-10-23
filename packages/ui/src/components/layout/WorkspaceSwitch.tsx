import React from 'react';
import { useTranslation } from 'react-i18next';
import { useKeyboardShortcuts } from '../../contexts/KeyboardShortcutsContext';
import type { Workspace } from './useWorkspace';

interface WorkspaceSwitchProps {
  workspace: Workspace;
  onChange: (workspace: Workspace) => void;
}

/** Library | Analyze, in the header. */
export const WorkspaceSwitch: React.FC<WorkspaceSwitchProps> = ({ workspace, onChange }) => {
  const { t } = useTranslation();
  const { getBinding, bindingToDisplayString } = useKeyboardShortcuts();

  const option = (id: Workspace, command: 'view.library' | 'view.analyze') => {
    const binding = getBinding(command);
    const label = t(`workspace.${id}`);
    return (
      <button
        type="button"
        role="tab"
        aria-selected={workspace === id}
        className={`workspace-switch__option${workspace === id ? ' is-active' : ''}`}
        onClick={() => onChange(id)}
        title={binding.key ? `${label} (${bindingToDisplayString(binding)})` : label}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="workspace-switch" role="tablist" aria-label={t('workspace.label')}>
      {option('library', 'view.library')}
      {option('analyze', 'view.analyze')}
    </div>
  );
};
