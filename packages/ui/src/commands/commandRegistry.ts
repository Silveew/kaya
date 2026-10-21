/**
 * Command registry — one place that knows every app command, whether it can
 * run right now, and (for toggles) whether it is on.
 *
 * Components register the handlers they own with `useCommand`; the keyboard
 * dispatcher, the native menu bar and any button run them by id. A command
 * id is a `ShortcutId`, so every command is also user-bindable.
 */

import type { ShortcutId } from '../hooks/shortcutTypes';

export type CommandId = ShortcutId;

export type CommandSource = 'keyboard' | 'menu' | 'ui';

export interface CommandContext {
  source: CommandSource;
  /** True for an auto-repeated keydown (key held down). */
  repeat: boolean;
}

export interface CommandOptions {
  /** Defaults to true. A disabled command is greyed out in menus and ignored by shortcuts. */
  enabled?: boolean;
  /** Set for toggles: shown as a check mark in menus. */
  checked?: boolean;
  /** Let the shortcut fire while a text field has focus. */
  allowInInput?: boolean;
  /**
   * False when the key is handled natively elsewhere (⌘V arrives as a paste
   * event): the shortcut dispatcher then leaves the key alone, and menus show
   * no accelerator for it.
   */
  keyboard?: boolean;
}

export interface CommandEntry extends CommandOptions {
  run: (ctx: CommandContext) => void;
}

export interface CommandState {
  registered: boolean;
  enabled: boolean;
  checked: boolean | undefined;
}

/**
 * A native menu accelerator and the webview's keydown can both see one key
 * press on some platforms; a second run of the same command from a different
 * source inside this window is the same press, not a new one.
 */
const CROSS_SOURCE_DEDUPE_MS = 150;

export class CommandRegistry {
  // A stack per id: the most recently mounted handler wins, and unmounting it
  // falls back to the previous one.
  private entries = new Map<CommandId, CommandEntry[]>();
  private listeners = new Set<() => void>();
  private lastRun: { id: CommandId; source: CommandSource; time: number } | null = null;
  private version = 0;

  constructor(private now: () => number = () => Date.now()) {}

  register(id: CommandId, entry: CommandEntry): () => void {
    const stack = this.entries.get(id) ?? [];
    stack.push(entry);
    this.entries.set(id, stack);
    this.notify();
    return () => {
      const current = this.entries.get(id);
      if (!current) return;
      const index = current.lastIndexOf(entry);
      if (index !== -1) current.splice(index, 1);
      if (current.length === 0) this.entries.delete(id);
      this.notify();
    };
  }

  /** Call after mutating a registered entry's options in place. */
  changed(): void {
    this.notify();
  }

  private top(id: CommandId): CommandEntry | undefined {
    const stack = this.entries.get(id);
    return stack?.[stack.length - 1];
  }

  getState(id: CommandId): CommandState {
    const entry = this.top(id);
    return {
      registered: entry !== undefined,
      enabled: entry !== undefined && entry.enabled !== false,
      checked: entry?.checked,
    };
  }

  allowsInput(id: CommandId): boolean {
    return this.top(id)?.allowInInput === true;
  }

  handlesKeyboard(id: CommandId): boolean {
    const entry = this.top(id);
    return entry !== undefined && entry.keyboard !== false;
  }

  registeredIds(): CommandId[] {
    return [...this.entries.keys()];
  }

  /** Runs the command if it is registered and enabled. Returns whether it ran. */
  run(id: CommandId, ctx: CommandContext): boolean {
    const entry = this.top(id);
    if (!entry || entry.enabled === false) return false;

    const time = this.now();
    const last = this.lastRun;
    if (
      last &&
      last.id === id &&
      last.source !== ctx.source &&
      time - last.time < CROSS_SOURCE_DEDUPE_MS
    ) {
      return false;
    }
    this.lastRun = { id, source: ctx.source, time };

    entry.run(ctx);
    return true;
  }

  /** Increments on every change; useSyncExternalStore snapshot. */
  getVersion = (): number => this.version;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    this.version++;
    for (const listener of this.listeners) listener();
  }
}
