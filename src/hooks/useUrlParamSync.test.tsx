/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readUrlParam, useUrlParamSync } from './useUrlParamSync';

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mountWith(value: string | null | undefined, defaultValue?: string) {
  function Probe() {
    useUrlParamSync('palette', value, defaultValue === undefined ? undefined : { defaultValue });
    return null;
  }
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }
  if (!root) {
    root = createRoot(container);
  }
  act(() => {
    root?.render(<Probe />);
  });
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  window.history.replaceState(null, '', '/');
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
  window.history.replaceState(null, '', '/');
});

describe('useUrlParamSync', () => {
  it('writes the value to the URL search params', () => {
    mountWith('academic');
    expect(window.location.search).toBe('?palette=academic');
  });

  it('omits the param when the value equals the supplied default', () => {
    mountWith('studio', 'studio');
    expect(window.location.search).toBe('');
  });

  it('clears the param when the value is null', () => {
    window.history.replaceState(null, '', '/?palette=academic');
    mountWith(null);
    expect(window.location.search).toBe('');
  });
});

describe('readUrlParam', () => {
  it('returns null when the param is missing', () => {
    expect(readUrlParam('palette')).toBeNull();
  });

  it('returns the param value when present', () => {
    window.history.replaceState(null, '', '/?palette=academic');
    expect(readUrlParam('palette')).toBe('academic');
  });
});
