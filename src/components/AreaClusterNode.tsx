import type { GraphNodeProps as NodeProps } from '../types/graph';
import { NodePorts } from './NodePorts';
import type { AreaClusterNodeData } from '../areas/areaLod';
import { AreaCluster } from './AreaCluster';

/**
 * The node type for a collapsed area (C4 LOD). Wraps the presentational
 * {@link AreaCluster} and asks the engine for the anchors a re-pointed boundary
 * edge needs. Expansion is handled by the canvas's `onNodeClick` (which knows
 * the area id), so the node stays state-free.
 */
export function AreaClusterNode({ data }: NodeProps) {
  const d = data as AreaClusterNodeData;
  const hidden = { opacity: 0, width: 1, height: 1, border: 'none', minWidth: 0, minHeight: 0 };
  return (
    <>
      <NodePorts variant="cluster" style={hidden} />
      <AreaCluster
        name={d.name}
        hostCount={d.hostCount}
        {...(d.onExpand ? { onExpand: d.onExpand } : {})}
      />
    </>
  );
}
