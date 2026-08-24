import { useCallback, useEffect, useRef, useState } from 'react';
import { Cell, Graph, InternalEvent, Outline } from '@maxgraph/core';
import type { FitPlugin, PanningHandler } from '@maxgraph/core';
import { MaxGraphControls } from './MaxGraphControls';
import { wireConnect, wireDelete } from './maxGraphInteraction';
import { markDrawnLinks } from './maxGraphLinkMarks';
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
  onViewCentre,
}: GraphEngineProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const layersRef = useRef<Cell[]>([]);
  const outlineHostRef = useRef<HTMLDivElement>(null);
  const [gridEnabled, setGridEnabled] = useState(true);

  // Mount once: rebuilding the Graph every render would drop selection, the
  // viewport and any gesture in progress.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    InternalEvent.disableContextMenu(host);
    const graph = new Graph(host);
    graph.setPanning(true);
    // Enabling panning is not enough: maxGraph's handler waits for the right
    // button or ctrl-shift by default, so dragging the canvas did nothing.
    const panning = graph.getPlugin<PanningHandler>('PanningHandler');
    if (panning) panning.useLeftButtonForPanning = true;
    graph.setCellsEditable(false);
    // Vertex labels are markup (glyph + name + health badge), matching what the
    // React node components draw.
    graph.setHtmlLabels(true);
    graph.setGridEnabled(true);
    graphRef.current = graph;
    layersRef.current = createLayers(graph);
    // Overview of the whole diagram — the counterpart to React Flow's MiniMap.
    const outline = outlineHostRef.current ? new Outline(graph, outlineHostRef.current) : null;

    return () => {
      outline?.destroy();
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
    // The same mark the simulator canvas puts on its links, so one locator
    // answers "is this link drawn?" on either canvas.
    markDrawnLinks(graph, edges);
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

  // Report the centre of the visible canvas so new elements land in view.
  useEffect(() => {
    const graph = graphRef.current;
    const host = hostRef.current;
    if (!graph || !host || !onViewCentre) return undefined;
    const view = graph.getView();
    const report = () => {
      const { scale, translate } = view;
      if (!(scale > 0)) return;
      onViewCentre({
        x: Math.round(host.clientWidth / 2 / scale - translate.x),
        y: Math.round(host.clientHeight / 2 / scale - translate.y),
      });
    };
    view.addListener(InternalEvent.TRANSLATE, report);
    view.addListener(InternalEvent.SCALE, report);
    view.addListener(InternalEvent.SCALE_AND_TRANSLATE, report);
    report();
    return () => view.removeListener(report);
  }, [onViewCentre]);

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
    // `editor-canvas` is the name both engines answer to, so a test addresses
    // the drawing surface without knowing which one is mounted.
    <div
      data-testid="editor-canvas"
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <div ref={hostRef} data-testid="maxgraph-canvas" style={{ width: '100%', height: '100%' }} />
      <div
        ref={outlineHostRef}
        data-testid="maxgraph-minimap"
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: 8,
          bottom: 8,
          width: 140,
          height: 100,
          border: '1px solid #334155',
          borderRadius: 4,
          background: '#0f172a',
          overflow: 'hidden',
          zIndex: 2,
        }}
      />
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
