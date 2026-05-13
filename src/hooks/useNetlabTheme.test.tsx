/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NetlabThemeScope, type NetlabThemeScopeValue } from '../components/NetlabThemeScope';
import { NetlabError } from '../errors';
import { useNetlabTheme } from './useNetlabTheme';

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function Probe({ onValue }: { onValue: (v: ReturnType<typeof useNetlabTheme>) => void }) {
  onValue(useNetlabTheme());
  return null;
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
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

describe('useNetlabTheme', () => {
  it('exposes resolved palette / density / audience from the enclosing NetlabThemeScope', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    let observed: NetlabThemeScopeValue | null = null;
    act(() => {
      root?.render(
        <NetlabThemeScope palette="academic" density="relaxed" audience="learner">
          <Probe
            onValue={(v) => {
              observed = v;
            }}
          />
        </NetlabThemeScope>,
      );
    });
    expect(observed).not.toBeNull();
    expect(observed).toMatchObject({
      palette: 'academic',
      density: 'relaxed',
      audience: 'learner',
    });
  });

  it('throws a NetlabError when used outside of any NetlabThemeScope', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    // Silence React's error boundary noise for this assertion.
    const originalError = console.error;
    console.error = () => {};
    let captured: unknown = null;
    try {
      act(() => {
        root?.render(<Probe onValue={() => {}} />);
      });
    } catch (e) {
      captured = e;
    } finally {
      console.error = originalError;
    }
    expect(captured).toBeInstanceOf(NetlabError);
  });
});
