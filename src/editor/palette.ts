import type { NodeGlyphKind } from '../components/NodeGlyph';
import type { NetlabNode } from '../types/topology';
import type { LayerId } from '../types/layers';
import {
  createClientNode,
  createRouterNode,
  createServerNode,
  createSwitchNode,
} from './utils/nodeFactory';

/**
 * One element a learner can place on the canvas, tagged with the layer it
 * belongs to. The palette is data, not markup, so the same list drives the
 * sidebar groups, the `layers` scoping prop, and the drop handler — a new
 * element cannot appear in one and be missing from another.
 */
export interface PaletteItem {
  readonly id: string;
  readonly layerId: LayerId;
  readonly label: string;
  /**
   * The glyph the canvas paints for this element. The palette shows the same
   * one, so a learner recognises what they placed — and it is shape + letter +
   * colour, never colour alone.
   */
  readonly glyph: NodeGlyphKind;
  /** One-line hint shown under the label; keeps the palette teaching, not just listing. */
  readonly hint: string;
  readonly create: (position: { x: number; y: number }) => NetlabNode;
}

/**
 * Stack order, bottom-up. A learner reading the sidebar top-to-bottom walks the
 * stack the same way the concept-check picker does, so the two surfaces agree.
 */
export const PALETTE_LAYER_ORDER: readonly LayerId[] = ['l1', 'l2', 'l3', 'l4', 'l7'];

export const PALETTE_LAYER_LABELS: Readonly<Record<LayerId, string>> = {
  l1: 'L1 — Physical',
  l2: 'L2 — Data link',
  l3: 'L3 — Network',
  l4: 'L4 — Transport',
  l7: 'L7 — Application',
};

export const PALETTE_ITEMS: readonly PaletteItem[] = [
  {
    id: 'switch',
    glyph: 'switch',
    layerId: 'l2',
    label: 'Switch',
    hint: 'Forwards frames by MAC within one broadcast domain',
    create: createSwitchNode,
  },
  {
    id: 'router',
    glyph: 'router',
    layerId: 'l3',
    label: 'Router',
    hint: 'Forwards packets between subnets by IP',
    create: createRouterNode,
  },
  {
    id: 'client',
    glyph: 'client',
    layerId: 'l7',
    label: 'Client',
    hint: 'Originates requests',
    create: createClientNode,
  },
  {
    id: 'server',
    glyph: 'server',
    layerId: 'l7',
    label: 'Server',
    hint: 'Answers requests',
    create: createServerNode,
  },
];

export interface PaletteGroup {
  readonly layerId: LayerId;
  readonly label: string;
  readonly items: readonly PaletteItem[];
}

/**
 * Palette groups in stack order.
 *
 * `layers` scopes the palette to a subset — `paletteByLayer(['l4'])` is how a
 * host mounts a transport-only exercise. Layers with no elements are dropped
 * rather than rendered empty, so an L4 group appears only once L4 has something
 * to place.
 */
export function paletteByLayer(layers?: readonly LayerId[]): PaletteGroup[] {
  const allowed = layers ? new Set(layers) : null;
  return PALETTE_LAYER_ORDER.filter((layerId) => !allowed || allowed.has(layerId))
    .map((layerId) => ({
      layerId,
      label: PALETTE_LAYER_LABELS[layerId],
      items: PALETTE_ITEMS.filter((item) => item.layerId === layerId),
    }))
    .filter((group) => group.items.length > 0);
}

/** Whether `layers` (undefined = unrestricted) admits this element. */
export function isLayerAllowed(layerId: LayerId, layers?: readonly LayerId[]): boolean {
  return !layers || layers.includes(layerId);
}
