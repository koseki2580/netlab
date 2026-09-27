import type {
  GraphConnection,
  GraphEdgeChange,
  GraphNodeChange,
  GraphNodeTypes,
  GraphViewport,
} from '../../types/graph';
import type { NetlabEdge, NetlabNode } from '../../types/topology';
import type { NetlabColorMode } from '../../utils/themeUtils';
import type { InteractionProfile } from '../../editor/engine/types';
import type { NetworkArea } from '../../types/areas';
import type { HopBubble, StoryState } from './packetStory';

/** What the canvas is given to draw the packet from. */
export interface CanvasPacketSource {
  state: StoryState;
  /** To draw a device folded into a collapsed area as that area. */
  areas: readonly NetworkArea[];
  /** The trace's colour. */
  color: string;
  /** False for a viewer who prefers reduced motion: the packet is placed, not moved. */
  animate: boolean;
}

/**
 * The packet the canvas draws, with every device id already resolved to one
 * that is on screen (a device inside a collapsed area is drawn as its area).
 */
export interface CanvasPacket {
  /** Identifies the showing; the motion replays when it changes. */
  id: string;
  /** The device of the hop being shown, as the simulation names it. */
  at: string;
  /** Drawn devices the packet travels through, ending where it rests. */
  route: string[];
  bubble: HopBubble | null;
  /** The trace's colour. */
  color: string;
  /** False for a viewer who prefers reduced motion: the packet is placed, not moved. */
  animate: boolean;
}

/**
 * What the simulator canvas asks of a graph engine.
 *
 * NetlabCanvas keeps the domain work — styling, level of detail, selection,
 * validation — and hands the result over. Naming the contract here rather than
 * inside one engine's file is what lets the engine be replaced without the
 * canvas above it knowing.
 */
export interface SimulatorCanvasProps {
  nodes: NetlabNode[];
  edges: NetlabEdge[];
  nodeTypes: GraphNodeTypes;
  colorMode: NetlabColorMode;
  profile: InteractionProfile;
  fitViewPadding: number;
  controls: boolean;
  minimap: boolean;
  selectedNodeId: string | null;
  dock: { mode: 'overlay' | 'pinned'; width: number };
  viewport?: GraphViewport;
  onViewportChange?: (viewport: GraphViewport) => void;
  onNodesChange: (changes: GraphNodeChange<NetlabNode>[]) => void;
  onEdgesChange: (changes: GraphEdgeChange<NetlabEdge>[]) => void;
  onConnect: (connection: GraphConnection) => void;
  onNodeDragStop: (node: NetlabNode, nodes: NetlabNode[]) => void;
  isValidConnection: (connection: GraphConnection) => boolean;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  handleNodeClick: (node: NetlabNode) => void;
  onZoom: (zoom: number) => void;
  /** The simulation to draw the packet of, when a trace is loaded. */
  packet?: CanvasPacketSource;
  sandbox?: {
    openEditPopover: (input: {
      target: { kind: 'node'; nodeId: string } | { kind: 'edge'; edgeId: string };
      anchorElement: HTMLElement;
    }) => void;
  };
}
