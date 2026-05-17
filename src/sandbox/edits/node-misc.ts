import type { SimulationSnapshot } from '../types';
import type { Edit } from './types';
import { registerReducer } from './registry';
import { replaceNode, withTopology } from './helpers';

function nodeVrrp(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'node.vrrp' }>) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => ({
    ...node,
    data: {
      ...node.data,
      interfaces: (node.data.interfaces ?? []).map((iface) => {
        if (iface.id !== edit.target.ifaceId) return iface;
        if (edit.after === null) {
          const { vrrp: _vrrp, ...restIface } = iface;
          return restIface;
        }
        return { ...iface, vrrp: edit.after };
      }),
    },
  }));

  return topology ? withTopology(snapshot, topology) : snapshot;
}
function nodeWifi(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'node.wifi' }>) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => {
    if (edit.after === null) {
      const data = { ...node.data };
      delete data.wifi;
      return { ...node, data };
    }
    return {
      ...node,
      data: {
        ...node.data,
        wifi: edit.after,
      },
    };
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}
function nodeGre(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'node.gre' }>) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => ({
    ...node,
    data: {
      ...node.data,
      interfaces: (node.data.interfaces ?? []).map((iface) => {
        if (iface.id !== edit.target.ifaceId) return iface;
        if (edit.after === null) {
          const { greTunnel: _greTunnel, ...restIface } = iface;
          return restIface;
        }
        return { ...iface, greTunnel: edit.after };
      }),
    },
  }));

  return topology ? withTopology(snapshot, topology) : snapshot;
}
function nodeMplsVrf(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'node.mpls-vrf' }>) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => {
    const existing = node.data.vrfs ?? [];
    const vrfs =
      edit.after === null
        ? existing.filter((vrf) => edit.before === null || vrf.name !== edit.before.name)
        : [...existing.filter((vrf) => vrf.name !== edit.after!.name), edit.after];
    if (vrfs.length === 0) {
      const { vrfs: _vrfs, ...data } = node.data;
      return { ...node, data };
    }
    return { ...node, data: { ...node.data, vrfs } };
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}
function nodeVxlanVni(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'node.vxlan-vni' }>,
) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => {
    if (edit.after === null) {
      const data = { ...node.data };
      delete data.vtep;
      return { ...node, data };
    }
    return {
      ...node,
      data: {
        ...node.data,
        vtep: edit.after,
      },
    };
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}
function nodeNetflow(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'node.netflow' }>) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => ({
    ...node,
    data: {
      ...node.data,
      ...(edit.after === null ? {} : { netflow: edit.after }),
    },
  }));
  if (!topology) return snapshot;
  if (edit.after === null) {
    const nodes = topology.nodes.map((node) => {
      if (node.id !== edit.target.nodeId) return node;
      const data = { ...node.data };
      delete data.netflow;
      return { ...node, data };
    });
    return withTopology(snapshot, { ...topology, nodes });
  }
  return withTopology(snapshot, topology);
}
function nodeSflow(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'node.sflow' }>) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => ({
    ...node,
    data: {
      ...node.data,
      ...(edit.after === null ? {} : { sflow: edit.after }),
    },
  }));
  if (!topology) return snapshot;
  if (edit.after === null) {
    const nodes = topology.nodes.map((node) => {
      if (node.id !== edit.target.nodeId) return node;
      const data = { ...node.data };
      delete data.sflow;
      return { ...node, data };
    });
    return withTopology(snapshot, { ...topology, nodes });
  }
  return withTopology(snapshot, topology);
}

registerReducer('node.vrrp', nodeVrrp);
registerReducer('node.wifi', nodeWifi);
registerReducer('node.gre', nodeGre);
registerReducer('node.mpls-vrf', nodeMplsVrf);
registerReducer('node.vxlan-vni', nodeVxlanVni);
registerReducer('node.netflow', nodeNetflow);
registerReducer('node.sflow', nodeSflow);
