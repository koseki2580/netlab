/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NETLAB_LIGHT_THEME } from '../theme';
import { NetlabThemeScope } from './NetlabThemeScope';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function render(ui: React.ReactElement) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

  act(() => {
    root?.render(ui);
  });
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;

  if (container) {
    container.remove();
    container = null;
  }
});

describe('NetlabThemeScope', () => {
  it('injects resolved netlab theme CSS variables for descendants', () => {
    render(
      <NetlabThemeScope theme={NETLAB_LIGHT_THEME}>
        <div>content</div>
      </NetlabThemeScope>,
    );

    const scope = container?.querySelector('div') as HTMLDivElement | null;
    expect(scope).not.toBeNull();
    expect(scope?.style.getPropertyValue('--netlab-bg-primary')).toBe(NETLAB_LIGHT_THEME.bgPrimary);
    expect(scope?.style.getPropertyValue('--netlab-text-primary')).toBe(
      NETLAB_LIGHT_THEME.textPrimary,
    );
    expect(scope?.style.background).toBe('var(--netlab-bg-primary)');
  });

  it('defaults theme axis data-attributes to studio / standard / pro', () => {
    render(
      <NetlabThemeScope theme={NETLAB_LIGHT_THEME}>
        <div>content</div>
      </NetlabThemeScope>,
    );

    const scope = container?.querySelector('div[data-netlab-palette]') as HTMLDivElement | null;
    expect(scope).not.toBeNull();
    expect(scope?.dataset.netlabPalette).toBe('studio');
    expect(scope?.dataset.netlabDensity).toBe('standard');
    expect(scope?.dataset.netlabAudience).toBe('pro');
  });

  it('emits data-netlab-* attributes + density tokens when axes are provided', () => {
    render(
      <NetlabThemeScope
        theme={NETLAB_LIGHT_THEME}
        palette="academic"
        density="compact"
        audience="learner"
      >
        <div>content</div>
      </NetlabThemeScope>,
    );

    const scope = container?.querySelector('div[data-netlab-palette]') as HTMLDivElement | null;
    expect(scope).not.toBeNull();
    expect(scope?.dataset.netlabPalette).toBe('academic');
    expect(scope?.dataset.netlabDensity).toBe('compact');
    expect(scope?.dataset.netlabAudience).toBe('learner');
    expect(scope?.style.getPropertyValue('--netlab-pad')).toBe('10px');
    // academic palette overrides the cyan accent
    expect(scope?.style.getPropertyValue('--netlab-accent-cyan')).toBe('#356dab');
  });
});
