/**
 * Causes the grader can read off the topology, without running anything.
 *
 * The simulator's drop reason often cannot tell a learner what is wrong: a
 * host whose cable is out is reported as `no-route`, and two devices sharing
 * an address as a loop. The topology can. `diagnose` is asked only about a
 * probe that did not arrive, and answers only when the finding is certain to
 * concern that probe; otherwise it returns null and the drop reason is kept.
 *
 * In this order, the first that applies:
 *
 * 1. `cable-down` — following the cables that are plugged in, the target
 *    cannot be reached from the source, and it could be if the unplugged ones
 *    were in. (A cable that is out elsewhere is not mentioned.)
 * 2. `duplicate-address` — the source or the target of the probe holds an
 *    address another device (a host, or a side of a router) holds too.
 * 3. `wrong-network` — on the LAN of the source or of the target, exactly one
 *    address lies outside the network all the others (at least two) share,
 *    and it belongs to the source, to the target, or to the router's side on
 *    that LAN. Two devices alone on a cable are never judged: which of them is
 *    off cannot be told.
 * 4. `duplicate-address` — the router's side on the LAN of the source or of
 *    the target shares its address with another device.
 */

import { ipToInt } from '../../../src/utils/cidr';
import type { NetlabEdge, TopologySnapshot } from '../../../src/types/topology';
import { sideWords } from '../model/names';
import type { CheckEvidence } from '../model/types';
import type { DiagnosisDetail } from './reasons';
import { labelOf } from './traceFacts';
import { isDottedQuad } from '../model/text';

export interface Diagnosis {
  /** For the message. */
  readonly detail: DiagnosisDetail;
  /** For the page: what to point at. Merged into the evidence of the check. */
  readonly evidence: Pick<CheckEvidence, 'diagnosis' | 'edgeId' | 'address' | 'relatedNodeIds'>;
}

type Topology = Pick<TopologySnapshot, 'nodes' | 'edges'>;

const isAddress = isDottedQuad;

const isDown = (edge: NetlabEdge): boolean => edge.data?.state === 'down';

/** Hosts end a cable run; only switches and routers pass things on. */
function forwards(topology: Topology, nodeId: string): boolean {
  const role = topology.nodes.find((node) => node.id === nodeId)?.data.role;
  return role === 'switch' || role === 'router';
}

// --- 1. A cable that is out ---------------------------------------------------

/**
 * The cables from `from` to `to`, fewest first, using only cables `usable`
 * accepts; null when there is no such way.
 */
function cablesBetween(
  topology: Topology,
  from: string,
  to: string,
  usable: (edge: NetlabEdge) => boolean,
): NetlabEdge[] | null {
  const cameBy = new Map<string, { readonly edge: NetlabEdge; readonly prev: string }>();
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    if (current === to) {
      const way: NetlabEdge[] = [];
      for (let step = cameBy.get(to); step; step = cameBy.get(step.prev)) way.unshift(step.edge);
      return way;
    }
    if (current !== from && !forwards(topology, current)) continue;
    for (const edge of topology.edges) {
      if (!usable(edge)) continue;
      const next =
        edge.source === current ? edge.target : edge.target === current ? edge.source : undefined;
      if (next === undefined || seen.has(next)) continue;
      seen.add(next);
      cameBy.set(next, { edge, prev: current });
      queue.push(next);
    }
  }
  return null;
}

function cableDown(topology: Topology, from: string, to: string): Diagnosis | null {
  if (!topology.edges.some(isDown)) return null;
  if (cablesBetween(topology, from, to, (edge) => !isDown(edge)) !== null) return null;
  const unplugged = cablesBetween(topology, from, to, () => true)?.find(isDown);
  if (!unplugged) return null;
  return {
    detail: { kind: 'cable-down' },
    evidence: { diagnosis: 'cable-down', edgeId: unplugged.id },
  };
}

// --- Addresses ------------------------------------------------------------------

interface Holder {
  readonly nodeId: string;
  /** Set for a side of a router. */
  readonly ifaceId?: string;
  readonly address: string;
  readonly prefixLength?: number;
}

const sameHolder = (left: Holder, right: Holder): boolean =>
  left.nodeId === right.nodeId && left.ifaceId === right.ifaceId;

