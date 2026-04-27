/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { shortcutRegistry } from './registry';

afterEach(() => {
  shortcutRegistry._reset();
});

describe('shortcutRegistry', () => {
  it('list() is empty on start', () => {
    expect(shortcutRegistry.list()).toHaveLength(0);
  });

  it('register() adds an entry to list()', () => {
    const action = vi.fn();
    shortcutRegistry.register({ key: '?', description: 'Help', action });
    expect(shortcutRegistry.list()).toHaveLength(1);
    expect(shortcutRegistry.list()[0]?.key).toBe('?');
  });

  it('register() returns an unregister function that removes the entry', () => {
    const action = vi.fn();
    const unregister = shortcutRegistry.register({ key: '?', description: 'Help', action });
    unregister();
    expect(shortcutRegistry.list()).toHaveLength(0);
  });

  it('list() preserves insertion order', () => {
    shortcutRegistry.register({ key: 'A', description: 'A', action: vi.fn() });
    shortcutRegistry.register({ key: 'B', description: 'B', action: vi.fn() });
    shortcutRegistry.register({ key: 'C', description: 'C', action: vi.fn() });
    expect(shortcutRegistry.list().map((e) => e.key)).toEqual(['A', 'B', 'C']);
  });

  it('unregistering one entry does not affect others', () => {
    const ua = shortcutRegistry.register({ key: 'A', description: 'A', action: vi.fn() });
    shortcutRegistry.register({ key: 'B', description: 'B', action: vi.fn() });
    ua();
    expect(shortcutRegistry.list().map((e) => e.key)).toEqual(['B']);
  });

  it('subscribe() listener is called when an entry is registered', () => {
    const listener = vi.fn();
    shortcutRegistry.subscribe(listener);
    shortcutRegistry.register({ key: 'X', description: 'X', action: vi.fn() });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('subscribe() listener is called when an entry is unregistered', () => {
    const listener = vi.fn();
    const unregister = shortcutRegistry.register({ key: 'X', description: 'X', action: vi.fn() });
    shortcutRegistry.subscribe(listener);
    unregister();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('subscribe() returns an unsubscribe function that stops notifications', () => {
    const listener = vi.fn();
    const unsub = shortcutRegistry.subscribe(listener);
    unsub();
    shortcutRegistry.register({ key: 'X', description: 'X', action: vi.fn() });
    expect(listener).not.toHaveBeenCalled();
  });

  it('list() returns a stable snapshot that is not mutated later', () => {
    shortcutRegistry.register({ key: 'A', description: 'A', action: vi.fn() });
    const snapshot = shortcutRegistry.list();
    shortcutRegistry.register({ key: 'B', description: 'B', action: vi.fn() });
    expect(snapshot).toHaveLength(1);
  });

  it('entries with an enabled predicate are included in list()', () => {
    const enabled = vi.fn(() => true);
    shortcutRegistry.register({ key: 'E', description: 'E', action: vi.fn(), enabled });
    expect(shortcutRegistry.list()).toHaveLength(1);
    expect(shortcutRegistry.list()[0]?.enabled).toBe(enabled);
  });

  it('_reset() clears all entries and listeners', () => {
    const listener = vi.fn();
    shortcutRegistry.subscribe(listener);
    shortcutRegistry.register({ key: 'A', description: 'A', action: vi.fn() });
    shortcutRegistry._reset();
    shortcutRegistry.register({ key: 'B', description: 'B', action: vi.fn() });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(shortcutRegistry.list()).toHaveLength(1);
  });
});
