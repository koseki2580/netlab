import type { AclRule as RuntimeAclRule } from '../../types/acl';
import type { SimulationSnapshot, SandboxAclRule } from '../types';
import type { Edit } from './types';
import { registerReducer } from './registry';
import { nodeRuleAdd, nodeRuleEdit, nodeRuleRemove, replaceNode, withTopology } from './helpers';

function toRuntimeAcl(rule: SandboxAclRule): RuntimeAclRule {
  return {
    id: rule.id,
    priority: rule.order,
    action: rule.action,
    protocol: rule.proto ?? 'any',
    ...(rule.matchSrc !== undefined ? { srcIp: rule.matchSrc } : {}),
    ...(rule.matchDst !== undefined ? { dstIp: rule.matchDst } : {}),
    ...(rule.dstPort !== undefined ? { dstPort: rule.dstPort } : {}),
  };
}
function applyRuntimeAclToFirstInterface(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'node.acl.add' }>,
): SimulationSnapshot {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => {
    const firstInterface = node.data.interfaces?.[0];
    if (!firstInterface) return node;
    const existing = firstInterface.inboundAcl ?? [];
    if (existing.some((rule) => rule.id === edit.rule.id)) return node;

    const [head, ...rest] = node.data.interfaces ?? [];
    if (!head) return node;

    return {
      ...node,
      data: {
        ...node.data,
        interfaces: [{ ...head, inboundAcl: [...existing, toRuntimeAcl(edit.rule)] }, ...rest],
      },
    };
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}

registerReducer('node.acl.add', (snapshot, edit) =>
  applyRuntimeAclToFirstInterface(
    nodeRuleAdd(snapshot, edit.target.nodeId, 'sandboxAclRules', edit.rule),
    edit,
  ),
);
registerReducer('node.acl.remove', (snapshot, edit) =>
  nodeRuleRemove(snapshot, edit.target.nodeId, 'sandboxAclRules', edit.ruleId),
);
registerReducer('node.acl.edit', (snapshot, edit) =>
  nodeRuleEdit(snapshot, edit.target.nodeId, 'sandboxAclRules', edit.ruleId, edit.after),
);
