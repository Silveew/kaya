/**
 * Library Integration Hook
 *
 * Hook for managing library panel state with localStorage persistence.
 */

import { useState, useEffect, useCallback } from 'react';
import { useCommand } from '../commands/CommandsContext';

const STORAGE_KEY = 'kaya-show-library';

export function useLibraryPanel() {
  // Load saved preference from localStorage
  const [showLibrary, setShowLibrary] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  // Save preference when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, String(showLibrary));
    }
  }, [showLibrary]);

  // Toggle function
  const toggleLibrary = useCallback(() => {
    setShowLibrary(prev => !prev);
  }, []);

  useCommand('view.toggleLibrary', toggleLibrary, { checked: showLibrary, allowInInput: true });

  return {
    showLibrary,
    setShowLibrary,
    toggleLibrary,
  };
}
