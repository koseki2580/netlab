/**
 * Build a packet from plain fields, send it on a fresh engine, and report what
 * the simulator did with it as facts.
 *
 * Read-only towards the simulator: nothing here changes engine behaviour. What
 * each fact means, and where the engine differs from a real network, is pinned
 * in `contract.test.ts` and explained in `README.md`.
 */

import { HookEngine } from '../../src/hooks/HookEngine';
import { packetSizeBytes } from '../../src/simulation/fragmentation';
import { Reassembler } from '../../src/simulation/Reassembler';
import { MainThreadEngine } from '../../src/simulation/worker/MainThreadEngine';
import type { AclMatchInfo } from '../../src/types/acl';
import {
  isIcmpMessage,
  type InFlightPacket,
  type IpPacket,
  type Ipv6Packet,
} from '../../src/types/packets';
import type { PacketHop, PacketTrace } from '../../src/types/simulation';
import type { NetworkTopology } from '../../src/types/topology';
import { readFacts } from '../exercises/grade/probe';

/** A MAC the engine treats as "not filled in": it resolves the real one itself. */
export const UNSET_MAC = '00:00:00:00:00:00';
export const BROADCAST_MAC = 'ff:ff:ff:ff:ff:ff';
const IP_HEADER_BYTES = 20;

export type Transport =
  | { readonly kind: 'icmp-echo'; readonly dataBytes?: number }
  | { readonly kind: 'tcp'; readonly srcPort?: number; readonly dstPort: number }
  | {
      readonly kind: 'udp';
      readonly srcPort?: number;
      readonly dstPort: number;
      readonly dataBytes?: number;
    }
  | { readonly kind: 'raw'; readonly dataBytes: number };

/** Every field an exercise may let a learner edit. Omitted fields take the defaults below. */
export interface PacketFields {
  /** Packet id. Defaults to a fixed string, so the same fields give the same packet. */
  readonly id?: string;
  /** The node that sends. */
  readonly from: string;
  /** `dstNodeId`: the only node at which the engine will deliver (see the contract, question 1). */
  readonly to: string;
  readonly srcIp: string;
  readonly dstIp: string;
  /** Default `UNSET_MAC`: the engine fills in the sender's own MAC. */
  readonly srcMac?: string;
  /** Default `UNSET_MAC`: the engine resolves the next hop's MAC. */
  readonly dstMac?: string;
  /** Default 64. */
  readonly ttl?: number;
  /** IP protocol number. Default: the one matching `transport` (1, 6, 17; 255 for raw). */
  readonly protocol?: number;
  readonly df?: boolean;
  readonly mf?: boolean;
  /** In 8-byte units, as on the wire. */
  readonly fragmentOffset?: number;
  readonly identification?: number;
  readonly totalLength?: number;
  /** Default: an ICMP echo request with no data. */
  readonly transport?: Transport;
  /** Internal engine field: the whole transport payload, which reassembly restores from. */
  readonly reassemblyPayload?: IpPacket['reassemblyPayload'];
}

function transportPayload(transport: Transport): IpPacket['payload'] {
  switch (transport.kind) {
    case 'icmp-echo':
      return {
        layer: 'L4',
        type: 8,
        code: 0,
        checksum: 0,
        identifier: 1,
        sequenceNumber: 1,
        ...(transport.dataBytes !== undefined ? { data: 'x'.repeat(transport.dataBytes) } : {}),
      };
    case 'tcp':
      return {
        layer: 'L4',
        srcPort: transport.srcPort ?? 49152,
        dstPort: transport.dstPort,
        seq: 0,
        ack: 0,
        flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
        payload: { layer: 'raw', data: '' },
      };
    case 'udp':
      return {
        layer: 'L4',
        srcPort: transport.srcPort ?? 49152,
        dstPort: transport.dstPort,
        payload: { layer: 'raw', data: 'x'.repeat(transport.dataBytes ?? 0) },
      };
    case 'raw':
      return { layer: 'raw', data: 'x'.repeat(transport.dataBytes) };
  }
}

const PROTOCOL_OF: Record<Transport['kind'], number> = {
  'icmp-echo': 1,
  tcp: 6,
  udp: 17,
  raw: 255,
};

