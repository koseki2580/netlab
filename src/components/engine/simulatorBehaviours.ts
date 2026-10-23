import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';
import { InternalEvent, Outline, type Cell, type Graph } from '@maxgraph/core';
import { AREA_CLUSTER_NODE_TYPE } from '../../areas/areaLod';
import type { useI18n } from '../../i18n/useI18n';
import { wireConnect } from '../../maxgraph/maxGraphInteraction';
import type { NetlabNode } from '../../types/topology';
import type { SimulatorCanvasProps } from './canvasEngine';
import { AREA_BACKDROP_TYPES, devicesCovered, frameDrawing } from './simulatorFraming';
import { decorateEdges, syncSimulatorCells, type DrawnNode } from './simulatorGraphModel';

/**
 * The simulator canvas's behaviours, one hook each, composed by
 * `SimulatorMaxGraphInner` in the order they were written there. Each reads the
 * graph from `graphRef` and re-runs when `ready` flips, exactly as the inline
 * effects did, so listeners are installed at the same moments as before.
 */

/** The latest callbacks and data, read from a ref so listeners are installed once. */
type HandlerKey =
  | 'onNodesChange'
  | 'onNodeDragStop'
  | 'selectNode'
  | 'selectEdge'
  | 'handleNodeClick'
  | 'onZoom'
  | 'onViewportChange'
  | 'sandbox'
  | 'nodes'
  | 'edges';
export type CanvasHandlers = { readonly [K in HandlerKey]: SimulatorCanvasProps[K] } & {
  readonly t: ReturnType<typeof useI18n>['t'];
};

type GraphRef = RefObject<Graph | null>;
type HostRef = RefObject<HTMLDivElement | null>;

/**
 * How tall the canvas is decides whether the overview fits on it. Measured
 * before the drawing is framed, so framing sees the overlays that will stay.
 */
export function useHostHeight(hostRef: HostRef): number | null {
  const [hostHeight, setHostHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    setHostHeight(host.clientHeight);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => setHostHeight(host.clientHeight));
    observer.observe(host);
    return () => observer.disconnect();
  }, [hostRef]);
  return hostHeight;
}

/**
 * The overview comes and goes with the canvas height, so it is built for the
 * element it draws into rather than once with the graph. `outlineRef` is shared
 * with the graph's teardown, which takes the overview down first.
 */
export function useMinimapOutline(
  graphRef: GraphRef,
  ready: boolean,
  outlineHostRef: HostRef,
  outlineRef: MutableRefObject<Outline | null>,
  show: boolean,
): void {
  useEffect(() => {
    const graph = graphRef.current;
    const outlineHost = outlineHostRef.current;
    if (!graph || !show || !outlineHost) return undefined;
    const outline = new Outline(graph, outlineHost);
    outlineRef.current = outline;
    return () => {
      // Already gone if the graph was torn down first.
      if (outlineRef.current !== outline) return;
      outline.destroy();
      outlineRef.current = null;
    };
  }, [ready, show, graphRef, outlineHostRef, outlineRef]);
}

export interface DrawingInputs {
  readonly graphRef: GraphRef;
  readonly ready: boolean;
  readonly hostRef: HostRef;
  readonly nodes: readonly NetlabNode[];
  readonly edges: SimulatorCanvasProps['edges'];
  readonly drawnFor: (node: NetlabNode) => DrawnNode;
  /** The element each device renders into, by id. */
  readonly containersRef: MutableRefObject<Map<string, HTMLDivElement>>;
  /** Each device's measured size, by id. */
  readonly sizesRef: MutableRefObject<Map<string, { width: number; height: number }>>;
  /** Whether the drawing has been framed once already. */
  readonly fittedRef: MutableRefObject<boolean>;
  readonly viewport: SimulatorCanvasProps['viewport'];
  readonly fitViewPadding: number;
  readonly hostHeight: number | null;
}

/**
 * Draws the devices and links, feeds each device's drawn size back so links
 * meet the shape, and frames the topology once the devices have been measured.
 */
export function useSimulatorDrawing({
  graphRef,
  ready,
  hostRef,
  nodes,
  edges,
  drawnFor,
  containersRef,
  sizesRef,
  fittedRef,
  viewport,
  fitViewPadding,
  hostHeight,
}: DrawingInputs): void {
  // Draw after React has put the devices in their containers, so what maxGraph
  // measures and positions is the real device rather than an empty box.
  useLayoutEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    syncSimulatorCells(graph, graph.getDefaultParent(), nodes, edges, drawnFor);
    decorateEdges(graph, edges);
  }, [nodes, edges, drawnFor, ready, graphRef]);

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
    // Not before the canvas height is known: it decides whether the overview
    // is on screen, and framing has to keep clear of it.
    if (hostHeight === null) return;
    const host = hostRef.current;
    if (!host) return;
    // Nothing to frame, or nowhere to frame it in. Leaving `fitted` unset means
    // this is tried again once the canvas has been laid out — a canvas that is
    // measured as zero-sized on its first pass is common enough inside a
    // collapsed panel or an embed.
    const bounds = graph.getGraphBounds();
    if (host.clientWidth < 2 || host.clientHeight < 2) return;
    if (!(bounds.width > 0 && bounds.height > 0) || !(graph.getView().scale > 0)) return;
    // `fitViewPadding` is a fraction of the canvas, the way React Flow read it.
    // Passing it as pixels padded a 1350px canvas by ten of them, so the
    // topology sat flush against both edges with its last device clipped.
    frameDrawing(graph, host, fitViewPadding);
    fittedRef.current = true;
  }, [
    nodes,
    edges,
    drawnFor,
    ready,
    fitViewPadding,
    viewport,
    hostHeight,
    graphRef,
    hostRef,
    containersRef,
    sizesRef,
    fittedRef,
  ]);
}

