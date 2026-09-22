/**
 * C4 — edge encoding + scale budget.
 *
 * Each packet `kind` is encoded on THREE redundant channels — color **and**
 * dash pattern **and** end-cap shape — mirroring the {@link NodeGlyph} contract
 * (color + shape + letter) so edges stay legible without color (color-vision
 * loss, the `academic` palette). Colors are `--netlab-*` tokens, never hex.
 */
export type EdgeKind = 'icmp-request' | 'icmp-reply' | 'arp' | 'drop';

export type EdgeCap = 'dot' | 'diamond' | 'triangle' | 'cross';

export interface EdgeKindStyle {
  /** `--netlab-accent-*` token. */
  readonly color: string;
  /** SVG `stroke-dasharray`; `'none'` = solid. */
  readonly dash: string;
  /** End-cap shape — the third, color-independent channel. */
  readonly cap: EdgeCap;
  /** i18n catalog key for the legend label. */
  readonly labelKey: string;
}

export const NL_EDGE_KINDS: Readonly<Record<EdgeKind, EdgeKindStyle>> = {
  'icmp-request': {
    color: 'var(--netlab-accent-cyan)',
    dash: 'none',
    cap: 'dot',
    labelKey: 'simulation.edgeKind.icmpRequest',
  },
  'icmp-reply': {
    color: 'var(--netlab-accent-green)',
    dash: '6 4',
    cap: 'diamond',
    labelKey: 'simulation.edgeKind.icmpReply',
  },
  arp: {
    color: 'var(--netlab-accent-yellow)',
    dash: '2 3',
    cap: 'triangle',
    labelKey: 'simulation.edgeKind.arp',
  },
  drop: {
    color: 'var(--netlab-accent-red)',
    dash: '8 3 2 3',
    cap: 'cross',
    labelKey: 'simulation.edgeKind.drop',
  },
};

export const EDGE_KINDS: readonly EdgeKind[] = ['icmp-request', 'icmp-reply', 'arp', 'drop'];

/** LOD thresholds: collapse an area past this node count OR below this zoom. */
export interface LodConfig {
  readonly collapseNodeCount: number;
  readonly collapseZoom: number;
}

export const NL_LOD: LodConfig = { collapseNodeCount: 8, collapseZoom: 0.55 };

/**
 * Whether an area should render as a single collapsed cluster: too many nodes
 * to read individually, or the viewport is zoomed too far out for detail.
 */
export function shouldCollapseArea(
  nodeCount: number,
  zoom: number,
  lod: LodConfig = NL_LOD,
): boolean {
  return nodeCount > lod.collapseNodeCount || zoom < lod.collapseZoom;
}
