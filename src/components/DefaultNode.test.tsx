/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DefaultNode } from './DefaultNode';
import { NetlabUIContext } from './NetlabUIContext';

/**
 * TC-026 — a device the canvas has no drawing for is still drawn.
 *
 * The wireless demo describes its access point and stations without naming a
 * device kind the canvas knows. React Flow had a built-in box for that case; a
 * canvas without one drew nothing at all, and the lesson lost every device on
 * it while still reporting a canvas.
 */
const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function render(element: React.ReactElement) {
  act(() =>
    root?.render(
      <NetlabUIContext.Provider
        value={{
          selectedNodeId: null,
          setSelectedNodeId: vi.fn(),
          highlightedAreaId: null,
          setHighlightedAreaId: vi.fn(),
        }}
      >
        {element}
      </NetlabUIContext.Provider>,
    ),
  );
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  container = null;
});

describe('a device with no drawing of its own', () => {
  it('is drawn with its name, and answers to the name every device answers to', () => {
    render(<DefaultNode id="ap-1" data={{ label: 'AP', role: 'access-point', layerId: 'l1' }} />);

    const device = container?.querySelector('[data-testid="topology-node"]');
    expect(device).not.toBeNull();
    expect(device?.textContent).toContain('AP');
  });

  it('says what the device is, so an unnamed kind is still readable', () => {
    render(
      <DefaultNode id="sta-a" data={{ label: 'Station A', role: 'station', layerId: 'l1' }} />,
    );

    const device = container?.querySelector('[data-testid="topology-node"]');
    expect(device?.textContent).toContain('Station A');
    expect(device?.textContent).toContain('station');
  });

  it('still draws a device that carries no name at all', () => {
    render(<DefaultNode id="n1" data={{ layerId: 'l1' }} />);

    const device = container?.querySelector('[data-testid="topology-node"]');
    expect(device).not.toBeNull();
    expect(device?.textContent).toContain('n1');
  });
});
