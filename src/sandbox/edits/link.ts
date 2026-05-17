import { NetlabError } from '../../errors';
import type { LinkShaperConfig } from '../../types/link';
import type { SimulationSnapshot } from '../types';
import type { Edit } from './types';
import { registerReducer } from './registry';
import { replaceNode, withTopology } from './helpers';

function linkState(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'link.state' }>) {
  if (edit.before === edit.after) return snapshot;

  let changed = false;
  const edges = snapshot.topology.edges.map((edge) => {
    if (edge.id !== edit.target.edgeId) return edge;
    changed = true;
    return {
      ...edge,
      data: {
        ...(edge.data ?? {}),
        state: edit.after,
      },
    };
  });

  return changed ? withTopology(snapshot, { ...snapshot.topology, edges }) : snapshot;
}
function linkQos(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'link.qos' }>) {
  if ((edit.after.lossPct ?? 0) > 0 && edit.after.lossSeed === undefined) {
    throw new NetlabError({
      code: 'link-qos/missing-seed',
      message: `Link ${edit.target.edgeId} has lossPct but no lossSeed`,
      context: { edgeId: edit.target.edgeId },
    });
  }

  let changed = false;
  const edges = snapshot.topology.edges.map((edge) => {
    if (edge.id !== edit.target.edgeId) return edge;
    changed = true;
    return {
      ...edge,
      data: {
        ...(edge.data ?? {}),
        link: edit.after,
      },
    };
  });

  return changed ? withTopology(snapshot, { ...snapshot.topology, edges }) : snapshot;
}
function validateLinkShaper(edgeId: string, config: LinkShaperConfig): void {
  const defaultCount = config.classes.filter((klass) => klass.default === true).length;
  if (defaultCount === 0) {
    throw new NetlabError({
      code: 'link-shaper/no-default',
      message: `Link ${edgeId} shaper has no default class`,
      context: { edgeId },
    });
  }
  if (defaultCount > 1) {
    throw new NetlabError({
      code: 'link-shaper/multiple-defaults',
      message: `Link ${edgeId} shaper has multiple default classes`,
      context: { edgeId },
    });
  }

  const classIds = new Set<string>();
  const dscpValues = new Set<number>();
  let weightSum = 0;

  for (const klass of config.classes) {
    if (classIds.has(klass.id)) {
      throw new NetlabError({
        code: 'link-shaper/duplicate-class-id',
        message: `Link ${edgeId} shaper class ${klass.id} is duplicated`,
        context: { edgeId, classId: klass.id },
      });
    }
    classIds.add(klass.id);

    if (klass.weightPct < 1 || klass.weightPct > 100) {
      throw new NetlabError({
        code: 'link-shaper/weight-out-of-range',
        message: `Link ${edgeId} shaper class ${klass.id} has invalid weight`,
        context: { edgeId, classId: klass.id },
      });
    }
    weightSum += klass.weightPct;

    for (const dscp of klass.dscp) {
      if (!Number.isInteger(dscp) || dscp < 0 || dscp > 63) {
        throw new NetlabError({
          code: 'link-shaper/dscp-out-of-range',
          message: `Link ${edgeId} shaper class ${klass.id} has invalid DSCP ${dscp}`,
          context: { edgeId, classId: klass.id, dscp },
        });
      }
      if (dscpValues.has(dscp)) {
        throw new NetlabError({
          code: 'link-shaper/dscp-overlap',
          message: `Link ${edgeId} shaper has overlapping DSCP ${dscp}`,
          context: { edgeId, dscp },
        });
      }
      dscpValues.add(dscp);
    }
  }

  if (weightSum < 99 || weightSum > 101) {
    throw new NetlabError({
      code: 'link-shaper/weight-sum',
      message: `Link ${edgeId} shaper weights sum to ${weightSum}`,
      context: { edgeId, weightSum },
    });
  }
}
function linkShaper(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'link.shaper' }>) {
  if (edit.after) {
    validateLinkShaper(edit.target.edgeId, edit.after);
  }

  let changed = false;
  const edges = snapshot.topology.edges.map((edge) => {
    if (edge.id !== edit.target.edgeId) return edge;
    changed = true;
    const link = {
      ...(edge.data?.link ?? {}),
      ...(edit.after === null ? {} : { shaper: edit.after }),
    };
    if (edit.after === null) {
      delete link.shaper;
    }
    return {
      ...edge,
      data: {
        ...(edge.data ?? {}),
        link,
      },
    };
  });

  return changed ? withTopology(snapshot, { ...snapshot.topology, edges }) : snapshot;
}
function linkLacp(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'link.lacp' }>) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => ({
    ...node,
    data: {
      ...node.data,
      ports: (node.data.ports ?? []).map((port) => {
        if (port.id !== edit.portId) return port;
        if (edit.after === null) {
          const { lacp: _lacp, ...restPort } = port;
          return restPort;
        }
        return { ...port, lacp: edit.after };
      }),
    },
  }));

  return topology ? withTopology(snapshot, topology) : snapshot;
}
function linkWireless(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'link.wireless' }>,
) {
  let changed = false;
  const edges = snapshot.topology.edges.map((edge) => {
    if (edge.id !== edit.target.edgeId) return edge;
    changed = true;
    if (edit.after === null) {
      const data = { ...(edge.data ?? {}) };
      delete data.wireless;
      return { ...edge, data };
    }
    return {
      ...edge,
      data: {
        ...(edge.data ?? {}),
        wireless: edit.after,
      },
    };
  });

  return changed ? withTopology(snapshot, { ...snapshot.topology, edges }) : snapshot;
}

registerReducer('link.state', linkState);
registerReducer('link.qos', linkQos);
registerReducer('link.shaper', linkShaper);
registerReducer('link.lacp', linkLacp);
registerReducer('link.wireless', linkWireless);
