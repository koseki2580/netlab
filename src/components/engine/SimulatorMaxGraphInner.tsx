import { useCallback, useMemo, useRef, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { Cell, Graph, Outline, type PanningHandler, type TooltipHandler } from '@maxgraph/core';
import { AREA_CLUSTER_NODE_TYPE } from '../../areas/areaLod';
import { useI18n } from '../../i18n/useI18n';
import { useArpWords } from '../simulation/useArpWords';
import { DefaultNode } from '../DefaultNode';
import { MaxGraphControls } from '../../maxgraph/MaxGraphControls';
import { useGridToggle, useMaxGraph } from '../../maxgraph/useMaxGraph';
import type { GraphNodeProps } from '../../types/graph';
import type { NetlabNode } from '../../types/topology';
import type { SimulatorCanvasProps } from './canvasEngine';
import {
  DEFAULT_NODE_H,
  DEFAULT_NODE_W,
  edgeVerdictMessages,
  LINK_STATE_GLYPH,
  linkStateOf,
  type DrawnNode,
  type LinkState,
} from './simulatorGraphModel';
import {
  type CanvasHandlers,
  useCanvasSelection,
  useDeviceDrag,
  useHostHeight,
  useLinkContextMenu,
  useLinkDrawing,
  useMinimapOutline,
  usePacketRevision,
  useReframeForPacket,
  useRevealSelected,
  useSimulatorDrawing,
  useViewportSync,
  useWheelZoom,
} from './simulatorBehaviours';
import { offersGridSnap } from './canvasOffers';
import { PacketMarker } from './PacketMarker';
import { canvasPacketFrom } from './packetStory';
import { frameDrawing } from './simulatorFraming';

/**
 * The simulator canvas drawn by maxGraph.
 *
 * The devices stay React: each one is rendered through a portal into the
 * element maxGraph uses as that cell's label, so a router here is the same
 * RouterNode component the rest of the app draws — the engine owns placement,
 * links, selection and the viewport, and nothing else.
 */
/**
 * Below this canvas height the overview is not drawn. On a short canvas it
 * covered a device at every width — the third device of a 240px lesson, the
 * last server of a 375px one — and a handful of devices needs no overview.
 */
export const MINIMAP_MIN_CANVAS_HEIGHT = 400;

/** What a link state is called and what it means, for the key and the hover. */
const LINK_STATE_KEYS: Record<Exclude<LinkState, 'up'>, { label: string; hint: string }> = {
  down: { label: 'simulation.linkState.down', hint: 'simulation.linkState.downHint' },
  blocked: { label: 'simulation.linkState.blocked', hint: 'simulation.linkState.blockedHint' },
};

/** The bubble of an unanswered ARP (REQ-350): its words load with `useArpWords`. */
const ARP_BUBBLE_KEY = 'simulation.packetStory.dropArpNoReply';

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
  packet: packetSource,
}: SimulatorCanvasProps) {
  const { t, locale } = useI18n();
  const packet = useMemo(
    () =>
      packetSource
        ? (canvasPacketFrom(packetSource, new Set(nodes.map((node) => node.id))) ?? undefined)
        : undefined,
    [packetSource, nodes],
  );
  const arp = useArpWords(packet?.bubble?.key === ARP_BUBBLE_KEY);
  const hostRef = useRef<HTMLDivElement>(null);
  const outlineHostRef = useRef<HTMLDivElement>(null);
  // The overview draws from the graph, so it has to go before the graph does.
  const outlineRef = useRef<Outline | null>(null);
  const hostHeight = useHostHeight(hostRef);
  const showMinimap = minimap && hostHeight !== null && hostHeight >= MINIMAP_MIN_CANVAS_HEIGHT;
  const shownLinkStates = (['down', 'blocked'] as const).filter((state) =>
    edges.some((edge) => linkStateOf(edge) === state),
  );
  const containersRef = useRef(new Map<string, HTMLDivElement>());
  const sizesRef = useRef(new Map<string, { width: number; height: number }>());
  const fittedRef = useRef(false);

  // Callbacks change identity every render; reading them from a ref keeps the
  // graph's listeners installed once instead of being torn down each time.
  const handlers = useRef<CanvasHandlers>({
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
    t,
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
    t,
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
  // The interaction profile is fixed for the life of a canvas.
  const { graph: mounted, graphRef } = useMaxGraph(hostRef, (graph) => {
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
        const { edges: current, t: translate } = handlers.current;
        const edge = current.find((candidate) => candidate.id === String(cell.id));
        if (!edge) return '';
        const state = linkStateOf(edge);
        return [
          state === 'up' ? '' : translate(LINK_STATE_KEYS[state].hint),
          edgeVerdictMessages(edge),
        ]
          .filter(Boolean)
          .join('\n');
      };
    }
    graph.setCellsEditable(false);
    graph.setCellsResizable(false);
    graph.setConnectable(false);
    graph.setPanning(profile.panOnDrag);
    // Enabling panning is not enough: maxGraph's handler waits for the right
    // button or ctrl-shift by default, so dragging the canvas did nothing —
    // the first gesture a learner tries on a diagram larger than its frame.
    // `ignoreCell` keeps the drag from starting on a device, which stays
    // draggable in its own right.
    const panning = graph.getPlugin<PanningHandler>('PanningHandler');
    if (panning) {
      panning.useLeftButtonForPanning = profile.panOnDrag;
      panning.ignoreCell = false;
    }
    graph.setCellsMovable(profile.nodesDraggable);

    return () => {
      // Unmount runs this cleanup before the overview's own, so the overview
      // is taken down here first; destroyed after the graph, it reached for
      // listeners on an element that was gone, and leaving a lesson blanked
      // the page.
      outlineRef.current?.destroy();
      outlineRef.current = null;
      fittedRef.current = false;
    };
  });
  const ready = mounted !== null;

  useMinimapOutline(graphRef, ready, outlineHostRef, outlineRef, showMinimap);
  useSimulatorDrawing({
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
  });
  const viewRevision = usePacketRevision(graphRef, ready, packet !== undefined);
  useReframeForPacket(
    graphRef,
    ready,
    hostRef,
    handlers,
    packet?.id,
    packet !== undefined,
    viewport,
    fitViewPadding,
  );
  useViewportSync(graphRef, ready, handlers, viewport);
  useCanvasSelection(graphRef, ready, handlers);
  useDeviceDrag(graphRef, ready, handlers);
  useLinkDrawing(graphRef, ready, profile.nodesDraggable, isValidConnection, onConnect);
  useRevealSelected(graphRef, ready, hostRef, selectedNodeId, dock.width);
  useLinkContextMenu(graphRef, ready, hostRef, handlers);
  useWheelZoom(graphRef, ready, hostRef, profile.zoomOnScroll, profile.preventPageScroll);

  // A grid to line devices up against, the same affordance the editor offers.
  // It was a button that did nothing here until it was wired.
  const [gridEnabled, toggleGrid] = useGridToggle(mounted, false);

  const withGraph = useCallback(
    (fn: (graph: Graph) => void) => {
      const graph = graphRef.current;
      if (graph) fn(graph);
    },
    [graphRef],
  );

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
        // Falling back rather than returning null: a device the canvas has no
        // drawing for still has to be on screen. Dropping it left the wireless
        // lesson with a canvas and nothing on it.
        const Component: ComponentType<GraphNodeProps> = nodeTypes[node.type ?? ''] ?? DefaultNode;
        return createPortal(
          <div
            // `data-id` is how the drop pulse finds the device that dropped a
            // packet; it used to be React Flow's own attribute on its wrapper.
            data-id={node.id}
            // Reachable without a mouse. Selecting a device is how a learner
            // reads its addresses and routes, and a canvas whose devices are
            // not in the tab order puts all of that out of reach. React Flow
            // made its nodes focusable and the interaction profile still asks
            // for it, so losing it was silent.
            // A collapsed area is skipped: it carries its own expand button, and
            // wrapping that in another button is interactive content nested
            // inside interactive content.
            {...(profile.nodesFocusable &&
            node.selectable !== false &&
            node.type !== AREA_CLUSTER_NODE_TYPE
              ? {
                  tabIndex: 0,
                  role: 'button',
                  'aria-label': String((node.data as { label?: string }).label ?? node.id),
                  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    handlers.current.handleNodeClick(node);
                  },
                }
              : {})}
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
      {packet && graphRef.current ? (
        <PacketMarker
          graph={graphRef.current}
          edges={edges}
          packet={packet}
          revision={viewRevision}
          label={t('simulation.packetStory.marker')}
          bubbleText={
            !packet.bubble
              ? null
              : packet.bubble.key === ARP_BUBBLE_KEY
                ? (arp?.bubbleWords(locale) ?? t('simulation.packetStory.dropOther'))
                : t(packet.bubble.key, packet.bubble.params)
          }
        />
      ) : null}
      {showMinimap ? (
        <div
          ref={outlineHostRef}
          data-testid="maxgraph-minimap"
          data-canvas-overlay=""
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
      {shownLinkStates.length > 0 ? (
        // What the marks on the links mean, shown only while one is on screen.
        // Stacked over the zoom strip, so framing keeps the drawing clear of
        // both at once.
        <div
          data-testid="canvas-link-state-key"
          data-canvas-overlay=""
          role="group"
          aria-label={t('simulation.linkState.keyLabel')}
          style={{
            position: 'absolute',
            right: 8,
            bottom: (showMinimap ? 116 : 8) + (controls ? 34 : 0),
            display: 'flex',
            gap: 10,
            padding: '3px 8px',
            borderRadius: 4,
            border: '1px solid var(--netlab-border)',
            background: 'var(--netlab-bg-surface)',
            color: 'var(--netlab-text-secondary)',
            fontSize: 11,
            zIndex: 2,
          }}
        >
          {shownLinkStates.map((state) => (
            <span
              key={state}
              data-link-state={state}
              title={t(LINK_STATE_KEYS[state].hint)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <svg width={26} height={12} aria-hidden="true">
                <line
                  x1={1}
                  y1={6}
                  x2={25}
                  y2={6}
                  strokeWidth={2}
                  stroke={
                    state === 'down' ? 'var(--netlab-accent-red)' : 'var(--netlab-text-muted)'
                  }
                  strokeDasharray={state === 'down' ? '6 3' : '1 3'}
                />
              </svg>
              <span
                aria-hidden="true"
                style={{
                  fontWeight: 700,
                  color: state === 'down' ? 'var(--netlab-accent-red)' : 'var(--netlab-text-muted)',
                }}
              >
                {LINK_STATE_GLYPH[state]}
              </span>
              {t(LINK_STATE_KEYS[state].label)}
            </span>
          ))}
        </div>
      ) : null}
      {controls ? (
        <MaxGraphControls
          // Bottom-right, clear of the areas legend that sits bottom-left on
          // this canvas, and raised over the overview when one is shown.
          placement="bottom-right"
          bottomOffset={showMinimap ? 116 : 8}
          onZoomIn={() => withGraph((graph) => graph.zoomIn())}
          onZoomOut={() => withGraph((graph) => graph.zoomOut())}
          onZoomActual={() => withGraph((graph) => graph.zoomActual())}
          onFit={() =>
            withGraph((graph) => {
              const host = hostRef.current;
              if (host) frameDrawing(graph, host, fitViewPadding);
            })
          }
          {...(offersGridSnap(profile) ? { gridEnabled, onToggleGrid: toggleGrid } : {})}
        />
      ) : null}
    </div>
  );
}
