/**
 * Keyboard Shortcuts — Types, constants, and default shortcuts map
 */

/** Storage key for keyboard shortcuts */
export const SHORTCUTS_STORAGE_KEY = 'kaya-keyboard-shortcuts';

/** Modifier keys */
export interface ModifierKeys {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

/** A single key binding */
export interface KeyBinding {
  key: string;
  modifiers: ModifierKeys;
}

/** Shortcut action categories */
export type ShortcutCategory = 'navigation' | 'board' | 'file' | 'view' | 'ai' | 'edit';

/** A keyboard shortcut definition */
export interface ShortcutDefinition {
  id: string;
  category: ShortcutCategory;
  defaultBinding: KeyBinding;
  customBinding?: KeyBinding;
  isCustomized?: boolean;
}

/** All available shortcut IDs */
export type ShortcutId =
  // Navigation shortcuts
  | 'nav.back'
  | 'nav.forward'
  | 'nav.start'
  | 'nav.end'
  | 'nav.branchUp'
  | 'nav.branchDown'
  // File shortcuts
  | 'file.save'
  | 'file.saveAs'
  | 'file.paste'
  | 'file.new'
  | 'file.quickNew'
  | 'file.open'
  | 'file.scanBoard'
  | 'file.export'
  | 'file.copySgf'
  // View shortcuts
  | 'view.toggleHeader'
  | 'view.toggleSidebar'
  | 'view.toggleLibrary'
  | 'view.toggleFullscreen'
  | 'view.openSettings'
  | 'view.toggleTheme'
  | 'view.library'
  | 'view.analyze'
  | 'view.commentLarger'
  | 'view.commentSmaller'
  | 'view.treeHorizontal'
  | 'view.treeMinimap'
  | 'view.patternNames'
  | 'ai.heatmapPolicy'
  | 'ai.heatmapWinRate'
  | 'ai.heatmapScore'
  // Board mode shortcuts
  | 'board.toggleEditMode'
  | 'board.toggleNavigationMode'
  | 'board.toggleScoringMode'
  | 'board.toggleAnalysis'
  | 'board.toggleSound'
  | 'board.toggleNextMove'
  | 'game.pass'
  | 'game.resign'
  // AI shortcuts
  | 'ai.suggestMove'
  | 'ai.toggleTopMoves'
  | 'ai.toggleOwnership'
  | 'ai.analyzeFullGame'
  | 'ai.clearCache'
  // Edit shortcuts
  | 'edit.undo'
  | 'edit.redo'
  | 'edit.makeMainBranch'
  | 'edit.copyBranch'
  | 'edit.cutBranch'
  | 'edit.pasteBranch'
  | 'edit.deleteContinuation'
  | 'edit.deleteBranch'
  | 'edit.deleteOtherBranches'
  | 'edit.clearSetupStones'
  | 'edit.clearMarkers'
  // Board tool rail: what a click on the board does
  | 'tool.play'
  | 'tool.black'
  | 'tool.white'
  | 'tool.alternate'
  | 'tool.triangle'
  | 'tool.square'
  | 'tool.circle'
  | 'tool.cross'
  | 'tool.labelAlpha'
  | 'tool.labelNum'
  | 'tool.eraser'
  // Annotation marks (SGF TE/BM/IT/DO) on the current move
  | 'mark.good'
  | 'mark.veryGood'
  | 'mark.interesting'
  | 'mark.doubtful'
  | 'mark.bad'
  | 'mark.veryBad'
  | 'mark.clear';

/** Modifier key for the current platform (Cmd on Mac, Ctrl elsewhere) */
export const isMac =
  typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

/** Create a key binding helper */
export function createBinding(key: string, options?: Partial<ModifierKeys>): KeyBinding {
  return {
    key: key.toLowerCase(),
    modifiers: {
      ctrl: options?.ctrl ?? false,
      shift: options?.shift ?? false,
      alt: options?.alt ?? false,
      meta: options?.meta ?? false,
    },
  };
}

/** Create a platform-aware binding (Cmd on Mac, Ctrl elsewhere) */
export function createPlatformBinding(
  key: string,
  options?: Partial<Omit<ModifierKeys, 'ctrl' | 'meta'>>
): KeyBinding {
  return createBinding(key, {
    ...options,
    ctrl: !isMac,
    meta: isMac,
  });
}

/** Default shortcuts configuration */
export const DEFAULT_SHORTCUTS: Record<ShortcutId, Omit<ShortcutDefinition, 'id'>> = {
  // Navigation
  'nav.back': {
    category: 'navigation',
    defaultBinding: createBinding('arrowleft'),
  },
  'nav.forward': {
    category: 'navigation',
    defaultBinding: createBinding('arrowright'),
  },
  'nav.start': {
    category: 'navigation',
    defaultBinding: createBinding('home'),
  },
  'nav.end': {
    category: 'navigation',
    defaultBinding: createBinding('end'),
  },
  'nav.branchUp': {
    category: 'navigation',
    defaultBinding: createBinding('arrowup'),
  },
  'nav.branchDown': {
    category: 'navigation',
    defaultBinding: createBinding('arrowdown'),
  },

  // File operations
  'file.save': {
    category: 'file',
    defaultBinding: createPlatformBinding('s'),
  },
  'file.saveAs': {
    category: 'file',
    defaultBinding: createPlatformBinding('s', { shift: true }),
  },
  'file.paste': {
    category: 'file',
    defaultBinding: createPlatformBinding('v'),
  },
  'file.open': {
    category: 'file',
    defaultBinding: createPlatformBinding('o'),
  },
  'file.new': {
    category: 'file',
    defaultBinding: createBinding(''),
  },
  'file.quickNew': {
    category: 'file',
    defaultBinding: createBinding(''),
  },
  'file.scanBoard': {
    category: 'file',
    defaultBinding: createBinding(''),
  },
  'file.export': {
    category: 'file',
    defaultBinding: createBinding(''),
  },
  'file.copySgf': {
    category: 'file',
    defaultBinding: createBinding(''),
  },

  // View shortcuts
  // NOTE: this deliberately does *not* use Cmd/Ctrl+Shift+M — that is the
  // mnemonic binding for 'edit.makeMainBranch' (Sabaki uses it too). Both
  // handlers are independent window listeners, so sharing a binding made a
  // single keypress toggle the header *and* reorder the game tree.
  'view.toggleHeader': {
    category: 'view',
    defaultBinding: createPlatformBinding('h', { shift: true }),
  },
  'view.toggleSidebar': {
    category: 'view',
    defaultBinding: createPlatformBinding('b', { shift: true }),
  },
  'view.toggleLibrary': {
    category: 'view',
    defaultBinding: createPlatformBinding('l'),
  },
  'view.toggleFullscreen': {
    category: 'view',
    defaultBinding: createBinding('f11'),
  },
  'view.openSettings': {
    category: 'view',
    defaultBinding: createPlatformBinding(','),
  },
  'view.toggleTheme': {
    category: 'view',
    defaultBinding: createBinding(''),
  },
  'view.library': {
    category: 'view',
    defaultBinding: createPlatformBinding('1'),
  },
  'view.analyze': {
    category: 'view',
    defaultBinding: createPlatformBinding('2'),
  },
  'view.commentLarger': { category: 'view', defaultBinding: createPlatformBinding('=') },
  'view.commentSmaller': { category: 'view', defaultBinding: createPlatformBinding('-') },
  'view.treeHorizontal': { category: 'view', defaultBinding: createBinding('') },
  'view.treeMinimap': { category: 'view', defaultBinding: createBinding('') },
  'view.patternNames': { category: 'view', defaultBinding: createBinding('') },
  'ai.heatmapPolicy': { category: 'ai', defaultBinding: createBinding('') },
  'ai.heatmapWinRate': { category: 'ai', defaultBinding: createBinding('') },
  'ai.heatmapScore': { category: 'ai', defaultBinding: createBinding('') },

  // Board mode shortcuts
  'board.toggleEditMode': {
    category: 'board',
    defaultBinding: createBinding('e'),
  },
  'board.toggleNavigationMode': {
    category: 'board',
    defaultBinding: createBinding('n'),
  },
  'board.toggleScoringMode': {
    category: 'board',
    defaultBinding: createBinding('s'),
  },
  'board.toggleAnalysis': {
    category: 'board',
    defaultBinding: createBinding('a'),
  },
  'board.toggleSound': {
    category: 'board',
    defaultBinding: createBinding('s', { shift: true }),
  },
  'board.toggleNextMove': {
    category: 'board',
    defaultBinding: createBinding('x'),
  },
  'game.pass': {
    category: 'board',
    defaultBinding: createBinding(''),
  },
  'game.resign': {
    category: 'board',
    defaultBinding: createBinding(''),
  },

  // AI shortcuts
  'ai.suggestMove': {
    category: 'ai',
    defaultBinding: createBinding('g'),
  },
  'ai.toggleTopMoves': {
    category: 'ai',
    defaultBinding: createBinding('t'),
  },
  'ai.toggleOwnership': {
    category: 'ai',
    defaultBinding: createBinding('o'),
  },
  'ai.analyzeFullGame': {
    category: 'ai',
    defaultBinding: createBinding(''),
  },
  'ai.clearCache': {
    category: 'ai',
    defaultBinding: createBinding(''),
  },

  // Edit shortcuts
  'edit.undo': {
    category: 'edit',
    defaultBinding: createPlatformBinding('z'),
  },
  'edit.redo': {
    category: 'edit',
    defaultBinding: createPlatformBinding('z', { shift: true }),
  },
  'edit.makeMainBranch': {
    category: 'edit',
    defaultBinding: createPlatformBinding('m', { shift: true }),
  },
  'edit.copyBranch': {
    category: 'edit',
    defaultBinding: createBinding(''),
  },
  'edit.cutBranch': {
    category: 'edit',
    defaultBinding: createBinding(''),
  },
  'edit.pasteBranch': {
    category: 'edit',
    defaultBinding: createBinding(''),
  },
  'edit.deleteContinuation': {
    category: 'edit',
    defaultBinding: createBinding(''),
  },
  'edit.deleteBranch': {
    category: 'edit',
    defaultBinding: createBinding(''),
  },
  'edit.deleteOtherBranches': {
    category: 'edit',
    defaultBinding: createBinding(''),
  },
  'edit.clearSetupStones': {
    category: 'edit',
    defaultBinding: createBinding(''),
  },
  'edit.clearMarkers': {
    category: 'edit',
    defaultBinding: createBinding(''),
  },

  // Board tools, on the number row in rail order
  'tool.play': { category: 'edit', defaultBinding: createBinding('1') },
  'tool.black': { category: 'edit', defaultBinding: createBinding('2') },
  'tool.white': { category: 'edit', defaultBinding: createBinding('3') },
  'tool.alternate': { category: 'edit', defaultBinding: createBinding('') },
  'tool.triangle': { category: 'edit', defaultBinding: createBinding('4') },
  'tool.square': { category: 'edit', defaultBinding: createBinding('5') },
  'tool.circle': { category: 'edit', defaultBinding: createBinding('6') },
  'tool.cross': { category: 'edit', defaultBinding: createBinding('7') },
  'tool.labelAlpha': { category: 'edit', defaultBinding: createBinding('8') },
  'tool.labelNum': { category: 'edit', defaultBinding: createBinding('9') },
  'tool.eraser': { category: 'edit', defaultBinding: createBinding('0') },

  // Annotation marks. Alt/Option + digit: on macOS Option changes event.key
  // ("¡" for ⌥1), so eventMatchesBinding falls back to the physical key.
  'mark.good': {
    category: 'edit',
    defaultBinding: createBinding('1', { alt: true }),
  },
  'mark.veryGood': {
    category: 'edit',
    defaultBinding: createBinding('1', { alt: true, shift: true }),
  },
  'mark.interesting': {
    category: 'edit',
    defaultBinding: createBinding('2', { alt: true }),
  },
  'mark.doubtful': {
    category: 'edit',
    defaultBinding: createBinding('3', { alt: true }),
  },
  'mark.bad': {
    category: 'edit',
    defaultBinding: createBinding('4', { alt: true }),
  },
  'mark.veryBad': {
    category: 'edit',
    defaultBinding: createBinding('4', { alt: true, shift: true }),
  },
  'mark.clear': {
    category: 'edit',
    defaultBinding: createBinding('0', { alt: true }),
  },
};

/** Collision info when two shortcuts have the same binding */
export interface ShortcutCollision {
  existingShortcutId: ShortcutId;
  binding: KeyBinding;
}

/** Stored custom shortcuts (only stores customized ones) */
export type StoredShortcuts = Partial<Record<ShortcutId, KeyBinding>>;
