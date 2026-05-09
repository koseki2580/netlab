import { EditSession } from '../../../sandbox/EditSession';
import type { Edit } from '../../../sandbox/edits';
import type { TraceAnnotation } from '../../../sandbox/annotations/types';

const NOOP_EDIT: Edit = { kind: 'noop' };

const MTU_EDIT: Edit = {
  kind: 'interface.mtu',
  target: { kind: 'interface', nodeId: 'router-r1', ifaceId: 'eth0' },
  before: 1500,
  after: 800,
};

const PARAM_EDIT: Edit = {
  kind: 'param.set',
  key: 'tcp.mss',
  before: 1460,
  after: 1200,
};

const TRAFFIC_EDIT: Edit = {
  kind: 'traffic.launch',
  flow: {
    id: 'flow-1',
    srcNodeId: 'host-a',
    dstNodeId: 'host-b',
    protocol: 'icmp',
  },
};

export function emptySession(): EditSession {
  return EditSession.empty();
}

export function singleEditSession(): EditSession {
  return EditSession.empty().push(MTU_EDIT);
}

export function threeEditsSession(): EditSession {
  return EditSession.empty().push(MTU_EDIT).push(PARAM_EDIT).push(TRAFFIC_EDIT);
}

export function midReplaySession(): EditSession {
  // Three edits applied, then undo once — head < length, redo available.
  return EditSession.empty().push(MTU_EDIT).push(PARAM_EDIT).push(TRAFFIC_EDIT).undo();
}

export function noopSession(): EditSession {
  return EditSession.empty().push(NOOP_EDIT);
}

export const EDITS = Object.freeze({
  noop: NOOP_EDIT,
  mtu: MTU_EDIT,
  param: PARAM_EDIT,
  traffic: TRAFFIC_EDIT,
});

export function annotationFixtures(): readonly TraceAnnotation[] {
  return Object.freeze([
    Object.freeze({
      id: 'ann-1',
      traceEventId: 'evt-1',
      author: 'scenario',
      content: 'Watch ARP resolve the next-hop MAC.',
      createdAt: 1714694400000,
      color: '#facc15',
    }),
    Object.freeze({
      id: 'ann-2',
      traceEventId: 'evt-2',
      author: 'user',
      content: 'TTL is 64 here.',
      createdAt: 1714694460000,
    }),
  ]) satisfies readonly TraceAnnotation[];
}

export function annotationEditsSession(): EditSession {
  return annotationFixtures().reduce(
    (session, annotation) => session.push({ kind: 'trace.annotate.add', annotation }),
    EditSession.empty(),
  );
}
