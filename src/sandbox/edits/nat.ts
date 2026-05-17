import type { PortForwardingRule } from '../../types/routing';
import type { SimulationSnapshot } from '../types';
import type { Edit } from './types';
import { registerReducer } from './registry';
import { nodeRuleAdd, nodeRuleEdit, nodeRuleRemove, replaceNode, withTopology } from './helpers';

function applyRuntimeNatPortForward(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'node.nat.add' }>,
): SimulationSnapshot {
  if (edit.rule.kind !== 'dnat') return snapshot;

  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => {
    const existing = node.data.portForwardingRules ?? [];
    const rule: PortForwardingRule = {
      proto: 'tcp',
      externalPort: 80,
      internalIp: edit.rule.translateTo,
      internalPort: 80,
    };
    if (existing.some((candidate) => candidate.internalIp === rule.internalIp)) return node;

    return {
      ...node,
      data: {
        ...node.data,
        portForwardingRules: [...existing, rule],
      },
    };
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}

registerReducer('node.nat.add', (snapshot, edit) =>
  applyRuntimeNatPortForward(
    nodeRuleAdd(snapshot, edit.target.nodeId, 'sandboxNatRules', edit.rule),
    edit,
  ),
);
registerReducer('node.nat.remove', (snapshot, edit) =>
  nodeRuleRemove(snapshot, edit.target.nodeId, 'sandboxNatRules', edit.ruleId),
);
registerReducer('node.nat.edit', (snapshot, edit) =>
  nodeRuleEdit(snapshot, edit.target.nodeId, 'sandboxNatRules', edit.ruleId, edit.after),
);
