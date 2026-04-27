import type { Edit } from '../edits';
import type { SandboxMode } from '../types';

export const messages = {
  editApplied(edit: Edit): string {
    switch (edit.kind) {
      case 'interface.mtu':
        return `MTU set to ${edit.after} on ${edit.target.nodeId} interface ${edit.target.ifaceId}.`;
      case 'link.state':
        return `Link ${edit.target.edgeId} set to ${edit.after}.`;
      case 'node.route.add':
        return `Static route added on ${edit.target.nodeId}: ${edit.route.prefix} via ${edit.route.nextHop}.`;
      case 'node.route.remove':
        return `Static route removed on ${edit.target.nodeId}.`;
      case 'node.route.edit':
        return `Static route updated on ${edit.target.nodeId}.`;
      case 'node.nat.add':
        return `NAT rule added on ${edit.target.nodeId}.`;
      case 'node.nat.remove':
        return `NAT rule removed on ${edit.target.nodeId}.`;
      case 'node.nat.edit':
        return `NAT rule updated on ${edit.target.nodeId}.`;
      case 'node.acl.add':
        return `ACL rule added on ${edit.target.nodeId}.`;
      case 'node.acl.remove':
        return `ACL rule removed on ${edit.target.nodeId}.`;
      case 'node.acl.edit':
        return `ACL rule updated on ${edit.target.nodeId}.`;
      case 'param.set':
        return `Parameter ${edit.key} changed to ${edit.after}.`;
      case 'packet.header':
        return `Packet header field ${edit.fieldPath} set to ${edit.after}.`;
      case 'packet.flags.tcp':
        return 'TCP flags updated.';
      case 'packet.payload':
        return 'Packet payload updated.';
      case 'packet.compose':
        return 'New packet composed.';
      case 'traffic.launch':
        return `Traffic flow launched from ${edit.flow.srcNodeId} to ${edit.flow.dstNodeId}.`;
      case 'noop':
        return '';
      default:
        return 'Edit applied.';
    }
  },

  editUndone(edit: Edit): string {
    const base = messages.editApplied(edit);
    return base ? `Undone: ${base}` : 'Last edit undone.';
  },

  editRedone(edit: Edit): string {
    const base = messages.editApplied(edit);
    return base ? `Redone: ${base}` : 'Last edit redone.';
  },

  modeChanged(mode: SandboxMode): string {
    return mode === 'beta'
      ? 'Compare mode enabled; baseline and what-if are running side by side.'
      : 'Compare mode exited.';
  },

  resetAll(): string {
    return 'All edits reset; sandbox returned to baseline.';
  },
};
