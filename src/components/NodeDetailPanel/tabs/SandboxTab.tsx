import { memo } from 'react';
import type { NetlabNode, TopologySnapshot } from '../../../types/topology';
import { HostEditorSection } from '../sections/HostEditorSection';
import { RouterEditorSection } from '../sections/RouterEditorSection';
import { SwitchEditorSection } from '../sections/SwitchEditorSection';

export interface SandboxTabProps {
  nodeId: string;
  node: NetlabNode;
  role: string;
  canEdit: boolean;
  snapshot: TopologySnapshot;
  updateSelectedNode: (updater: (candidate: NetlabNode) => NetlabNode) => void;
}

export const SandboxTab = memo(function SandboxTab({
  nodeId,
  node,
  role,
  canEdit,
  snapshot,
  updateSelectedNode,
}: SandboxTabProps): JSX.Element | null {
  const data = node.data;
  if (!canEdit) {
    return (
      <div style={{ color: 'var(--netlab-text-muted)' }}>
        Sandbox edits are disabled for this view.
      </div>
    );
  }
  if (role === 'router') {
    return (
      <RouterEditorSection
        nodeId={nodeId}
        data={data}
        editable={canEdit}
        snapshot={snapshot}
        updateNode={updateSelectedNode}
      />
    );
  }
  if (role === 'switch') {
    return <SwitchEditorSection data={data} editable={canEdit} updateNode={updateSelectedNode} />;
  }
  if (role === 'client' || role === 'server') {
    return (
      <HostEditorSection
        nodeId={nodeId}
        data={data}
        editable={canEdit}
        snapshot={snapshot}
        updateNode={updateSelectedNode}
      />
    );
  }
  return null;
});
