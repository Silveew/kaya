/**
 * ExportPositionDialog - asks for an optional title before a position from the
 * game tree is saved to the library's Positions folder.
 *
 * See specs/2026-10-21-export-position.md.
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useCloseOnBack } from '../../hooks/useCloseOnBack';
import '../dialogs/SaveFileDialog.css';

interface ExportPositionDialogProps {
  isOpen: boolean;
  /** File name used when no title is given. */
  defaultName: string;
  folderName: string;
  onClose: () => void;
  onExport: (title: string) => void;
}

export const ExportPositionDialog: React.FC<ExportPositionDialogProps> = ({
  isOpen,
  defaultName,
  folderName,
  onClose,
  onExport,
}) => {
  const { t } = useTranslation();
  useCloseOnBack(isOpen, onClose);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = () => {
    onExport(title.trim());
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Keep typing out of the global board shortcuts.
    e.stopPropagation();
    if (e.key === 'Enter') handleExport();
    else if (e.key === 'Escape') onClose();
  };

  return createPortal(
    <div className="save-file-dialog-overlay" onClick={onClose}>
      <div
        className="save-file-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-position-heading"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="export-position-heading">{t('exportPosition.title')}</h2>

        <div className="save-file-dialog-content">
          <label htmlFor="export-position-title">{t('exportPosition.titleLabel')}</label>
          <input
            ref={inputRef}
            id="export-position-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={defaultName}
          />
          <small className="save-file-dialog-hint">
            {t('exportPosition.hint', { folder: folderName })}
          </small>
        </div>

        <div className="save-file-dialog-buttons">
          <button onClick={onClose} className="button-secondary">
            {t('cancel')}
          </button>
          <button onClick={handleExport} className="button-primary">
            {t('exportPosition.export')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
