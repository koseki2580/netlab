import { useState, useMemo, useCallback } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useNetlabContext } from './NetlabContext';
import { NetlabUIContext } from './NetlabUIContext';
import { NodeDetailPanel } from './NodeDetailPanel';
import { layerRegistry } from '../registry/LayerRegistry';
import { areasToNodes } from '../areas/AreaRegistry';
import { AreaBackground } from '../areas/AreaBackground';

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

  const uiCtx = useMemo(
    () => ({ selectedNodeId, setSelectedNodeId }),
    [selectedNodeId],
  );

  return (
    <NetlabUIContext.Provider value={uiCtx}>
      <div style={{ width: '100%', height: '100%', position: 'relative', ...style }} className={className}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
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
