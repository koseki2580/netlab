import { useState, useMemo, useCallback, useContext } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  addEdge,
  type NodeTypes,
  type Connection,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useNetlabContext } from './NetlabContext';
import { NetlabUIContext } from './NetlabUIContext';
import { NodeDetailPanel } from './NodeDetailPanel';
import { layerRegistry } from '../registry/LayerRegistry';
import { areasToNodes } from '../areas/AreaRegistry';
import { AreaBackground } from '../areas/AreaBackground';
import { isValidConnectionBetweenNodes, isValidEdge } from '../utils/connectionValidator';
import { SimulationContext } from '../simulation/SimulationContext';
import { useOptionalFailure } from '../simulation/FailureContext';
import type { NetlabNode } from '../types/topology';

const AREA_NODE_TYPE: NodeTypes = {
  'netlab-area': AreaBackground as NodeTypes[string],
};

export interface NetlabCanvasProps {
  style?: React.CSSProperties;
  className?: string;
}

export function NetlabCanvas({ style, className }: NetlabCanvasProps) {
  const { topology, areas } = useNetlabContext();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Optional: read active edge IDs from SimulationContext (non-throwing)
  const simCtx = useContext(SimulationContext);
  const activeEdgeIds = simCtx?.state.activeEdgeIds ?? [];

  // Optional: read failure state for visual styling
  const failureCtx = useOptionalFailure();

  const nodeTypes = useMemo(() => ({
    ...AREA_NODE_TYPE,
    ...layerRegistry.getAllNodeTypes(),
  }), []);

  const areaNodes = useMemo(() => areasToNodes(areas), [areas]);

  const initialNodes = useMemo(
    () => [...areaNodes, ...topology.nodes],
    [areaNodes, topology.nodes],
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(topology.edges);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) => addEdge({ ...connection, type: 'smoothstep' }, eds)),
    [setEdges],
  );

  const validateConnection = useCallback(
    (connection: Connection | Edge) =>
      isValidConnectionBetweenNodes(nodes as NetlabNode[], connection.source, connection.target),
    [nodes],
  );

  const styledNodes = useMemo(
    () =>
      nodes.map((node) => {
        if (failureCtx?.isNodeDown(node.id)) {
          return { ...node, style: { ...node.style, opacity: 0.4, filter: 'grayscale(80%)' } };
        }
        return node;
      }),
    [nodes, failureCtx],
  );

  const styledEdges = useMemo(
    () =>
      edges.map((edge) => {
        if (failureCtx?.isEdgeDown(edge.id)) {
          return {
            ...edge,
            animated: false,
            style: { ...edge.style, stroke: '#ef4444', strokeDasharray: '6 3', strokeWidth: 2, opacity: 0.7 },
          };
        }
        if (activeEdgeIds.includes(edge.id)) {
          return { ...edge, animated: true, style: { ...edge.style, stroke: '#7dd3fc', strokeWidth: 2 } };
        }
        if (!isValidEdge(nodes as NetlabNode[], edge)) {
          return { ...edge, style: { ...edge.style, stroke: 'red' } };
        }
        return edge;
      }),
    [edges, nodes, activeEdgeIds, failureCtx],
  );

  const uiCtx = useMemo(
    () => ({ selectedNodeId, setSelectedNodeId }),
    [selectedNodeId],
  );

  return (
    <NetlabUIContext.Provider value={uiCtx}>
      <div style={{ width: '100%', height: '100%', position: 'relative', ...style }} className={className}>
        <ReactFlow
          nodes={styledNodes}
          edges={styledEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={validateConnection}
          connectionMode={ConnectionMode.Loose}
          fitView
          proOptions={{ hideAttribution: false }}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
        <NodeDetailPanel />
      </div>
    </NetlabUIContext.Provider>
  );
}
