/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { installKeymap } from './keymap';

afterEach(() => {
  vi.restoreAllMocks();
});

function press(key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  window.dispatchEvent(event);
  return event;
}

describe('installKeymap', () => {
  it('toggles the palette on Meta+K and Ctrl+K', () => {
    const togglePalette = vi.fn();
    const dispose = installKeymap({ togglePalette });

    press('k', { metaKey: true });
    press('k', { ctrlKey: true });
    dispose();
    press('k', { metaKey: true });

    expect(togglePalette).toHaveBeenCalledTimes(2);
  });

  it('opens help, closes overlays, and dispatches packet scrub actions', () => {
    const openHelp = vi.fn();
    const closeOverlays = vi.fn();
    const playPause = vi.fn();
    const stepBackward = vi.fn();
    const stepForward = vi.fn();
    const jumpStart = vi.fn();
    const jumpEnd = vi.fn();
    const dispose = installKeymap({
      openHelp,
      closeOverlays,
      playPause,
      stepBackward,
      stepForward,
      jumpStart,
      jumpEnd,
    });

    press('?');
    press('Escape');
    press(' ');
    press('ArrowLeft');
    press('ArrowRight', { shiftKey: true });
    press('Home');
    press('End');
    dispose();

    expect(openHelp).toHaveBeenCalledOnce();
    expect(closeOverlays).toHaveBeenCalledOnce();
    expect(playPause).toHaveBeenCalledOnce();
    expect(stepBackward).toHaveBeenCalledWith(1);
    expect(stepForward).toHaveBeenCalledWith(5);
    expect(jumpStart).toHaveBeenCalledOnce();
    expect(jumpEnd).toHaveBeenCalledOnce();
  });

  it('ignores shortcuts from text-entry targets', () => {
    const togglePalette = vi.fn();
    const dispose = installKeymap({ togglePalette });
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true, cancelable: true }),
    );

    expect(togglePalette).not.toHaveBeenCalled();

    input.remove();
    dispose();
  });
});