export function buildPacket(fields: PacketFields): InFlightPacket {
  const transport = fields.transport ?? { kind: 'icmp-echo' };
  const flags =
    fields.df !== undefined || fields.mf !== undefined
      ? { flags: { df: fields.df ?? false, mf: fields.mf ?? false } }
      : {};
  return {
    id: fields.id ?? 'packet-lab',
    srcNodeId: fields.from,
    dstNodeId: fields.to,
    currentDeviceId: fields.from,
    ingressPortId: '',
    path: [],
    timestamp: 0,
    frame: {
      layer: 'L2',
      srcMac: fields.srcMac ?? UNSET_MAC,
      dstMac: fields.dstMac ?? UNSET_MAC,
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: fields.srcIp,
        dstIp: fields.dstIp,
        ttl: fields.ttl ?? 64,
        protocol: fields.protocol ?? PROTOCOL_OF[transport.kind],
        ...flags,
        ...(fields.fragmentOffset !== undefined ? { fragmentOffset: fields.fragmentOffset } : {}),
        ...(fields.identification !== undefined ? { identification: fields.identification } : {}),
        ...(fields.totalLength !== undefined ? { totalLength: fields.totalLength } : {}),
        payload: transportPayload(transport),
        ...(fields.reassemblyPayload !== undefined
          ? { reassemblyPayload: fields.reassemblyPayload }
          : {}),
      },
    },
  };
}

/** One hop of the trace together with the packet as it was at that hop. */
export interface HopView {
  readonly step: number;
  readonly nodeId: string;
  readonly event: PacketHop['event'];
  readonly action: PacketHop['action'] | null;
  readonly reason: string | null;
  /** The frame at this hop: on a forward, as it LEAVES the node. */
  readonly srcMac: string;
  readonly dstMac: string;
  readonly srcIp: string;
  readonly dstIp: string;
  readonly ttl: number;
  /** IP protocol number (the hop itself only carries a name). */
  readonly protocol: number;
  readonly srcPort: number | null;
  readonly dstPort: number | null;
  readonly identification: number | null;
  /** IP header + payload, in bytes. */
  readonly totalLength: number;
  /** In 8-byte units, as the engine stores it. */
  readonly fragmentOffset: number;
  readonly df: boolean;
  readonly mf: boolean;
  /** True for hops of a packet the engine generated itself (an ICMP error). */
  readonly generated: boolean;
  readonly hop: PacketHop;
  readonly packet: InFlightPacket;
}

/** One fragment as a router emitted it. */
export interface FragmentView {
  /** The router that cut it. */
  readonly nodeId: string;
  readonly index: number;
  /** How many pieces this router cut the packet it held into. */
  readonly count: number;
  readonly mtu: number;
  readonly identification: number;
  readonly totalLength: number;
  /** `totalLength` minus the 20-byte IP header. */
  readonly payloadBytes: number;
  /** In 8-byte units. */
  readonly fragmentOffset: number;
  readonly offsetBytes: number;
  readonly mf: boolean;
  readonly df: boolean;
}

/** An ICMP error the engine generated in answer to the packet. */
export interface IcmpView {
  /** The router that generated it. */
  readonly fromNodeId: string;
  readonly srcIp: string;
  readonly dstIp: string;
  readonly type: number;
  readonly code: number;
  /** Type 3 code 4 only: the MTU of the link the packet did not fit. */
  readonly nextHopMtu: number | null;
  /** Whether it reached a node, and which. */
  readonly deliveredTo: string | null;
  readonly drop: { readonly nodeId: string; readonly reason: string } | null;
}

export interface PacketFacts {
  /**
   * `pending`: nothing was dropped, but all that arrived were fragments still
   * waiting for the rest (the engine's own trace status says `delivered` then).
   * `engine-error`: the engine threw; see `error`.
   */
  readonly status: 'delivered' | 'dropped' | 'pending' | 'engine-error';
  /** The packet (whole, or reassembled) was handed to a node. */
  readonly delivered: boolean;
  readonly deliveredTo: string | null;
  /** The first drop of the packet itself (not of an ICMP error it caused). */
  readonly drop: { readonly nodeId: string; readonly reason: string } | null;
  /** Nodes the packet visited, in order, up to its first deliver or drop. */
  readonly path: readonly string[];
  readonly edges: readonly string[];
  /** Hops of the packet itself, ARP exchanges left out. */
  readonly hops: readonly HopView[];
  /** Every fragment any router emitted, in the order the trace records them. */
  readonly fragments: readonly FragmentView[];
  /** Set when the destination put fragments back together. */
  readonly reassembled: {
    readonly nodeId: string;
    readonly fragmentCount: number;
    /** Size of what came out. Equal to the size sent only if every piece was used. */
    readonly totalLength: number;
  } | null;
  readonly icmp: readonly IcmpView[];
  readonly aclMatches: readonly (AclMatchInfo & { readonly nodeId: string })[];
  /** The engine's trace, ICMP errors merged in after the packet's own hops. Null on an engine error. */
  readonly trace: PacketTrace | null;
  readonly error?: string;
}

