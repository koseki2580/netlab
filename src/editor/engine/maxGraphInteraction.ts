import type { Cell, CellState, Graph, ImageShape } from '@maxgraph/core';
import { ImageBox, InternalEvent, Point } from '@maxgraph/core';
import type { ConnectionHandler } from '@maxgraph/core';
import type { GraphConnection, GraphEngineProps } from './types';

type ConnectHandlers = Pick<
  GraphEngineProps,
  'isValidConnection' | 'onConnect' | 'onConnectionRefused'
>;
type DeleteHandlers = Pick<GraphEngineProps, 'onDeleteNode' | 'onDeleteEdge'>;

/** The id a cell carries, or null for cells the adapter did not name. */
function cellId(cell: Cell | null): string | null {
  return cell && cell.id ? String(cell.id) : null;
}

/** Test id of the connection point a hovered device shows. */
export const CONNECT_HANDLE_TESTID = 'editor-connect-handle';

const HANDLE_SIZE = 18;

/**
 * The connection point: a filled dot with a plus, drawn on the device's right
 * edge. Fixed colours, because it sits on the device border in either theme.
 */
const HANDLE_SRC = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18">' +
    '<circle cx="9" cy="9" r="8" fill="#0891b2" stroke="#ffffff" stroke-width="1.5"/>' +
    '<path d="M9 5v8M5 9h8" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>' +
    '</svg>',
)}`;

/**
 * maxGraph drops a refused connection silently when the error is empty, and
 * calls `validationAlert` with it otherwise. A non-empty marker is how the
 * refusal reaches the owner, who knows the words for it.
 */
const REFUSED = 'netlab:connection-refused';

/**
 * Wire drawing and deleting through the seam.
 *
 * maxGraph inserts the edge itself and then fires CONNECT, so the adapter's job
 * is to report the connection to the owner and remove maxGraph's provisional
 * edge — the owner is the one that decides whether an edge exists, and it will
 * push the topology back down. Leaving both would double the link.
 */
export function wireConnect(graph: Graph, handlers: ConnectHandlers): () => void {
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
  if (plugin) {
    // A visible connection point. Without it the only way to start a link was
    // an invisible spot in the middle of the device, and dragging anywhere else
    // moved the device instead. With the point, dragging the body still moves
    // it and dragging the point draws a link.
    plugin.connectImage = new ImageBox(HANDLE_SRC, HANDLE_SIZE, HANDLE_SIZE);
    plugin.cursorConnect = 'crosshair';
    plugin.getIconPosition = (icon: ImageShape, state: CellState) =>
      new Point(
        state.x + state.width - icon.bounds!.width / 2,
        state.getCenterY() - icon.bounds!.height / 2,
      );
    const createIcons = plugin.createIcons.bind(plugin);
    plugin.createIcons = (state: CellState) => {
      const icons = createIcons(state);
      for (const icon of icons) icon.node.setAttribute('data-testid', CONNECT_HANDLE_TESTID);
      return icons;
    };

    // A refused target turns red under the pointer, and letting go reports
    // which connection was refused instead of doing nothing.
    let refused: GraphConnection | null = null;
    plugin.validateConnection = (source: Cell | null, target: Cell | null) => {
      const from = cellId(source);
      const to = cellId(target);
      if (!from || !to) return '';
      if (handlers.isValidConnection({ source: from, target: to })) {
        refused = null;
        return null;
      }
      refused = { source: from, target: to };
      return REFUSED;
    };
    graph.validationAlert = (message: string) => {
      if (message === REFUSED && refused) handlers.onConnectionRefused?.(refused);
      refused = null;
    };
  }

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
export function wireDelete(graph: Graph, handlers: DeleteHandlers): () => void {
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
