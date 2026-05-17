import type { SimulationSnapshot } from '../types';
import type { Edit } from './types';
import { registerReducer } from './registry';
import { replaceNode, withTopology } from './helpers';

function isValidMtu(value: number): boolean {
  return Number.isInteger(value) && value >= 68 && value <= 9216;
}
function interfaceMtu(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'interface.mtu' }>,
) {
  if (!isValidMtu(edit.after)) return snapshot;

  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => {
    const interfaces = node.data.interfaces ?? [];
    let changed = false;
    const nextInterfaces = interfaces.map((iface) => {
      if (iface.id === edit.target.ifaceId) {
        changed = true;
        return { ...iface, mtu: edit.after };
      }

      const subInterfaces = iface.subInterfaces ?? [];
      const nextSubInterfaces = subInterfaces.map((subInterface) => {
        if (subInterface.id !== edit.target.ifaceId) return subInterface;
        changed = true;
        return { ...subInterface, mtu: edit.after };
      });

      return changed && nextSubInterfaces !== subInterfaces
        ? { ...iface, subInterfaces: nextSubInterfaces }
        : iface;
    });

    return changed ? { ...node, data: { ...node.data, interfaces: nextInterfaces } } : node;
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}

registerReducer('interface.mtu', interfaceMtu);