/**
 * The packet is drawn over the graph in the graph's own coordinates, so it is
 * placed again whenever the view moves or the cells are redrawn. Returns a
 * counter that changes each time.
 */
export function usePacketRevision(graphRef: GraphRef, ready: boolean, hasPacket: boolean): number {
  const [viewRevision, setViewRevision] = useState(0);
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !hasPacket) return undefined;
    const view = graph.getView();
    const model = graph.getDataModel();
    const bump = () => setViewRevision((value) => value + 1);
    view.addListener(InternalEvent.SCALE, bump);
    view.addListener(InternalEvent.TRANSLATE, bump);
    view.addListener(InternalEvent.SCALE_AND_TRANSLATE, bump);
    model.addListener(InternalEvent.CHANGE, bump);
    bump();
    return () => {
      view.removeListener(bump);
      model.removeListener(bump);
    };
  }, [ready, hasPacket, graphRef]);
  return viewRevision;
}

/**
 * A panel a lesson shows over the canvas can grow onto a device as the packet
 * moves — the packet viewer fills in once a hop is chosen, and covered the
 * Server the packet was heading for. When a device ends up under a marked
 * overlay, the drawing is framed again clear of it, unless the host drives
 * the viewport itself.
 */
export function useReframeForPacket(
  graphRef: GraphRef,
  ready: boolean,
  hostRef: HostRef,
  handlers: MutableRefObject<CanvasHandlers>,
  packetId: string | undefined,
  hasPacket: boolean,
  viewport: SimulatorCanvasProps['viewport'],
  fitViewPadding: number,
): void {
  useEffect(() => {
    const graph = graphRef.current;
    const host = hostRef.current;
    if (!graph || !host || !hasPacket || viewport) return;
    const devices = handlers.current.nodes
      .filter((node) => !AREA_BACKDROP_TYPES.has(node.type ?? ''))
      .map((node) => node.id);
    if (devicesCovered(graph, host, devices)) frameDrawing(graph, host, fitViewPadding);
    // Checked when the packet moves on, not on every pan: a learner who moves
    // the view away on purpose is left where they put it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packetId, ready]);
}

/**
 * Reports the live zoom so the canvas can collapse areas when zoomed out, and
 * the whole viewport so a host can mirror it — the sandbox's compare view
 * keeps two canvases locked together that way. Follows a viewport the host is
 * driving, guarded so applying it does not read back out as a fresh change and
 * bounce between two mirrored canvases.
 */
export function useViewportSync(
  graphRef: GraphRef,
  ready: boolean,
  handlers: MutableRefObject<CanvasHandlers>,
  viewport: SimulatorCanvasProps['viewport'],
): void {
  const applyingViewportRef = useRef(false);

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
  }, [ready, graphRef, handlers]);

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
  }, [viewport, ready, graphRef]);
}

/** Clicking a device selects it; clicking empty canvas clears the selection. */
export function useCanvasSelection(
  graphRef: GraphRef,
  ready: boolean,
  handlers: MutableRefObject<CanvasHandlers>,
): void {
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return undefined;
    const onClick = (_sender: unknown, event: { getProperty: (key: string) => unknown }) => {
      const mouse = event.getProperty('event') as MouseEvent | undefined;
      // Only the primary button selects. maxGraph reports a right-click as a
      // click too, and treating it as one cleared the selection the context
      // menu had just made — the device's own panel never opened.
      // A tap arrives as a touch event, which has no button at all: read as
      // "not the primary button" it was dropped, so on a phone a tap never
      // selected a device or opened a collapsed area.
      if (mouse && typeof mouse.button === 'number' && mouse.button !== 0) return;
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
  }, [ready, graphRef, handlers]);
}

/**
 * Dragging a device reports its new position the same way React Flow does,
 * so the canvas above does not need to know which engine moved it.
 */
export function useDeviceDrag(
  graphRef: GraphRef,
  ready: boolean,
  handlers: MutableRefObject<CanvasHandlers>,
): void {
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
  }, [ready, graphRef, handlers]);
}

/**
 * Drawing a new link goes through the same wiring the editor uses: maxGraph
 * inserts a provisional edge, the adapter removes it and reports the
 * connection, and the owner pushes the real topology back down.
 */
