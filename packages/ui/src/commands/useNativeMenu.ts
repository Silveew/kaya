/**
 * Builds the desktop menu bar from the menu model and keeps every item's
 * enabled / checked state in step with the command registry.
 *
 * The menu is rebuilt only when labels or shortcuts change (language switch,
 * rebinding). Moving through a game flips many enabled flags, so state
 * changes go to the existing items one setter call at a time instead.
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  CheckMenuItem,
  Menu,
  MenuItem,
  PredefinedMenuItem,
  Submenu,
} from '@tauri-apps/api/menu';
import { isTauriApp } from '@kaya/platform';
import { isMac } from '../hooks/shortcutTypes';
import { useKeyboardShortcutsContext } from '../contexts/KeyboardShortcutsContext';
import { useCommandRegistry, useCommandRegistryVersion } from './CommandsContext';
import type { CommandId, CommandRegistry } from './commandRegistry';
import { bindingToAccelerator } from './accelerator';
import { buildMenuModel, NO_ACCELERATOR, type MenuAppAction, type MenuEntry } from './menuModel';

export interface NativeMenuActions {
  onAbout: () => void;
  onCheckUpdate: () => void;
  onOpenUrl: (url: string) => void;
}

const URLS: Partial<Record<MenuAppAction, string>> = {
  github: 'https://github.com/kaya-go/kaya',
  reportIssue: 'https://github.com/kaya-go/kaya/issues/new/choose',
};

type NativeItem = MenuItem | CheckMenuItem | Submenu | PredefinedMenuItem;

/**
 * True in the desktop app, where the menu bar carries every command and the
 * in-window toolbars can drop their buttons. The Android/iOS builds are
 * Tauri too, but have no menu bar.
 */
export function hasNativeMenuBar(): boolean {
  return isTauriApp() && !/Android|iPhone|iPad/.test(navigator.userAgent);
}

interface CommandItem {
  id: CommandId;
  item: MenuItem | CheckMenuItem;
  isToggle: boolean;
  enabled: boolean;
  checked: boolean;
}

function syncItems(items: CommandItem[], registry: CommandRegistry): void {
  for (const entry of items) {
    const state = registry.getState(entry.id);
    if (state.enabled !== entry.enabled) {
      entry.enabled = state.enabled;
      void entry.item.setEnabled(state.enabled);
    }
    const checked = state.checked === true;
    if (entry.isToggle && checked !== entry.checked) {
      entry.checked = checked;
      void (entry.item as CheckMenuItem).setChecked(checked);
    }
  }
}

export function useNativeMenu(actions: NativeMenuActions): void {
  const { t, i18n } = useTranslation();
  const registry = useCommandRegistry();
  const version = useCommandRegistryVersion();
  const { shortcuts, getBinding } = useKeyboardShortcutsContext();

  const itemsRef = useRef<CommandItem[]>([]);
  const menuRef = useRef<Menu | null>(null);
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  });

  useEffect(() => {
    if (!hasNativeMenuBar()) return;
    let cancelled = false;

    const build = async () => {
      const api = await import('@tauri-apps/api/menu');
      const items: CommandItem[] = [];

      const runAction = (action: MenuAppAction) => {
        const url = URLS[action];
        if (url) actionsRef.current.onOpenUrl(url);
        else if (action === 'about') actionsRef.current.onAbout();
        else if (action === 'checkUpdate') actionsRef.current.onCheckUpdate();
      };

      const makeCommand = async (command: CommandId, toggle: boolean): Promise<NativeItem> => {
        const state = registry.getState(command);
        const accelerator = NO_ACCELERATOR.has(command)
          ? null
          : bindingToAccelerator(getBinding(command));
        const options = {
          text: t(`menuBar.items.${command}`, {
            defaultValue: t(`shortcuts.actions.${command}`),
          }),
          enabled: state.enabled,
          ...(accelerator ? { accelerator } : {}),
          action: () => {
            registry.run(command, { source: 'menu', repeat: false });
          },
        };
        const checked = state.checked === true;
        const item = toggle
          ? await api.CheckMenuItem.new({ ...options, checked })
          : await api.MenuItem.new(options);
        items.push({ id: command, item, isToggle: toggle, enabled: state.enabled, checked });
        return item;
      };

      const makeEntry = async (entry: MenuEntry): Promise<NativeItem> => {
        if ('predefined' in entry) return api.PredefinedMenuItem.new({ item: entry.predefined });
        if ('action' in entry) {
          return api.MenuItem.new({
            text: t(`menuBar.actions.${entry.action}`),
            action: () => runAction(entry.action),
          });
        }
        if ('submenu' in entry) {
          return api.Submenu.new({
            text: t(`menuBar.${entry.submenu}`),
            items: await makeEntries(entry.items),
          });
        }
        return makeCommand(entry.command, entry.toggle ?? false);
      };

      const makeEntries = async (entries: MenuEntry[]): Promise<NativeItem[]> => {
        const result: NativeItem[] = [];
        for (const entry of entries) result.push(await makeEntry(entry));
        return result;
      };

      const sections: Submenu[] = [];
      for (const section of buildMenuModel(isMac)) {
        sections.push(
          await api.Submenu.new({
            text: section.title ? t(`menuBar.${section.title}`) : 'Kaya',
            items: await makeEntries(section.items),
          })
        );
      }
      const menu = await api.Menu.new({ items: sections });
      if (cancelled) {
        void menu.close();
        return;
      }
      await menu.setAsAppMenu();
      // Release the replaced menu only once the new one is in place
      const previous = menuRef.current;
      menuRef.current = menu;
      if (previous) void previous.close();
      itemsRef.current = items;
      // Commands may have changed state while the items were being created
      syncItems(items, registry);
    };

    build().catch(error => console.error('Failed to build the menu bar:', error));

    return () => {
      cancelled = true;
    };
    // `shortcuts` changes when a binding is edited, `t` on a language switch
  }, [registry, t, i18n.language, shortcuts, getBinding]);

  useEffect(() => {
    syncItems(itemsRef.current, registry);
  }, [version, registry]);
}
