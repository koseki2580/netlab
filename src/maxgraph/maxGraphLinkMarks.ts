import type { Graph } from '@maxgraph/core';

/**
 * The mark every drawn link carries, on either canvas.
 *
 * `netlab-edge` is how a test asks "is this link on screen?" without knowing
 * which canvas drew it — and that question matters: a lesson that draws its
 * devices but none of the cables between them looks almost right, and went
 * unnoticed for a long time when React Flow silently refused edges whose
 * endpoints named a router interface.
 */
export interface LinkMark {
  id: string;
  /** Extra classes the canvas computed, e.g. the selection choreography. */
  className?: string | undefined;
  /** The link is being shown with a packet travelling along it (REQ-013). */
  animated?: boolean | undefined;
}

export function markDrawnLinks(graph: Graph, links: readonly LinkMark[]): void {
  const view = graph.getView();
  const model = graph.getDataModel();
  for (const link of links) {
    const cell = model.getCell(link.id);
    if (!cell) continue;
    const node = view.getState(cell)?.shape?.node;
    if (!node) continue;
    node.setAttribute('class', ['netlab-edge', link.className].filter(Boolean).join(' '));
    // Which link this is. A device says so through `data-id`; a link said
    // nothing, so nothing could address one — not a test, and not a learner's
    // click landing on "the R2-R4 link" rather than "some link".
    node.setAttribute('data-edge-id', link.id);
    if (link.animated) node.setAttribute('data-edge-animated', 'true');
    else node.removeAttribute('data-edge-animated');
  }
}
