import { useCallback, useEffect, useRef, useState } from 'react';
import { Cell, Graph, InternalEvent } from '@maxgraph/core';
import type { FitPlugin } from '@maxgraph/core';
import { MaxGraphControls } from './MaxGraphControls';
import { wireConnect, wireDelete } from './maxGraphInteraction';
import { applyVisibility, createLayers, syncCells } from './maxGraphModel';
import type { GraphEngineProps } from './types';

/**
 * maxGraph implementation of the editor's GraphEngine.
 *
 * Layers are why this engine exists: each `LayerId` is one graph layer, so
 * showing L2 alone is `setVisible` on the others — the engine hiding cells
 * rather than the editor rebuilding a filtered graph. The model work lives in
 * `maxGraphModel.ts` so it can be tested against a real Graph without a React
 * lifecycle in the way.
 */
export default function MaxGraphEngineInner({
  nodes,
  edges,
  visibleLayers,
  highlightEdgeId,
  isValidConnection,
  onConnect,
  onNodesMoved,
  onDeleteNode,
  onDeleteEdge,
  onSelectNode,
}: GraphEngineProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const layersRef = useRef<Cell[]>([]);
  const [gridEnabled, setGridEnabled] = useState(true);

  // Mount once: rebuilding the Graph every render would drop selection, the
  // viewport and any gesture in progress.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    InternalEvent.disableContextMenu(host);
    const graph = new Graph(host);
    graph.setPanning(true);
    graph.setCellsEditable(false);
    // Vertex labels are markup (glyph + name + health badge), matching what the
    // React node components draw.
    graph.setHtmlLabels(true);
    graph.setGridEnabled(true);
    graphRef.current = graph;
    layersRef.current = createLayers(graph);

    return () => {
      graph.destroy();
      graphRef.current = null;
      layersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || layersRef.current.length === 0) return;
    syncCells(graph, layersRef.current, nodes, edges, highlightEdgeId);
    // Re-drawing replaced the cells, so the layer flags have to be re-applied.
    applyVisibility(graph, layersRef.current, visibleLayers);
  }, [nodes, edges, highlightEdgeId, visibleLayers]);

  // Drawing and deleting go through the seam: the owner holds the topology and
  // the undo history, so the engine reports rather than decides.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return undefined;
    const handlers = { isValidConnection, onConnect, onDeleteNode, onDeleteEdge };
    const stopConnect = wireConnect(graph, handlers);
    const stopDelete = wireDelete(graph, handlers);
    return () => {
      stopConnect();
      stopDelete();
    };
  }, [isValidConnection, onConnect, onDeleteNode, onDeleteEdge]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return undefined;
    const onMoved = () => {
      const moves = graph
        .getSelectionCells()
        .filter((cell) => cell.isVertex() && cell.id)
        .map((cell) => ({
          id: String(cell.id),
          position: { x: cell.geometry?.x ?? 0, y: cell.geometry?.y ?? 0 },
        }));
      if (moves.length > 0) onNodesMoved(moves);
    };
    const onSelect = () => {
      const cell = graph.getSelectionCell();
      onSelectNode?.(cell && cell.isVertex() && cell.id ? String(cell.id) : null);
    };
    graph.addListener(InternalEvent.CELLS_MOVED, onMoved);
    graph.getSelectionModel().addListener(InternalEvent.CHANGE, onSelect);
    return () => {
      graph.removeListener(onMoved);
      graph.getSelectionModel().removeListener(onSelect);
    };
  }, [onNodesMoved, onSelectNode]);

  const withGraph = useCallback((fn: (graph: Graph) => void) => {
    const graph = graphRef.current;
    if (graph) fn(graph);
  }, []);

  const toggleGrid = useCallback(() => {
    setGridEnabled((on) => {
      const next = !on;
      withGraph((graph) => graph.setGridEnabled(next));
      return next;
    });
  }, [withGraph]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={hostRef} data-testid="maxgraph-canvas" style={{ width: '100%', height: '100%' }} />
      <MaxGraphControls
        onZoomIn={() => withGraph((graph) => graph.zoomIn())}
        onZoomOut={() => withGraph((graph) => graph.zoomOut())}
        onZoomActual={() => withGraph((graph) => graph.zoomActual())}
        onFit={() => withGraph((graph) => graph.getPlugin<FitPlugin>('fit')?.fitCenter())}
        gridEnabled={gridEnabled}
        onToggleGrid={toggleGrid}
      />
    </div>
  );
}
