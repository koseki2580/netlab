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
  sandbox?: {
    openEditPopover: (input: {
      target: { kind: 'node'; nodeId: string } | { kind: 'edge'; edgeId: string };
      anchorElement: HTMLElement;
    }) => void;
  };
}
