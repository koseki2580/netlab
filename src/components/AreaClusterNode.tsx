import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AreaClusterNodeData } from '../areas/areaLod';
import { AreaCluster } from './AreaCluster';

/**
 * React Flow node type for a collapsed area (C4 LOD). Wraps the presentational
 * {@link AreaCluster} and exposes hidden source/target handles so re-pointed
 * boundary edges have somewhere to attach. Expansion is handled by the canvas's
 * `onNodeClick` (which knows the area id), so the node stays state-free.
 */
export function AreaClusterNode({ data }: NodeProps) {
  const d = data as AreaClusterNodeData;
  const hidden = { opacity: 0, width: 1, height: 1, border: 'none', minWidth: 0, minHeight: 0 };
  return (
    <>
      <Handle type="target" position={Position.Left} style={hidden} />
      <AreaCluster
        name={d.name}
        hostCount={d.hostCount}
        {...(d.onExpand ? { onExpand: d.onExpand } : {})}
      />
      <Handle type="source" position={Position.Right} style={hidden} />
    </>
  );
}