function ipOf(packet: InFlightPacket): IpPacket | Ipv6Packet {
  return packet.frame.payload;
}

function view(hop: PacketHop, packet: InFlightPacket, generated: boolean): HopView {
  const ip = ipOf(packet);
  return {
    step: hop.step,
    nodeId: hop.nodeId,
    event: hop.event,
    action: hop.action ?? null,
    reason: hop.reason ?? null,
    srcMac: packet.frame.srcMac,
    dstMac: packet.frame.dstMac,
    srcIp: ip.srcIp,
    dstIp: ip.dstIp,
    ttl: ip.ttl,
    protocol: ip.protocol,
    srcPort: hop.srcPort ?? null,
    dstPort: hop.dstPort ?? null,
    identification: ip.identification ?? null,
    totalLength: packetSizeBytes(ip as IpPacket),
    fragmentOffset: ip.fragmentOffset ?? 0,
    df: ip.flags?.df ?? false,
    mf: ip.flags?.mf ?? false,
    generated,
    hop,
    packet,
  };
}

const isArp = (hop: PacketHop): boolean => hop.event === 'arp-request' || hop.event === 'arp-reply';

function readIcmp(generated: readonly HopView[]): IcmpView[] {
  const byPacket = new Map<string, HopView[]>();
  for (const entry of generated) {
    byPacket.set(entry.packet.id, [...(byPacket.get(entry.packet.id) ?? []), entry]);
  }
  return [...byPacket.values()].flatMap((entries) => {
    const first = entries[0];
    const payload = first ? ipOf(first.packet).payload : undefined;
    if (!first || !payload || !isIcmpMessage(payload)) return [];
    const deliver = entries.find((entry) => entry.event === 'deliver');
    const drop = entries.find((entry) => entry.event === 'drop');
    return [
      {
        fromNodeId: first.packet.srcNodeId,
        srcIp: first.srcIp,
        dstIp: first.dstIp,
        type: payload.type,
        code: payload.code,
        // The engine carries the next-hop MTU of a Frag-Needed in `sequenceNumber`.
        nextHopMtu:
          payload.type === 3 && payload.code === 4 ? (payload.sequenceNumber ?? null) : null,
        deliveredTo: deliver?.nodeId ?? null,
        drop: drop ? { nodeId: drop.nodeId, reason: drop.reason ?? '' } : null,
      },
    ];
  });
}

/** Read the facts out of one trace and the packet snapshots recorded hop by hop. */
export function readPacketFacts(
  packetId: string,
  trace: PacketTrace,
  snapshots: readonly InFlightPacket[],
): PacketFacts {
  const all = trace.hops.flatMap((hop, index) => {
    const packet = snapshots[index];
    return packet && !isArp(hop) ? [view(hop, packet, packet.id !== packetId)] : [];
  });
  const own = all.filter((entry) => !entry.generated);
  const probe = readFacts([{ ...trace, hops: own.map((entry) => entry.hop) }], false);
  const arrival = own.find(
    (entry) => entry.event === 'deliver' && entry.action !== 'reassembly-pending',
  );
  const complete = own.find((entry) => entry.action === 'reassembly-complete');
  const firstDrop = own.find((entry) => entry.event === 'drop');
  const end = own.findIndex((entry) => entry.event === 'deliver' || entry.event === 'drop');
  const walked = own.slice(0, end === -1 ? own.length : end + 1);

  return {
    status: arrival ? 'delivered' : firstDrop ? 'dropped' : 'pending',
    delivered: arrival !== undefined,
    deliveredTo: arrival?.nodeId ?? null,
    drop: firstDrop ? { nodeId: firstDrop.nodeId, reason: firstDrop.reason ?? '' } : null,
    path: walked.map((entry) => entry.nodeId).filter((id, index, ids) => ids[index - 1] !== id),
    edges: walked
      .flatMap((entry) => (entry.hop.activeEdgeId !== undefined ? [entry.hop.activeEdgeId] : []))
      .filter((id, index, ids) => ids[index - 1] !== id),
    hops: own,
    fragments: own.flatMap((entry) =>
      entry.action === 'fragment'
        ? [
            {
              nodeId: entry.nodeId,
              index: entry.hop.fragmentIndex ?? 0,
              count: entry.hop.fragmentCount ?? 0,
              mtu: entry.hop.nextHopMtu ?? 0,
              identification: entry.identification ?? 0,
              totalLength: entry.totalLength,
              payloadBytes: entry.totalLength - IP_HEADER_BYTES,
              fragmentOffset: entry.fragmentOffset,
              offsetBytes: entry.fragmentOffset * 8,
              mf: entry.mf,
              df: entry.df,
            },
          ]
        : [],
    ),
    reassembled: complete
      ? {
          nodeId: complete.nodeId,
          fragmentCount: complete.hop.fragmentCount ?? 0,
          totalLength: complete.totalLength,
        }
      : null,
    icmp: readIcmp(all.filter((entry) => entry.generated)),
    aclMatches: probe.aclMatches,
    trace,
  };
}

