/**
 * KeyBinding → native menu accelerator string (Tauri/muda syntax).
 */

import type { KeyBinding } from '../hooks/shortcutTypes';

const KEY_NAMES: Record<string, string> = {
  arrowleft: 'Left',
  arrowright: 'Right',
  arrowup: 'Up',
  arrowdown: 'Down',
  home: 'Home',
  end: 'End',
  enter: 'Enter',
  escape: 'Escape',
  backspace: 'Backspace',
  delete: 'Delete',
  tab: 'Tab',
  ' ': 'Space',
  ',': 'Comma',
  '.': 'Period',
  '/': 'Slash',
  ';': 'Semicolon',
  '-': 'Minus',
  '=': 'Equal',
};

/**
 * The accelerator for a binding, or null when it should not get one.
 *
 * Only Cmd/Ctrl combinations become accelerators. A native menu sees a key
 * before the webview does, so a bare letter or ⌥-digit accelerator would
 * fire while typing a comment; those keys stay with the in-page dispatcher.
 */
export function bindingToAccelerator(binding: KeyBinding): string | null {
  const { key, modifiers } = binding;
  if (!key || (!modifiers.meta && !modifiers.ctrl)) return null;

  let name = KEY_NAMES[key];
  if (!name) {
    if (/^[a-z0-9]$/.test(key)) name = key.toUpperCase();
    else if (/^f\d{1,2}$/.test(key)) name = key.toUpperCase();
    else return null;
  }

  const parts: string[] = [];
  if (modifiers.meta) parts.push('Cmd');
  if (modifiers.ctrl) parts.push('Ctrl');
  if (modifiers.alt) parts.push('Alt');
  if (modifiers.shift) parts.push('Shift');
  parts.push(name);
  return parts.join('+');
}
