/**
 * The desktop menu bar, as data. useNativeMenu turns it into a Tauri menu.
 *
 * Labels come from `menuBar.items.<command>` when a menu needs different
 * wording from the shortcut list, else from `shortcuts.actions.<command>`.
 */

import type { CommandId } from './commandRegistry';

export type MenuAppAction = 'about' | 'checkUpdate' | 'github' | 'reportIssue';

export type MenuPredefined =
  | 'Separator'
  | 'Cut'
  | 'Copy'
  | 'Paste'
  | 'SelectAll'
  | 'Minimize'
  | 'Maximize'
  | 'CloseWindow'
  | 'Services'
  | 'Hide'
  | 'HideOthers'
  | 'ShowAll'
  | 'Quit';

export type MenuEntry =
  | { command: CommandId; toggle?: boolean }
  | { action: MenuAppAction }
  | { predefined: MenuPredefined }
  | { submenu: string; items: MenuEntry[] };

export interface MenuSection {
  /** i18n key under `menuBar.` for the title; null keeps the app name. */
  title: string | null;
  items: MenuEntry[];
}

const SEP: MenuEntry = { predefined: 'Separator' };
const cmd = (command: CommandId): MenuEntry => ({ command });
const toggle = (command: CommandId): MenuEntry => ({ command, toggle: true });

/**
 * Commands whose key must not become a menu key equivalent. ⌘Z/⇧⌘Z would
 * take undo away from text fields; their keys still work through the in-page
 * dispatcher, which skips text fields. ⌘V for Paste SGF arrives as a native
 * paste event and belongs to the Edit menu's Paste item.
 */
export const NO_ACCELERATOR: ReadonlySet<CommandId> = new Set<CommandId>([
  'edit.undo',
  'edit.redo',
  'file.paste',
]);

export function buildMenuModel(isMac: boolean): MenuSection[] {
  const appMenu: MenuSection = {
    title: null,
    items: [
      { action: 'about' },
      SEP,
      { action: 'checkUpdate' },
      SEP,
      cmd('view.openSettings'),
      SEP,
      { predefined: 'Services' },
      SEP,
      { predefined: 'Hide' },
      { predefined: 'HideOthers' },
      { predefined: 'ShowAll' },
      SEP,
      { predefined: 'Quit' },
    ],
  };

  const file: MenuSection = {
    title: 'file',
    items: [
      cmd('file.new'),
      cmd('file.quickNew'),
      cmd('file.open'),
      cmd('file.scanBoard'),
      SEP,
      cmd('file.save'),
      cmd('file.saveAs'),
      cmd('file.export'),
      SEP,
      cmd('file.copySgf'),
      cmd('file.paste'),
      ...(isMac ? [] : [SEP, cmd('view.openSettings')]),
    ],
  };

  const edit: MenuSection = {
    title: 'edit',
    items: [
      cmd('edit.undo'),
      cmd('edit.redo'),
      SEP,
      // Text-field editing. On macOS these items are what make ⌘X/⌘C/⌘V/⌘A
      // work in inputs at all; elsewhere the webview handles the keys itself.
      ...(isMac
        ? ([
            { predefined: 'Cut' },
            { predefined: 'Copy' },
            { predefined: 'Paste' },
            { predefined: 'SelectAll' },
            SEP,
          ] as MenuEntry[])
        : []),
      {
        submenu: 'markMove',
        items: [
          toggle('mark.good'),
          toggle('mark.veryGood'),
          toggle('mark.interesting'),
          toggle('mark.doubtful'),
          toggle('mark.bad'),
          toggle('mark.veryBad'),
          SEP,
          cmd('mark.clear'),
        ],
      },
      SEP,
      cmd('edit.makeMainBranch'),
      cmd('edit.copyBranch'),
      cmd('edit.cutBranch'),
      cmd('edit.pasteBranch'),
      cmd('edit.deleteContinuation'),
      cmd('edit.deleteBranch'),
      cmd('edit.deleteOtherBranches'),
      SEP,
      cmd('edit.clearSetupStones'),
      cmd('edit.clearMarkers'),
      SEP,
      toggle('board.toggleEditMode'),
    ],
  };

  const view: MenuSection = {
    title: 'view',
    items: [
      toggle('view.library'),
      toggle('view.analyze'),
      SEP,
      toggle('view.toggleHeader'),
      SEP,
      toggle('ai.toggleOwnership'),
      toggle('ai.toggleTopMoves'),
      toggle('board.toggleNextMove'),
      toggle('view.patternNames'),
      {
        submenu: 'evalBar',
        items: [toggle('view.gaugeScore'), toggle('view.gaugeWinRate')],
      },
      SEP,
      toggle('view.treeHorizontal'),
      toggle('view.treeMinimap'),
      SEP,
      cmd('view.commentLarger'),
      cmd('view.commentSmaller'),
      SEP,
      toggle('view.toggleTheme'),
      toggle('board.toggleSound'),
      SEP,
      toggle('view.toggleFullscreen'),
    ],
  };

  const game: MenuSection = {
    title: 'game',
    items: [
      cmd('game.pass'),
      cmd('game.resign'),
      toggle('board.toggleScoringMode'),
      SEP,
      cmd('ai.suggestMove'),
    ],
  };

  const analysis: MenuSection = {
    title: 'analysis',
    items: [
      toggle('ai.toggleEngine'),
      toggle('board.toggleAnalysis'),
      toggle('ai.analyzeFullGame'),
      SEP,
      {
        submenu: 'heatmap',
        items: [toggle('ai.heatmapPolicy'), toggle('ai.heatmapWinRate'), toggle('ai.heatmapScore')],
      },
      SEP,
      cmd('ai.clearCache'),
    ],
  };

  const go: MenuSection = {
    title: 'navigate',
    items: [
      cmd('nav.forward'),
      cmd('nav.back'),
      cmd('nav.start'),
      cmd('nav.end'),
      SEP,
      cmd('nav.branchDown'),
      cmd('nav.branchUp'),
      SEP,
      toggle('board.toggleNavigationMode'),
    ],
  };

  const window: MenuSection = {
    title: 'window',
    items: [
      { predefined: 'Minimize' },
      { predefined: 'Maximize' },
      SEP,
      { predefined: 'CloseWindow' },
    ],
  };

  const help: MenuSection = {
    title: 'help',
    items: [
      ...(isMac
        ? []
        : [{ action: 'about' } as MenuEntry, { action: 'checkUpdate' } as MenuEntry, SEP]),
      { action: 'github' },
      { action: 'reportIssue' },
    ],
  };

  return isMac
    ? [appMenu, file, edit, view, game, analysis, go, window, help]
    : [file, edit, view, game, analysis, go, help];
}