function failed(error: unknown): PacketFacts {
  return {
    status: 'engine-error',
    delivered: false,
    deliveredTo: null,
    drop: null,
    path: [],
    edges: [],
    hops: [],
    fragments: [],
    reassembled: null,
    icmp: [],
    aclMatches: [],
    trace: null,
    error: error instanceof Error ? error.message : String(error),
  };
}

function withEngine<T>(
  prepared: NetworkTopology,
  run: (engine: MainThreadEngine) => Promise<T>,
): Promise<T> {
  const engine = new MainThreadEngine(prepared, new HookEngine());
  return run(engine).finally(() => {
    try {
      engine.dispose();
    } catch {
      // Disposal must not turn a finished send into a failure.
    }
  });
}

/**
 * Send one packet on a fresh engine. Never throws and never rejects.
 *
 * `pipeline` (default) forwards the packet exactly as built and commits nothing.
 * `send` is what the app's Send button does (`engine.send`): it first replaces
 * the packet's source IP with the sending node's own address.
 */
export async function sendPacket(
  prepared: NetworkTopology,
  packet: InFlightPacket,
  via: 'pipeline' | 'send' = 'pipeline',
): Promise<PacketFacts> {
  try {
    return await withEngine(prepared, async (engine) => {
      if (via === 'pipeline') {
        const result = await engine.pipeline.precompute(packet, undefined, { probe: true });
        return readPacketFacts(packet.id, result.trace, result.snapshots);
      }
      await engine.send(packet);
      const trace = engine.getState().traces.find((entry) => entry.packetId === packet.id);
      if (!trace) throw new Error('engine.send committed no trace');
      engine.selectTrace(packet.id);
      const snapshots = trace.hops.flatMap((_, step) => {
        engine.selectHop(step);
        const snapshot = engine.getState().selectedPacket;
        return snapshot ? [snapshot] : [];
      });
      return readPacketFacts(packet.id, trace, snapshots);
    });
  } catch (error) {
    return failed(error);
  }
}

/** Send several packets, in order, on ONE fresh engine. Never throws and never rejects. */
export async function sendPackets(
  prepared: NetworkTopology,
  packets: readonly InFlightPacket[],
): Promise<PacketFacts[]> {
  try {
    return await withEngine(prepared, async (engine) => {
      const facts: PacketFacts[] = [];
      for (const packet of packets) {
        const result = await engine.pipeline.precompute(packet, undefined, { probe: true });
        facts.push(readPacketFacts(packet.id, result.trace, result.snapshots));
      }
      return facts;
    });
  } catch (error) {
    return packets.map(() => failed(error));
  }
}

/** One piece of a split as a learner would state it. */
export interface FragmentStatement {
  /** In 8-byte units, as on the wire. */
  readonly fragmentOffset: number;
  /** Bytes carried after the 20-byte IP header. */
  readonly payloadBytes: number;
  readonly mf: boolean;
}

/**
 * Turn a stated split of `whole` into fragments the engine's reassembler can
 * judge. The piece at offset 0 carries the whole transport payload in
 * `reassemblyPayload`, as a fragment cut by a router does; without it the
 * reassembler never completes (see the contract, question 8).
 */
export function fragmentsFromStatement(
  whole: InFlightPacket,
  pieces: readonly FragmentStatement[],
): IpPacket[] {
  const ip = whole.frame.payload as IpPacket;
  const original = ip.payload;
  return pieces.map((piece) => ({
    ...ip,
    identification: ip.identification ?? 1,
    flags: { df: ip.flags?.df ?? false, mf: piece.mf },
    fragmentOffset: piece.fragmentOffset,
    totalLength: IP_HEADER_BYTES + piece.payloadBytes,
    payload: { layer: 'raw', data: 'x'.repeat(piece.payloadBytes) },
    ...(piece.fragmentOffset === 0 && original.layer !== 'raw'
      ? { reassemblyPayload: original }
      : {}),
  }));
}

/**
 * Give a set of fragments, in order, to the engine's own reassembler (the one
 * a destination host runs). Returns the reassembled IP packet, or null when
 * the set never completes.
 */
export function reassemble(fragments: readonly IpPacket[]): IpPacket | null {
  const reassembler = new Reassembler();
  let whole: IpPacket | null = null;
  for (const fragment of fragments) {
    whole = reassembler.accept(fragment);
  }
  return whole;
}