export function useLinkDrawing(
  graphRef: GraphRef,
  ready: boolean,
  enabled: boolean,
  isValidConnection: SimulatorCanvasProps['isValidConnection'],
  onConnect: SimulatorCanvasProps['onConnect'],
): void {
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !enabled) return undefined;
    return wireConnect(graph, {
      isValidConnection: ({ source, target }) =>
        isValidConnection({ source, target, sourceHandle: null, targetHandle: null }),
      onConnect: ({ source, target }) =>
        onConnect({ source, target, sourceHandle: null, targetHandle: null }),
    });
  }, [ready, enabled, isValidConnection, onConnect, graphRef]);
}

/**
 * Brings a newly selected device into view, clear of the detail panel that
 * covers the right band of the canvas.
 */
export function useRevealSelected(
  graphRef: GraphRef,
  ready: boolean,
  hostRef: HostRef,
  selectedNodeId: string | null | undefined,
  dockWidth: number,
): void {
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

    // Only move the view when the device would otherwise be hidden, and then
    // by the least that reveals it. Centring on every selection threw the rest
    // of the topology off the canvas — press the rightmost device and three of
    // five disappear — and closing the panel did not bring them back.
    const view = graph.getView();
    const { scale, translate } = view;
    // The detail panel covers the right band, so the device has to clear it.
    const visibleWidth = Math.max(host.clientWidth - dockWidth, host.clientWidth / 2);
    const margin = 24;
    const left = (geometry.x + translate.x) * scale;
    const top = (geometry.y + translate.y) * scale;
    const right = left + geometry.width * scale;
    const bottom = top + geometry.height * scale;

    let dx = 0;
    if (left < margin) dx = (margin - left) / scale;
    else if (right > visibleWidth - margin) dx = (visibleWidth - margin - right) / scale;
    let dy = 0;
    if (top < margin) dy = (margin - top) / scale;
    else if (bottom > host.clientHeight - margin)
      dy = (host.clientHeight - margin - bottom) / scale;

    if (dx !== 0 || dy !== 0) {
      view.setTranslate(translate.x + dx, translate.y + dy);
    }
    lastPannedRef.current = selectedNodeId;
  }, [selectedNodeId, dockWidth, ready, graphRef, hostRef]);
}

/**
 * Right-clicking a link opens its editor. Devices handle their own context
 * menu in React, because a device is HTML; a link is an SVG shape maxGraph
 * owns, so it is asked which link is under the pointer.
 */
export function useLinkContextMenu(
  graphRef: GraphRef,
  ready: boolean,
  hostRef: HostRef,
  handlers: MutableRefObject<CanvasHandlers>,
): void {
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
      if (!cell?.id) return;
      const anchorElement = (graph.getView().getState(cell)?.shape?.node ??
        host) as unknown as HTMLElement;
      if (cell.isVertex()) {
        // Zoomed far out a device is drawn by the graph rather than by React,
        // so its own menu handler is not there to catch the press. An embedded
        // sandbox is small enough to draw every device that way, and right-
        // clicking a device then did nothing.
        const node = current.nodes.find((candidate) => candidate.id === String(cell.id));
        if (!node || node.type === AREA_CLUSTER_NODE_TYPE) return;
        event.preventDefault();
        current.selectNode(node.id);
        current.sandbox.openEditPopover({
          target: { kind: 'node', nodeId: node.id },
          anchorElement,
        });
        return;
      }
      if (!cell.isEdge()) return;
      event.preventDefault();
      const edgeId = String(cell.id);
      current.selectEdge(edgeId);
      current.sandbox.openEditPopover({
        target: { kind: 'edge', edgeId },
        // The link's own shape, so the popover opens beside the link rather
        // than at the corner of the canvas. It is an SVG element; the popover
        // only measures it, and the React Flow canvas anchored on the same
        // kind of element.
        anchorElement,
      });
    };
    host.addEventListener('contextmenu', onContextMenu);
    return () => host.removeEventListener('contextmenu', onContextMenu);
  }, [ready, graphRef, hostRef, handlers]);
}

/**
 * Zooming by wheel is ours to add: maxGraph installs no wheel handler, which
 * is right for a mid-page illustration (the page keeps its scroll) and wrong
 * for an interactive canvas, where zooming out is how a learner asks for the
 * shape of a topology instead of its detail.
 */
export function useWheelZoom(
  graphRef: GraphRef,
  ready: boolean,
  hostRef: HostRef,
  zoomOnScroll: boolean,
  preventPageScroll: boolean,
): void {
  useEffect(() => {
    const host = hostRef.current;
    const graph = graphRef.current;
    if (!host || !graph || !zoomOnScroll) return undefined;
    const onWheel = (event: WheelEvent) => {
      if (preventPageScroll) event.preventDefault();
      if (event.deltaY < 0) graph.zoomIn();
      else graph.zoomOut();
    };
    host.addEventListener('wheel', onWheel, { passive: !preventPageScroll });
    return () => host.removeEventListener('wheel', onWheel);
  }, [ready, zoomOnScroll, preventPageScroll, graphRef, hostRef]);
}
