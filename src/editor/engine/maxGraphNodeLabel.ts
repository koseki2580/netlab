import { glyphPrimitive } from '../../components/glyphGeometry';
import { NODE_GLYPHS, type NodeGlyphKind } from '../../components/NodeGlyph';
import type { NetlabNode } from '../../types/topology';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function attrs(record: Readonly<Record<string, string | number>>): string {
  return Object.entries(record)
    .map(([key, value]) => `${key}="${escapeHtml(String(value))}"`)
    .join(' ');
}

/**
 * The glyph as standalone SVG markup, from the same geometry the React node
 * components draw. A learner must see one shape per device kind whichever
 * engine is mounted, so neither renderer owns the numbers.
 */
export function glyphSvg(kind: NodeGlyphKind, size = 28): string {
  const meta = NODE_GLYPHS[kind];
  if (!meta) return '';
  const { tag, attrs: shape } = glyphPrimitive(meta.shape);
  return [
    // `data-node-kind` is the contract both canvases publish for their device
    // glyphs; the React NodeGlyph emits it, so this must too or the two engines
    // stop being addressable the same way.
    `<svg width="${size}" height="${size}" viewBox="0 0 40 40" role="img" aria-label="${escapeHtml(kind)}" data-node-kind="${escapeHtml(kind)}">`,
    `<${tag} ${attrs(shape)} fill="none" stroke="${meta.color}" stroke-width="2" />`,
    `<text x="20" y="21" text-anchor="middle" dominant-baseline="central" font-family="ui-monospace, monospace" font-size="16" font-weight="700" fill="${meta.color}">${escapeHtml(meta.letter)}</text>`,
    `</svg>`,
  ].join('');
}

/**
 * A vertex label: the glyph, the node's name, and the down-interface badge the
 * React node shows — the three things that tell a learner what this box is and
 * whether it is healthy.
 *
 * Returned as markup because maxGraph renders HTML labels; the label text is
 * escaped, since a node name is learner input.
 */
export function nodeLabelHtml(node: NetlabNode): string {
  const kind = node.type as NodeGlyphKind;
  const down =
    typeof node.data._downInterfaceCount === 'number' ? node.data._downInterfaceCount : 0;
  const badge =
    down > 0
      ? `<div style="margin-top:2px;color:#fff;background:var(--netlab-accent-red,#ef4444);border-radius:4px;padding:0 4px;font-size:9px;font-weight:700;">${down} iface${down > 1 ? 's' : ''} down</div>`
      : '';
  return [
    `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;font-family:ui-monospace,monospace;">`,
    glyphSvg(kind),
    `<div style="font-size:11px;font-weight:700;">${escapeHtml(node.data.label)}</div>`,
    badge,
    `</div>`,
  ].join('');
}
