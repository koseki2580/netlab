import type { LayerId } from '../../types/layers';
import { PALETTE_LAYER_ORDER } from '../palette';

/**
 * maxGraph's model is `root → layers → cells`, and hiding a layer hides
 * everything under it (`GraphDataModel.setVisible`). So each network layer gets
 * one graph layer and the sidebar toggles map straight onto it — the L2-only
 * view is the engine hiding four layers, not the editor rebuilding the graph.
 *
 * Layer order is the paint order: lower layers are added first so an L3 node
 * drawn over an L2 one reads as "above it in the stack".
 */
export const GRAPH_LAYER_ORDER: readonly LayerId[] = PALETTE_LAYER_ORDER;

/** Index of the graph layer a node belongs in — its position in the stack. */
export function layerIndex(layerId: LayerId): number {
  const index = GRAPH_LAYER_ORDER.indexOf(layerId);
  // An unknown layer must still be drawable: put it on top rather than dropping
  // the node, so a new LayerId cannot make nodes silently vanish.
  return index === -1 ? GRAPH_LAYER_ORDER.length : index;
}

/**
 * Which graph layers should be visible, as a parallel array to
 * `GRAPH_LAYER_ORDER` plus one trailing slot for unknown layers.
 *
 * `undefined` means "no restriction": everything visible.
 */
export function layerVisibility(visible?: ReadonlySet<LayerId>): boolean[] {
  const flags = GRAPH_LAYER_ORDER.map((layerId) => !visible || visible.has(layerId));
  // The overflow layer follows the same rule as an unknown id: always drawn.
  flags.push(true);
  return flags;
}
