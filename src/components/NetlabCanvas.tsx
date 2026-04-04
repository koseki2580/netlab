import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useNetlabContext } from './NetlabContext';
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

  const nodeTypes = useMemo(() => ({
    ...AREA_NODE_TYPE,
    ...layerRegistry.getAllNodeTypes(),
  }), []);

  const areaNodes = useMemo(() => areasToNodes(areas), [areas]);

  const allNodes = useMemo(
    () => [...areaNodes, ...topology.nodes],
    [areaNodes, topology.nodes],
  );

  return (
    <div style={{ width: '100%', height: '100%', ...style }} className={className}>
      <ReactFlow
        nodes={allNodes}
        edges={topology.edges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: false }}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
