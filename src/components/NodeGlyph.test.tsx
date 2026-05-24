/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeGlyph, NODE_GLYPHS, type NodeGlyphKind } from './NodeGlyph';

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

const KINDS: NodeGlyphKind[] = ['router', 'switch', 'client', 'server'];

describe('NodeGlyph', () => {
  it('renders each kind with its letter and an accessible label', () => {
    for (const kind of KINDS) {
      render(<NodeGlyph kind={kind} label="N1" />);
      const svg = container?.querySelector(`svg[data-node-kind="${kind}"]`);
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('role')).toBe('img');
      expect(svg?.getAttribute('aria-label')).toBe(`${kind} N1`);
      expect(svg?.textContent).toContain(NODE_GLYPHS[kind].letter);
    }
  });

  it('gives each kind a distinct shape element', () => {
    render(<NodeGlyph kind="client" />);
    expect(container?.querySelector('svg circle')).not.toBeNull(); // client → circle

    render(<NodeGlyph kind="switch" />);
    expect(container?.querySelector('svg polygon')).not.toBeNull(); // switch → hexagon

    render(<NodeGlyph kind="router" />);
    expect(container?.querySelector('svg rect')).not.toBeNull(); // router → rounded-rect
  });

  it('omits the label from the accessible name when not provided', () => {
    render(<NodeGlyph kind="server" />);
    expect(container?.querySelector('svg')?.getAttribute('aria-label')).toBe('server');
  });

  it('gives each kind a distinct color so the legend has four colors (P8)', () => {
    const colors = KINDS.map((kind) => NODE_GLYPHS[kind].color);
    expect(new Set(colors).size).toBe(KINDS.length);
    // Server moved off green onto its own purple channel.
    expect(NODE_GLYPHS.server.color).toBe('var(--netlab-accent-purple)');
    expect(NODE_GLYPHS.router.color).not.toBe(NODE_GLYPHS.server.color);
  });

  it('renders every glyph letter at the same font size (P9)', () => {
    expect(NODE_GLYPHS.switch.letter).toBe('Sw');
    expect(NODE_GLYPHS.server.letter).toBe('S');
    for (const kind of KINDS) {
      render(<NodeGlyph kind={kind} />);
      expect(container?.querySelector('svg text')?.getAttribute('font-size')).toBe('16');
    }
  });
});
