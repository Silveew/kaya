import { test, expect, describe } from 'bun:test';
import { CommandRegistry } from '../src/commands/commandRegistry';
import { bindingToAccelerator } from '../src/commands/accelerator';
import { createBinding } from '../src/hooks/shortcutTypes';

describe('CommandRegistry', () => {
  test('runs the registered handler and reports it ran', () => {
    const registry = new CommandRegistry();
    let runs = 0;
    registry.register('game.pass', { run: () => runs++ });

    expect(registry.run('game.pass', { source: 'ui', repeat: false })).toBe(true);
    expect(runs).toBe(1);
  });

  test('does not run a disabled or unregistered command', () => {
    const registry = new CommandRegistry();
    let runs = 0;
    registry.register('game.pass', { run: () => runs++, enabled: false });

    expect(registry.run('game.pass', { source: 'ui', repeat: false })).toBe(false);
    expect(registry.run('game.resign', { source: 'ui', repeat: false })).toBe(false);
    expect(runs).toBe(0);
    expect(registry.getState('game.pass')).toEqual({
      registered: true,
      enabled: false,
      checked: undefined,
    });
  });

  test('the latest registration wins and unregistering restores the previous one', () => {
    const registry = new CommandRegistry();
    const calls: string[] = [];
    registry.register('game.pass', { run: () => calls.push('first') });
    const unregister = registry.register('game.pass', { run: () => calls.push('second') });

    registry.run('game.pass', { source: 'ui', repeat: false });
    unregister();
    registry.run('game.pass', { source: 'ui', repeat: false });

    expect(calls).toEqual(['second', 'first']);
  });

  test('one key press seen by both the menu and the page runs once', () => {
    let now = 1000;
    const registry = new CommandRegistry(() => now);
    let runs = 0;
    registry.register('file.save', { run: () => runs++ });

    registry.run('file.save', { source: 'menu', repeat: false });
    now += 10;
    registry.run('file.save', { source: 'keyboard', repeat: false });

    expect(runs).toBe(1);
  });

  test('quick repeats from the same source all run', () => {
    let now = 1000;
    const registry = new CommandRegistry(() => now);
    let runs = 0;
    registry.register('nav.forward', { run: () => runs++ });

    registry.run('nav.forward', { source: 'keyboard', repeat: false });
    now += 10;
    registry.run('nav.forward', { source: 'keyboard', repeat: true });

    expect(runs).toBe(2);
  });

  test('notifies subscribers when registrations change', () => {
    const registry = new CommandRegistry();
    let notified = 0;
    registry.subscribe(() => notified++);
    const before = registry.getVersion();

    const unregister = registry.register('game.pass', { run: () => {} });
    unregister();

    expect(notified).toBe(2);
    expect(registry.getVersion()).not.toBe(before);
  });
});

describe('bindingToAccelerator', () => {
  test('Cmd/Ctrl combinations become accelerators', () => {
    expect(bindingToAccelerator(createBinding('s', { meta: true }))).toBe('Cmd+S');
    expect(bindingToAccelerator(createBinding('m', { ctrl: true, shift: true }))).toBe(
      'Ctrl+Shift+M'
    );
    expect(bindingToAccelerator(createBinding(',', { meta: true }))).toBe('Cmd+Comma');
  });

  test('keys without Cmd/Ctrl, and unbound keys, get none', () => {
    expect(bindingToAccelerator(createBinding('s'))).toBeNull();
    expect(bindingToAccelerator(createBinding('1', { alt: true }))).toBeNull();
    expect(bindingToAccelerator(createBinding(''))).toBeNull();
  });
});