function holdersOf(topology: Topology): Holder[] {
  return topology.nodes.flatMap((node): Holder[] => {
    if (node.data.role === 'router') {
      return (node.data.interfaces ?? [])
        .filter((side) => isAddress(side.ipAddress))
        .map((side) => ({
          nodeId: node.id,
          ifaceId: side.id,
          address: side.ipAddress,
          prefixLength: side.prefixLength,
        }));
    }
    const ip = node.data.ip;
    return typeof ip === 'string' && isAddress(ip) ? [{ nodeId: node.id, address: ip }] : [];
  });
}

/** The address a holder has in `topology`, or undefined. */
function addressIn(topology: Topology, holder: Holder): string | undefined {
  return holdersOf(topology).find((candidate) => sameHolder(candidate, holder))?.address;
}

/**
 * The LAN `nodeId` is plugged into: every host and router side reached over
 * plugged-in cables and switches, without passing through a router. Null when
 * a switch on it sorts its ports into VLANs: then one cable run holds several
 * networks and "the neighbours" are not the devices walked here.
 */
function lanOf(topology: Topology, nodeId: string, holders: readonly Holder[]): Holder[] | null {
  const byId = new Map(topology.nodes.map((node) => [node.id, node]));
  const start = byId.get(nodeId);
  if (!start || start.data.role === 'router' || start.data.role === 'switch') return null;
  const members: Holder[] = holders.filter((holder) => holder.nodeId === nodeId);
  const seen = new Set([nodeId]);
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    for (const edge of topology.edges) {
      if (isDown(edge)) continue;
      const [otherId, handle] =
        edge.source === current
          ? [edge.target, edge.targetHandle]
          : edge.target === current
            ? [edge.source, edge.sourceHandle]
            : [undefined, undefined];
      if (otherId === undefined) continue;
      const other = byId.get(otherId);
      if (!other) continue;
      if (other.data.role === 'router') {
        const side = holders.find(
          (holder) => holder.nodeId === otherId && holder.ifaceId === handle,
        );
        if (side && !members.some((member) => sameHolder(member, side))) members.push(side);
        continue;
      }
      if (seen.has(otherId)) continue;
      seen.add(otherId);
      if (other.data.role === 'switch') {
        if ((other.data.ports ?? []).some((port) => port.vlanMode !== undefined)) return null;
        queue.push(otherId);
      } else {
        members.push(...holders.filter((holder) => holder.nodeId === otherId));
      }
    }
  }
  return members;
}

// --- 2 and 4. Two devices, one address ------------------------------------------

function duplicate(
  start: Topology,
  current: Topology,
  holders: readonly Holder[],
  concerns: (holder: Holder) => boolean,
  editable?: (nodeId: string) => boolean,
): Diagnosis | null {
  for (const first of holders) {
    if (!concerns(first)) continue;
    const others = holders.filter(
      (holder) => holder.address === first.address && holder.nodeId !== first.nodeId,
    );
    const second = others[0];
    if (!second) continue;
    // Who was given this address by the learner, and who had it from the start.
    const chose = (holder: Holder): boolean => addressIn(start, holder) !== holder.address;
    const [newcomer, owner] =
      chose(first) && !chose(second)
        ? [first, second]
        : chose(second) && !chose(first)
          ? [second, first]
          : [undefined, undefined];
    // Neither was chosen (the exercise started so), but only one of them can be
    // changed: then that one is told, and nobody is asked to change the other.
    const can = (entry: Holder): boolean => editable?.(entry.nodeId) ?? true;
    const [onlyOne, fixed] =
      newcomer || !editable
        ? [undefined, undefined]
        : can(first) && !can(second)
          ? [first, second]
          : can(second) && !can(first)
            ? [second, first]
            : [undefined, undefined];
    const [holder, other] =
      newcomer && owner ? [newcomer, owner] : onlyOne && fixed ? [onlyOne, fixed] : [first, second];
    return {
      detail: {
        kind: 'duplicate-address',
        address: first.address,
        holder: labelOf(current, holder.nodeId),
        other: labelOf(current, other.nodeId),
        chosen: newcomer !== undefined || onlyOne !== undefined,
      },
      evidence: {
        diagnosis: 'duplicate-address',
        address: first.address,
        relatedNodeIds: [first.nodeId, ...new Set(others.map((entry) => entry.nodeId))],
      },
    };
  }
  return null;
}

// --- 3. An address off the network of its neighbours ------------------------------

