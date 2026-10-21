/**
 * Commands context — the shared CommandRegistry plus the one window keydown
 * listener that turns shortcuts into commands.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { DEFAULT_SHORTCUTS } from '../hooks/shortcutTypes';
import { useKeyboardShortcutsContext } from '../contexts/KeyboardShortcutsContext';
import {
  CommandRegistry,
  type CommandContext,
  type CommandId,
  type CommandOptions,
  type CommandSource,
  type CommandState,
} from './commandRegistry';

const CommandsContext = createContext<CommandRegistry | null>(null);

const ALL_COMMAND_IDS = Object.keys(DEFAULT_SHORTCUTS) as CommandId[];

function isTextInput(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function CommandsProvider({ children }: { children: ReactNode }) {
  const [registry] = useState(() => new CommandRegistry());
  const { matchesShortcut } = useKeyboardShortcutsContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const inInput = isTextInput(e.target);
      for (const id of ALL_COMMAND_IDS) {
        if (!registry.handlesKeyboard(id)) continue;
        if (!matchesShortcut(e, id)) continue;
        if (inInput && !registry.allowsInput(id)) return;
        if (!registry.getState(id).enabled) return;
        e.preventDefault();
        registry.run(id, { source: 'keyboard', repeat: e.repeat });
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [registry, matchesShortcut]);

  return <CommandsContext.Provider value={registry}>{children}</CommandsContext.Provider>;
}

export function useCommandRegistry(): CommandRegistry {
  const registry = useContext(CommandsContext);
  if (!registry) {
    throw new Error('useCommandRegistry must be used within a CommandsProvider');
  }
  return registry;
}

/**
 * Registers `run` as the handler for a command while the calling component is
 * mounted. `run` may change every render; the latest one is always called.
 * It is called with no arguments, so handlers with optional parameters (a
 * node id, a force flag) can be passed as they are.
 */
export function useCommand(id: CommandId, run: () => void, options: CommandOptions = {}): void {
  useCommandWithContext(id, () => run(), options);
}

/** useCommand for handlers that need to know how they were invoked. */
export function useCommandWithContext(
  id: CommandId,
  run: (ctx: CommandContext) => void,
  options: CommandOptions = {}
): void {
  const registry = useCommandRegistry();
  const runRef = useRef(run);
  useLayoutEffect(() => {
    runRef.current = run;
  });

  const { enabled, checked, allowInInput, keyboard } = options;
  useEffect(
    () =>
      registry.register(id, {
        run: ctx => runRef.current(ctx),
        enabled,
        checked,
        allowInInput,
        keyboard,
      }),
    [registry, id, enabled, checked, allowInInput, keyboard]
  );
}

/** Re-renders on any registry change; use for menus that show many commands. */
export function useCommandRegistryVersion(): number {
  const registry = useCommandRegistry();
  return useSyncExternalStore(registry.subscribe, registry.getVersion);
}

export function useCommandState(id: CommandId): CommandState {
  const registry = useCommandRegistry();
  useCommandRegistryVersion();
  return registry.getState(id);
}

export function useRunCommand(): (id: CommandId, source?: CommandSource) => boolean {
  const registry = useCommandRegistry();
  return (id, source = 'ui') => registry.run(id, { source, repeat: false });
}
