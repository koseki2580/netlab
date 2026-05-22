/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Marker, MARKER_SHAPES } from './Marker';

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
  if (!root) root = createRoot(container);
  act(() => {
    root?.render(ui);
  });
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  if (container) {
    container.remove();
    container = null;
  }
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

describe('Marker', () => {
  it('renders each shape with a distinct geometry and an accessible label', () => {
    for (const shape of MARKER_SHAPES) {
      render(<Marker shape={shape} label={`${shape}-label`} />);
      const svg = container?.querySelector(`svg[data-marker-shape="${shape}"]`);
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('role')).toBe('img');
      expect(svg?.getAttribute('aria-label')).toBe(`${shape}-label`);
    }
  });

  it('uses a circle for circle/ring and a polygon for diamond/triangles', () => {
    render(<Marker shape="circle" />);
    expect(container?.querySelector('svg circle')).not.toBeNull();
    expect(container?.querySelector('svg polygon')).toBeNull();

    render(<Marker shape="triangle-down" />);
    expect(container?.querySelector('svg polygon')).not.toBeNull();
  });

  it('falls back to the shape name when no label is given', () => {
    render(<Marker shape="diamond" />);
    expect(container?.querySelector('svg')?.getAttribute('aria-label')).toBe('diamond');
  });
});
