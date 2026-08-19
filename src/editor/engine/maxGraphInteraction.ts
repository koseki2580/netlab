import type { Cell, Graph } from '@maxgraph/core';
import { InternalEvent } from '@maxgraph/core';
import type { ConnectionHandler } from '@maxgraph/core';
import type { GraphEngineProps } from './types';

type Handlers = Pick<
  GraphEngineProps,
  'isValidConnection' | 'onConnect' | 'onDeleteNode' | 'onDeleteEdge'
>;

/** The id a cell carries, or null for cells the adapter did not name. */
function cellId(cell: Cell | null): string | null {
  return cell && cell.id ? String(cell.id) : null;
}

/**
 * Wire drawing and deleting through the seam.
 *
 * maxGraph inserts the edge itself and then fires CONNECT, so the adapter's job
 * is to report the connection to the owner and remove maxGraph's provisional
 * edge — the owner is the one that decides whether an edge exists, and it will
 * push the topology back down. Leaving both would double the link.
 */
export function wireConnect(graph: Graph, handlers: Handlers): () => void {
  graph.setConnectable(true);
  // Refuse a connection the owner rejects, at the point the gesture is made,
  // so the learner sees the refusal instead of an edge that vanishes later.
  graph.isValidConnection = (source, target) => {
    const from = cellId(source);
    const to = cellId(target);
    if (!from || !to) return false;
    return handlers.isValidConnection({ source: from, target: to });
  };

  const plugin = graph.getPlugin<ConnectionHandler>('ConnectionHandler');
  const onConnect = (_sender: unknown, evt: { getProperty: (k: string) => unknown }) => {
    const edge = evt.getProperty('cell') as Cell | null;
    if (!edge) return;
    const model = graph.getDataModel();
    const from = cellId(edge.getTerminal(true));
    const to = cellId(edge.getTerminal(false));
    model.beginUpdate();
    try {
      model.remove(edge);
    } finally {
      model.endUpdate();
    }
    if (from && to) handlers.onConnect({ source: from, target: to });
  };
  plugin?.addListener(InternalEvent.CONNECT, onConnect);

  return () => plugin?.removeListener(onConnect);
}

/**
 * Delete/Backspace removes the selection through the seam rather than locally,
 * for the same reason: the owner holds the topology and the undo history.
 * Typing in a field must never delete the diagram.
 */
export function wireDelete(graph: Graph, handlers: Handlers): () => void {
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;

    for (const cell of graph.getSelectionCells()) {
      const id = cellId(cell);
      if (!id) continue;
      if (cell.isEdge()) handlers.onDeleteEdge(id);
      else handlers.onDeleteNode(id);
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
