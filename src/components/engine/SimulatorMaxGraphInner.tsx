import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Cell,
  Graph,
  InternalEvent,
  Outline,
  type FitPlugin,
  type TooltipHandler,
} from '@maxgraph/core';
import { MaxGraphControls } from '../../editor/engine/MaxGraphControls';
import { wireConnect } from '../../editor/engine/maxGraphInteraction';
import type { NetlabNode } from '../../types/topology';
import type { SimulatorCanvasProps } from './canvasEngine';
import {
  DEFAULT_NODE_H,
  DEFAULT_NODE_W,
  decorateEdges,
  edgeVerdictMessages,
  syncSimulatorCells,
  type DrawnNode,
} from './simulatorGraphModel';

/**
 * The simulator canvas drawn by maxGraph.
 *
 * The devices stay React: each one is rendered through a portal into the
 * element maxGraph uses as that cell's label, so a router here is the same
 * RouterNode component the rest of the app draws — the engine owns placement,
 * links, selection and the viewport, and nothing else.
 */
export default function SimulatorMaxGraphInner({
  nodes,
  edges,
  nodeTypes,
  colorMode,
  profile,
  controls,
  minimap,
  fitViewPadding,
  selectedNodeId,
  dock,
  viewport,
  onViewportChange,
  onNodesChange,
  onNodeDragStop,
  onConnect,
  isValidConnection,
  selectNode,
  selectEdge,
  handleNodeClick,
  onZoom,
  sandbox,
}: SimulatorCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const outlineHostRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const containersRef = useRef(new Map<string, HTMLDivElement>());
  const sizesRef = useRef(new Map<string, { width: number; height: number }>());
  const [ready, setReady] = useState(false);
  const fittedRef = useRef(false);
  const applyingViewportRef = useRef(false);

  // Callbacks change identity every render; reading them from a ref keeps the
  // graph's listeners installed once instead of being torn down each time.
  const handlers = useRef({
    onNodesChange,
    onNodeDragStop,
    selectNode,
    selectEdge,
    handleNodeClick,
    onZoom,
    onViewportChange,
    sandbox,
    nodes,
    edges,
  });
  handlers.current = {
    onNodesChange,
    onNodeDragStop,
    selectNode,
    selectEdge,
    handleNodeClick,
    onZoom,
    onViewportChange,
    sandbox,
    nodes,
    edges,
  };

  /** The element a device renders into. Stable per id so the portal survives. */
  const containerFor = useCallback((id: string): HTMLDivElement => {
    const existing = containersRef.current.get(id);
    if (existing) return existing;
    const element = document.createElement('div');
    element.style.display = 'inline-block';
    containersRef.current.set(id, element);
    return element;
  }, []);

  const drawnFor = useCallback(
    (node: NetlabNode): DrawnNode => {
      const measured = sizesRef.current.get(node.id);
      return {
        element: containerFor(node.id),
        width: node.width ?? measured?.width ?? DEFAULT_NODE_W,
        height: node.height ?? measured?.height ?? DEFAULT_NODE_H,
      };
    },
    [containerFor],
  );

  // Mount once: rebuilding the Graph would drop selection and the viewport.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    InternalEvent.disableContextMenu(host);
    const graph = new Graph(host);
    graph.setHtmlLabels(true);
    // A cell's value here is the element its device is rendered into, and
    // maxGraph's default turns any DOM value into its tag name -- every device
    // would draw as the word "DIV". Its label shape does accept an element, so
    // hand the element straight through.
    graph.convertValueToString = (cell) => (cell.getValue() ?? '') as unknown as string;
    // Hovering a marked link says what is wrong with it, the way the React
    // canvas's badge did through its title text.
    const tooltips = graph.getPlugin<TooltipHandler>('TooltipHandler');
    if (tooltips) {
      tooltips.setEnabled(true);
      tooltips.getTooltipForCell = (cell: Cell) => {
        const edge = handlers.current.edges.find((candidate) => candidate.id === String(cell.id));
        return edge ? edgeVerdictMessages(edge) : '';
      };
    }
    graph.setCellsEditable(false);
    graph.setCellsResizable(false);
    graph.setConnectable(false);
    graph.setPanning(profile.panOnDrag);
    graph.setCellsMovable(profile.nodesDraggable);
    graphRef.current = graph;
    const outline = outlineHostRef.current ? new Outline(graph, outlineHostRef.current) : null;
    setReady(true);

    return () => {
      outline?.destroy();
      graph.destroy();
      graphRef.current = null;
      setReady(false);
      fittedRef.current = false;
    };
    // The interaction profile is fixed for the life of a canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw after React has put the devices in their containers, so what maxGraph
  // measures and positions is the real device rather than an empty box.
  useLayoutEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    syncSimulatorCells(graph, graph.getDefaultParent(), nodes, edges, drawnFor);
    decorateEdges(graph, edges);
  }, [nodes, edges, drawnFor, ready]);

  // A device's size is whatever its component drew; feed it back so links meet
  // the shape rather than a guessed box. Cached per id, so this settles.
  useLayoutEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    let changed = false;
    for (const node of nodes) {
      // Measure the device itself, not the container maxGraph owns: the
      // container carries whatever size the engine last gave it.
      const device = containersRef.current.get(node.id)?.firstElementChild as HTMLElement | null;
      if (!device) continue;
      const width = device.offsetWidth;
      const height = device.offsetHeight;
      if (width <= 0 || height <= 0) continue;
      const known = sizesRef.current.get(node.id);
      if (known && known.width === width && known.height === height) continue;
      sizesRef.current.set(node.id, { width, height });
      changed = true;
    }
    if (changed) {
      syncSimulatorCells(graph, graph.getDefaultParent(), nodes, edges, drawnFor);
      decorateEdges(graph, edges);
    }
    // Frame the topology once, and only once the devices have been measured:
    // fitting around guessed boxes puts the drawing somewhere the real one
    // never occupies, which showed up as devices sitting behind the panels
    // beside the canvas.
    if (viewport || fittedRef.current || nodes.length === 0 || sizesRef.current.size === 0) return;
    const fit = graph.getPlugin<FitPlugin>('fit');
    if (!fit) return;
    // maxGraph will happily blow a small topology up eight times over. A device
    // is drawn at the size it was designed at, and fitting only zooms out.
    fit.maxFitScale = 1;
    fit.fitCenter({ margin: Math.round(fitViewPadding * 100) });
    fittedRef.current = true;
  }, [nodes, edges, drawnFor, ready, fitViewPadding, viewport]);

  // Report the live zoom so the canvas can collapse areas when zoomed out, and
  // the whole viewport so a host can mirror it — the sandbox's compare view
  // keeps two canvases locked together that way.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return undefined;
    const view = graph.getView();
    const report = () => {
      handlers.current.onZoom(view.scale);
      if (applyingViewportRef.current) return;
      handlers.current.onViewportChange?.({
        x: view.translate.x * view.scale,
        y: view.translate.y * view.scale,
        zoom: view.scale,
      });
    };
    view.addListener(InternalEvent.SCALE, report);
    view.addListener(InternalEvent.TRANSLATE, report);
    view.addListener(InternalEvent.SCALE_AND_TRANSLATE, report);
    report();
    return () => {
      view.removeListener(report);
    };
  }, [ready]);

  // Follow a viewport the host is driving. Guarded so applying it does not read
  // back out as a fresh change and bounce between two mirrored canvases.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !viewport) return;
    const view = graph.getView();
    const dx = viewport.x / viewport.zoom;
    const dy = viewport.y / viewport.zoom;
    if (
      Math.abs(view.scale - viewport.zoom) < 1e-6 &&
      Math.abs(view.translate.x - dx) < 1e-6 &&
      Math.abs(view.translate.y - dy) < 1e-6
    ) {
      return;
    }
    applyingViewportRef.current = true;
    try {
      view.scaleAndTranslate(viewport.zoom, dx, dy);
    } finally {
      applyingViewportRef.current = false;
    }
  }, [viewport, ready]);

  // Clicking a device selects it; clicking empty canvas clears the selection.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return undefined;
    const onClick = (_sender: unknown, event: { getProperty: (key: string) => unknown }) => {
      const mouse = event.getProperty('event') as MouseEvent | undefined;
      // Only the primary button selects. maxGraph reports a right-click as a
      // click too, and treating it as one cleared the selection the context
      // menu had just made — the device's own panel never opened.
      if (mouse && mouse.button !== 0) return;
      const current = handlers.current;
      // A device is an HTML label, so the click often lands on markup maxGraph
      // does not recognise as a cell. Ask the DOM which device was hit before
      // concluding that empty canvas was.
      const target = mouse?.target as HTMLElement | null;
      const hitId = target?.closest?.('[data-id]')?.getAttribute('data-id') ?? null;
      const cell = event.getProperty('cell') as Cell | null;
      const node = current.nodes.find(
        (candidate) => candidate.id === (hitId ?? (cell?.isVertex() ? String(cell.id) : null)),
      );
      // An area background is drawn but is not the learner's to pick; React
      // Flow enforced that through `selectable`, so the engine does now.
      if (node && node.selectable !== false) {
        current.handleNodeClick(node);
        return;
      }
      if (node) return;
      if (cell?.isEdge()) {
        current.selectEdge(String(cell.id));
        return;
      }
      current.selectNode(null);
      current.selectEdge(null);
    };
    graph.addListener(InternalEvent.CLICK, onClick);
    return () => graph.removeListener(onClick);
  }, [ready]);

  // Dragging a device reports its new position the same way React Flow does,
  // so the canvas above does not need to know which engine moved it.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return undefined;
    const onMoved = () => {
      const current = handlers.current;
      const moved = graph
        .getSelectionCells()
        .filter((cell) => cell.isVertex() && cell.id)
        .map((cell) => ({
          id: String(cell.id),
          position: { x: cell.geometry?.x ?? 0, y: cell.geometry?.y ?? 0 },
        }));
      if (moved.length === 0) return;
      current.onNodesChange(
        moved.map((move) => ({ type: 'position' as const, id: move.id, position: move.position })),
      );
      const node = current.nodes.find((candidate) => candidate.id === moved[0]!.id);
      if (node) {
        current.onNodeDragStop({ ...node, position: moved[0]!.position }, [node]);
      }
    };
    graph.addListener(InternalEvent.CELLS_MOVED, onMoved);
    return () => graph.removeListener(onMoved);
  }, [ready]);

  // Drawing a new link goes through the same wiring the editor uses: maxGraph
  // inserts a provisional edge, the adapter removes it and reports the
  // connection, and the owner pushes the real topology back down.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !profile.nodesDraggable) return undefined;
    return wireConnect(graph, {
      isValidConnection: ({ source, target }) =>
        isValidConnection({ source, target, sourceHandle: null, targetHandle: null }),
      onConnect: ({ source, target }) =>
        onConnect({ source, target, sourceHandle: null, targetHandle: null }),
    });
  }, [ready, profile.nodesDraggable, isValidConnection, onConnect]);

  // Bring a newly selected device into view, clear of the detail panel that
  // covers the right band of the canvas.
  const lastPannedRef = useRef<string | null>(null);
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    if (!selectedNodeId) {
      lastPannedRef.current = null;
      return;
    }
    if (lastPannedRef.current === selectedNodeId) return;
    const cell = graph.getDataModel().getCell(selectedNodeId);
    const geometry = cell?.geometry;
    const host = hostRef.current;
    if (!cell || !geometry || !host) return;

    // An absolute target, not a nudge: nudging drifts a little further every
    // time a device is selected, and after a few selections the topology has
    // wandered off the canvas.
    const view = graph.getView();
    const centreX = geometry.x + geometry.width / 2;
    const centreY = geometry.y + geometry.height / 2;
    // The detail panel covers the right band, so aim for the middle of what
    // stays visible rather than the middle of the canvas.
    const visibleWidth = Math.max(host.clientWidth - dock.width, host.clientWidth / 2);
    view.setTranslate(
      visibleWidth / 2 / view.scale - centreX,
      host.clientHeight / 2 / view.scale - centreY,
    );
    lastPannedRef.current = selectedNodeId;
  }, [selectedNodeId, dock.width, ready]);

  // Right-clicking a link opens its editor. Devices handle their own context
  // menu in React, because a device is HTML; a link is an SVG shape maxGraph
  // owns, so it is asked which link is under the pointer.
  useEffect(() => {
    const host = hostRef.current;
    const graph = graphRef.current;
    if (!host || !graph) return undefined;
    const onContextMenu = (event: MouseEvent) => {
      const current = handlers.current;
      if (!current.sandbox) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('[data-id]')) return;
      const rect = host.getBoundingClientRect();
      const cell = graph.getCellAt(event.clientX - rect.left, event.clientY - rect.top);
      if (!cell?.isEdge() || !cell.id) return;
      event.preventDefault();
      const edgeId = String(cell.id);
      current.selectEdge(edgeId);
      current.sandbox.openEditPopover({
        target: { kind: 'edge', edgeId },
        // The link's own shape, so the popover opens beside the link rather
        // than at the corner of the canvas. It is an SVG element; the popover
        // only measures it, and the React Flow canvas anchored on the same
        // kind of element.
        anchorElement: (graph.getView().getState(cell)?.shape?.node ??
          host) as unknown as HTMLElement,
      });
    };
    host.addEventListener('contextmenu', onContextMenu);
    return () => host.removeEventListener('contextmenu', onContextMenu);
  }, [ready]);

  // Zooming by wheel is ours to add: maxGraph installs no wheel handler, which
  // is right for a mid-page illustration (the page keeps its scroll) and wrong
  // for an interactive canvas, where zooming out is how a learner asks for the
  // shape of a topology instead of its detail.
  useEffect(() => {
    const host = hostRef.current;
    const graph = graphRef.current;
    if (!host || !graph || !profile.zoomOnScroll) return undefined;
    const onWheel = (event: WheelEvent) => {
      if (profile.preventPageScroll) event.preventDefault();
      if (event.deltaY < 0) graph.zoomIn();
      else graph.zoomOut();
    };
    host.addEventListener('wheel', onWheel, { passive: !profile.preventPageScroll });
    return () => host.removeEventListener('wheel', onWheel);
  }, [ready, profile.zoomOnScroll, profile.preventPageScroll]);

  // A grid to line devices up against, the same affordance the editor offers.
  // It was a button that did nothing here until it was wired.
  const [gridEnabled, setGridEnabled] = useState(false);
  const toggleGrid = useCallback(() => {
    setGridEnabled((on) => {
      const next = !on;
      graphRef.current?.setGridEnabled(next);
      return next;
    });
  }, []);

  const withGraph = useCallback((fn: (graph: Graph) => void) => {
    const graph = graphRef.current;
    if (graph) fn(graph);
  }, []);

  const openNodeMenu = useCallback(
    (node: NetlabNode) => (event: React.MouseEvent<HTMLDivElement>) => {
      const current = handlers.current;
      if (!current.sandbox) return;
      event.preventDefault();
      current.selectNode(node.id);
      current.sandbox.openEditPopover({
        target: { kind: 'node', nodeId: node.id },
        anchorElement: event.currentTarget,
      });
    },
    [],
  );

  return (
    <div
      // No `netlab-canvas` test id here: NetlabCanvas's own wrapper carries it,
      // and a second one would make every canvas count twice.
      data-color-mode={colorMode}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <div
        ref={hostRef}
        data-testid="maxgraph-canvas"
        // Clipped to the canvas box: maxGraph sizes its SVG to the drawing, and
        // an unclipped one spills over the page and swallows clicks meant for
        // the controls beside a mid-page illustration.
        style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
      />
      {nodes.map((node) => {
        const Component = nodeTypes[node.type ?? ''] as
          | ((props: Record<string, unknown>) => React.ReactElement)
          | undefined;
        if (!Component) return null;
        return createPortal(
          <div
            // `data-id` is how the drop pulse finds the device that dropped a
            // packet; it used to be React Flow's own attribute on its wrapper.
            data-id={node.id}
            // `netlab-node` plus the class the canvas computed is what the
            // selection choreography is styled against — the canvas's names,
            // not the engine's.
            className={['netlab-node', node.className].filter(Boolean).join(' ')}
            style={node.style}
            onContextMenu={openNodeMenu(node)}
          >
            <Component id={node.id} data={node.data} type={node.type} selected={node.selected} />
          </div>,
          containerFor(node.id),
          node.id,
        );
      })}
      {minimap ? (
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
            border: '1px solid var(--netlab-border)',
            borderRadius: 4,
            background: 'var(--netlab-bg-surface)',
            overflow: 'hidden',
            zIndex: 2,
          }}
        />
      ) : null}
      {controls ? (
        <MaxGraphControls
          onZoomIn={() => withGraph((graph) => graph.zoomIn())}
          onZoomOut={() => withGraph((graph) => graph.zoomOut())}
          onZoomActual={() => withGraph((graph) => graph.zoomActual())}
          onFit={() =>
            withGraph((graph) => {
              const fit = graph.getPlugin<FitPlugin>('fit');
              if (fit) {
                fit.maxFitScale = 1;
                fit.fitCenter({ margin: fitViewPadding * 100 });
              }
            })
          }
          {...(profile.nodesDraggable ? { gridEnabled, onToggleGrid: toggleGrid } : {})}
        />
      ) : null}
    </div>
  );
}
