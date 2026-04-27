/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createShortcutDispatcher } from './dispatcher';
import { shortcutRegistry } from './registry';

function fireKey(key: string, options: KeyboardEventInit = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...options }));
}

afterEach(() => {
  shortcutRegistry._reset();
  vi.restoreAllMocks();
});

describe('createShortcutDispatcher', () => {
  it('calls action for a matching single-character key', () => {
    const action = vi.fn();
    shortcutRegistry.register({ key: 'A', description: 'A', action });
    const stop = createShortcutDispatcher();
    fireKey('a');
    stop();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('does nothing for an unregistered key', () => {
    const action = vi.fn();
    shortcutRegistry.register({ key: '?', description: 'Help', action });
    const stop = createShortcutDispatcher();
    fireKey('z');
    stop();
    expect(action).not.toHaveBeenCalled();
  });

  it('calls action for Cmd+Z (meta modifier)', () => {
    const action = vi.fn();
    shortcutRegistry.register({ key: 'Cmd+Z', description: 'Undo', action });
    const stop = createShortcutDispatcher();
    fireKey('z', { metaKey: true });
    stop();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('calls action for Cmd+Shift+Z', () => {
    const action = vi.fn();
    shortcutRegistry.register({ key: 'Cmd+Shift+Z', description: 'Redo', action });
    const stop = createShortcutDispatcher();
    fireKey('Z', { metaKey: true, shiftKey: true });
    stop();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('calls action for Shift+S', () => {
    const action = vi.fn();
    shortcutRegistry.register({ key: 'Shift+S', description: 'Toggle panel', action });
    const stop = createShortcutDispatcher();
    fireKey('S', { shiftKey: true });
    stop();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('calls action for Escape', () => {
    const action = vi.fn();
    shortcutRegistry.register({ key: 'Escape', description: 'Close', action });
    const stop = createShortcutDispatcher();
    fireKey('Escape');
    stop();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('ignores events where activeElement is an input', () => {
    const action = vi.fn();
    shortcutRegistry.register({ key: '?', description: 'Help', action });
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    const stop = createShortcutDispatcher();
    fireKey('?');
    stop();
    input.remove();
    expect(action).not.toHaveBeenCalled();
  });

  it('ignores events where activeElement is a textarea', () => {
    const action = vi.fn();
    shortcutRegistry.register({ key: 'Escape', description: 'Close', action });
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    ta.focus();
    const stop = createShortcutDispatcher();
    fireKey('Escape');
    stop();
    ta.remove();
    expect(action).not.toHaveBeenCalled();
  });

  it('ignores events where activeElement is contenteditable', () => {
    const action = vi.fn();
    shortcutRegistry.register({ key: 'Escape', description: 'Close', action });
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(div);
    const stop = createShortcutDispatcher();
    fireKey('Escape');
    stop();
    expect(action).not.toHaveBeenCalled();
  });

  it('skips entry when enabled predicate returns false', () => {
    const action = vi.fn();
    shortcutRegistry.register({ key: '?', description: 'Help', action, enabled: () => false });
    const stop = createShortcutDispatcher();
    fireKey('?');
    stop();
    expect(action).not.toHaveBeenCalled();
  });

  it('calls action when enabled predicate returns true', () => {
    const action = vi.fn();
    shortcutRegistry.register({ key: '?', description: 'Help', action, enabled: () => true });
    const stop = createShortcutDispatcher();
    fireKey('?');
    stop();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('stop() detaches the keydown listener', () => {
    const action = vi.fn();
    shortcutRegistry.register({ key: 'A', description: 'A', action });
    const stop = createShortcutDispatcher();
    stop();
    fireKey('a');
    expect(action).not.toHaveBeenCalled();
  });

  it('calls preventDefault on the event when action fires', () => {
    const action = vi.fn();
    shortcutRegistry.register({ key: 'A', description: 'A', action });
    const stop = createShortcutDispatcher();
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    const prevent = vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);
    stop();
    expect(prevent).toHaveBeenCalled();
  });
});