/** The one member of a LAN outside the network all the others share (with one of the others), or null. */
function oddOneOut(lan: readonly Holder[]): { odd: Holder; neighbour: Holder } | null {
  const lengths = new Set(lan.flatMap((member) => member.prefixLength ?? []));
  const [length] = lengths;
  // No router side on this LAN, or two that disagree: the size of the network is unknown.
  if (lengths.size !== 1 || length === undefined || length < 1 || length > 30) return null;
  const size = 2 ** (32 - length);
  const networks = new Map<number, Holder[]>();
  for (const member of lan) {
    const network = Math.floor(ipToInt(member.address) / size);
    networks.set(network, [...(networks.get(network) ?? []), member]);
  }
  if (networks.size !== 2) return null;
  const [small, large] = [...networks.values()].sort((left, right) => left.length - right.length);
  if (!small || !large || small.length !== 1 || large.length < 2) return null;
  const [odd] = small;
  const [neighbour] = large;
  return odd && neighbour ? { odd, neighbour } : null;
}

/** The first of the four numbers in which two addresses differ, with both values. */
function firstDifference(
  own: string,
  other: string,
): { position: 1 | 2 | 3 | 4; own: number; others: number } | null {
  const [mine, theirs] = [own.split('.').map(Number), other.split('.').map(Number)];
  for (const position of [1, 2, 3, 4] as const) {
    const [a, b] = [mine[position - 1], theirs[position - 1]];
    if (a !== undefined && b !== undefined && a !== b) return { position, own: a, others: b };
  }
  return null;
}

function peerLabel(topology: Topology, nodeId: string, handleId: string): string | null {
  for (const edge of topology.edges) {
    if (edge.source === nodeId && edge.sourceHandle === handleId) {
      return labelOf(topology, edge.target);
    }
    if (edge.target === nodeId && edge.targetHandle === handleId) {
      return labelOf(topology, edge.source);
    }
  }
  return null;
}

function wrongNetwork(
  current: Topology,
  lans: readonly (readonly Holder[])[],
  ends: readonly string[],
): Diagnosis | null {
  for (const lan of lans) {
    const found = oddOneOut(lan);
    if (!found) continue;
    const { odd, neighbour } = found;
    if (odd.ifaceId === undefined && !ends.includes(odd.nodeId)) continue;
    const peer = odd.ifaceId === undefined ? null : peerLabel(current, odd.nodeId, odd.ifaceId);
    return {
      detail: {
        kind: 'wrong-network',
        address: odd.address,
        device: labelOf(current, odd.nodeId),
        ...(odd.ifaceId !== undefined
          ? { side: sideWords(odd.ifaceId, peer === null ? null : { en: peer, ja: peer }) }
          : {}),
        ...firstDifference(odd.address, neighbour.address),
      },
      evidence: { diagnosis: 'wrong-network', address: odd.address, relatedNodeIds: [odd.nodeId] },
    };
  }
  return null;
}

// --- Addresses no probe may be trusted with ---------------------------------------

/**
 * Two devices hold one address, and one of them is an end of the probe (or the
 * address the probe is sent to). The simulator "delivers" such a probe: a
 * device pinging an address it holds itself answers at once, and a router side
 * holding a server's address answers in the server's place. Neither is the
 * destination being reached, so the grader asks this BEFORE running the probe.
 */
export function addressConflict(
  start: Topology,
  current: Topology,
  probe: { readonly from: string; readonly to: string; readonly toIp?: string },
  options: DiagnoseOptions = {},
): Diagnosis | null {
  try {
    const ends = [probe.from, probe.to];
    const found = duplicate(
      start,
      current,
      holdersOf(current),
      (holder) =>
        ends.includes(holder.nodeId) || (probe.toIp !== undefined && holder.address === probe.toIp),
      options.editable,
    );
    return found && options.unnamed === true ? unnamed(found) : found;
  } catch {
    return null;
  }
}

/** An address the learner set that stands for a whole network, or for everyone on it. */
export interface ReservedAddress {
  readonly nodeId: string;
  /** Set for a side of a router: then every probe depends on it. */
  readonly ifaceId?: string;
  readonly address: string;
  /** `network`: the part after the network's own numbers is all zeros. `broadcast`: all ones. */
  readonly which: 'network' | 'broadcast';
}

