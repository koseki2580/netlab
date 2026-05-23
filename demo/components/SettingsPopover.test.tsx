/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPopover, type GallerySettings } from './SettingsPopover';

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) {
    act(() => {
      root?.unmount();
    });
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

const DEFAULT_SETTINGS: GallerySettings = {
  themeMode: 'light',
  palette: 'studio',
  density: 'standard',
  audience: 'pro',
  colorBlindSafe: 'off',
  contrast: 'normal',
};

describe('SettingsPopover', () => {
  it('renders only the trigger button until opened', () => {
    const onChange = vi.fn();
    act(() => {
      root?.render(<SettingsPopover settings={DEFAULT_SETTINGS} onChange={onChange} />);
    });
    const trigger = container?.querySelector(
      'button[aria-haspopup="dialog"]',
    ) as HTMLButtonElement | null;
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(container?.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens the popover and reports axis changes via onChange', () => {
    const onChange = vi.fn();
    act(() => {
      root?.render(<SettingsPopover settings={DEFAULT_SETTINGS} onChange={onChange} />);
    });
    const trigger = container?.querySelector('button[aria-haspopup="dialog"]') as HTMLButtonElement;
    act(() => {
      trigger.click();
    });
    expect(container?.querySelector('[role="dialog"]')).not.toBeNull();

    const academicRadio = container?.querySelector(
      'input[type="radio"][value="academic"]',
    ) as HTMLInputElement;
    act(() => {
      academicRadio.click();
    });
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      palette: 'academic',
    });

    const compactRadio = container?.querySelector(
      'input[type="radio"][value="compact"]',
    ) as HTMLInputElement;
    act(() => {
      compactRadio.click();
    });
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      density: 'compact',
    });
  });
});
