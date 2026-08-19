import { describe, expect, it } from 'vitest';
import { glyphPrimitive } from '../../components/glyphGeometry';
import { NODE_GLYPHS } from '../../components/NodeGlyph';
import type { NetlabNode } from '../../types/topology';
import { glyphSvg, nodeLabelHtml } from './maxGraphNodeLabel';

function node(type: string, label = 'R1', extra: Record<string, unknown> = {}): NetlabNode {
  return {
    id: 'n1',
    type,
    position: { x: 0, y: 0 },
    data: { label, layerId: 'l3', role: type, ...extra },
  } as NetlabNode;
}

describe('maxGraph node label', () => {
  it('draws the same shape the React node draws, from the shared geometry', () => {
    // If the two renderers ever diverge, a learner sees one device drawn two
    // ways depending on the engine — so the markup must come from the geometry,
    // not from numbers copied into this file.
    for (const kind of ['router', 'switch', 'client', 'server'] as const) {
      const { tag, attrs } = glyphPrimitive(NODE_GLYPHS[kind].shape);
      const svg = glyphSvg(kind);
      expect(svg, kind).toContain(`<${tag} `);
      const firstAttr = Object.entries(attrs)[0]!;
      expect(svg, kind).toContain(`${firstAttr[0]}="${firstAttr[1]}"`);
      expect(svg, kind).toContain(NODE_GLYPHS[kind].color);
    }
  });

  it('carries the letter, so meaning survives without colour', () => {
    expect(glyphSvg('switch')).toContain('>Sw<');
    expect(glyphSvg('router')).toContain('>R<');
  });

  it('shows the node name', () => {
    expect(nodeLabelHtml(node('router', 'core-1'))).toContain('core-1');
  });

  it('escapes the node name, which is learner input', () => {
    const html = nodeLabelHtml(node('router', '<img src=x onerror=alert(1)>'));
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('shows the down-interface badge only when interfaces are down', () => {
    expect(nodeLabelHtml(node('router', 'R1'))).not.toContain('down');
    const one = nodeLabelHtml(node('router', 'R1', { _downInterfaceCount: 1 }));
    expect(one).toContain('1 iface down');
    const many = nodeLabelHtml(node('router', 'R1', { _downInterfaceCount: 3 }));
    expect(many).toContain('3 ifaces down');
  });

  it('renders nothing for a device kind with no glyph rather than throwing', () => {
    expect(glyphSvg('unknown' as never)).toBe('');
    expect(() => nodeLabelHtml(node('unknown'))).not.toThrow();
  });
});