/**
 * The addresses that differ from the start and are the first or the last of
 * the network they sit on: for a router side its own "/number", for a host
 * the "/number" of the router side on its LAN. This mirrors the simulator's
 * own rule (it drops such traffic as `reserved-address`) and stays because the
 * grader needs more than the drop: it refuses before any probe is run, for
 * every goal when the address is on a side of a router, and names the address
 * and which of the two it is, none of which the drop carries.
 */
export function reservedAddresses(start: Topology, current: Topology): ReservedAddress[] {
  try {
    const holders = holdersOf(current);
    return holders.flatMap((holder): ReservedAddress[] => {
      if (addressIn(start, holder) === holder.address) return [];
      const lengths =
        holder.prefixLength !== undefined
          ? [holder.prefixLength]
          : [
              ...new Set(
                (lanOf(current, holder.nodeId, holders) ?? []).flatMap(
                  (member) => member.prefixLength ?? [],
                ),
              ),
            ];
      const [length] = lengths;
      if (lengths.length !== 1 || length === undefined || length < 1 || length > 30) return [];
      const size = 2 ** (32 - length);
      const rest = ipToInt(holder.address) % size;
      const which = rest === 0 ? 'network' : rest === size - 1 ? 'broadcast' : null;
      if (which === null) return [];
      return [
        {
          nodeId: holder.nodeId,
          ...(holder.ifaceId !== undefined ? { ifaceId: holder.ifaceId } : {}),
          address: holder.address,
          which,
        },
      ];
    });
  } catch {
    return [];
  }
}

// --- All of them ----------------------------------------------------------------

export interface DiagnoseOptions {
  /** A find-the-fault exercise: say the cause, not the device. */
  readonly unnamed?: boolean;
  /**
   * Whether the learner can change the address of a device (a side of a
   * router counts as its router). Absent: every device can be changed.
   */
  readonly editable?: (nodeId: string) => boolean;
}

/**
 * What the topology says about a probe from `from` to `to` that did not
 * arrive. `start` is the exercise before the learner touched it: it tells an
 * address the learner chose from one that was there. Never throws.
 */
export function diagnose(
  start: Topology,
  current: Topology,
  probe: { readonly from: string; readonly to: string },
  options: DiagnoseOptions = {},
): Diagnosis | null {
  const found = diagnoseNamed(start, current, probe, options.editable);
  return found && options.unnamed === true ? unnamed(found) : found;
}

/**
 * THE RULE for find-the-fault exercises (`kind: 'diagnose-repair'`): no
 * cause-first message may identify the device. Which device is at fault is
 * what the learner is asked to find, and a message that named it after one
 * miss gave the task away. The cause is still said (an address that does not
 * match, two devices with one address), and nothing points at the device: the
 * evidence carries neither its id nor its address. A cable that is out names
 * no cable in its message, and keeps its evidence.
 */
function unnamed(found: Diagnosis): Diagnosis {
  const { detail } = found;
  if (detail.kind === 'duplicate-address') {
    return {
      detail: { kind: 'unnamed', cause: 'duplicate-address' },
      evidence: { diagnosis: 'duplicate-address' },
    };
  }
  if (detail.kind === 'wrong-network') {
    return {
      detail: {
        kind: 'unnamed',
        cause: 'wrong-network',
        ...(detail.position !== undefined ? { position: detail.position } : {}),
      },
      evidence: { diagnosis: 'wrong-network' },
    };
  }
  return found;
}

function diagnoseNamed(
  start: Topology,
  current: Topology,
  probe: { readonly from: string; readonly to: string },
  editable?: (nodeId: string) => boolean,
): Diagnosis | null {
  try {
    const ends = [probe.from, probe.to];
    const cable = cableDown(current, probe.from, probe.to);
    if (cable) return cable;

    const holders = holdersOf(current);
    const own = duplicate(
      start,
      current,
      holders,
      (holder) => ends.includes(holder.nodeId),
      editable,
    );
    if (own) return own;

    const lans = ends.flatMap((nodeId) => {
      const lan = lanOf(current, nodeId, holders);
      return lan ? [lan] : [];
    });
    const off = wrongNetwork(current, lans, ends);
    if (off) return off;

    // The router's side on a LAN of the probe: everyone on that LAN depends on it.
    return duplicate(
      start,
      current,
      holders,
      (holder) =>
        lans.some((lan) =>
          lan.some((member) => member.ifaceId !== undefined && sameHolder(member, holder)),
        ),
      editable,
    );
  } catch {
    return null;
  }
}
