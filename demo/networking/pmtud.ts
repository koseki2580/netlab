/**
 * Path MTU discovery (RFC 1191) as the MTU lesson reads it from the simulator:
 * the echo it sends, the "fragmentation needed" answer in a trace, and the
 * path MTU the sender then remembers.
 */
import type { SimulationEngine } from '../../src/simulation/SimulationEngine';
import type { InFlightPacket } from '../../src/types/packets';
import type { PacketTrace } from '../../src/types/simulation';
import type { NetworkTopology } from '../../src/types/topology';

const IP_HEADER_BYTES = 20;
const ICMP_HEADER_BYTES = 8;

/** The lesson's sender. */
export const PMTUD_SENDER = 'host-a';

/** An ICMP echo from Host A to Host B carrying `dataBytes` of data. */
export function buildEchoPacket(
  topology: NetworkTopology,
  df: boolean,
  dataBytes: number,
): InFlightPacket | null {
  const srcNode = topology.nodes.find((node) => node.id === PMTUD_SENDER);
  const dstNode = topology.nodes.find((node) => node.id === 'host-b');
  const srcIp = srcNode?.data.ip;
  const dstIp = dstNode?.data.ip;
  const srcMac = srcNode?.data.mac;

  if (
    !srcNode ||
    !dstNode ||
    typeof srcIp !== 'string' ||
    typeof dstIp !== 'string' ||
    typeof srcMac !== 'string'
  ) {
    return null;
  }

  return {
    id: `mtu-frag-${Date.now()}-${dataBytes}`,
    srcNodeId: srcNode.id,
    dstNodeId: dstNode.id,
    currentDeviceId: srcNode.id,
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
    frame: {
      layer: 'L2',
      srcMac,
      dstMac: '00:00:00:00:00:00',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp,
        dstIp,
        ttl: 64,
        protocol: 1,
        flags: { df, mf: false },
        payload: {
          layer: 'L4',
          type: 8,
          code: 0,
          checksum: 0,
          identifier: 1,
          sequenceNumber: 1,
          data: 'x'.repeat(dataBytes),
        },
      },
    },
  };
}

/** The router that threw the packet away with "fragmentation needed", and the MTU it reported. */
export function readFragNeeded(
  trace: PacketTrace,
): { routerLabel: string; reportedMtu: number } | null {
  const hop = trace.hops.find((h) => h.reason === 'fragmentation-needed');
  if (!hop || hop.nextHopMtu === undefined) return null;
  return { routerLabel: hop.nodeLabel, reportedMtu: hop.nextHopMtu };
}

/** The path MTU the sender has learned for `dstIp`, or null while it has learned none. */
export function pathMtuOf(engine: SimulationEngine, dstIp: string): number | null {
  return engine.getPathMtuCache(PMTUD_SENDER).snapshot()[dstIp] ?? null;
}

/** The echo data that makes the whole IP packet exactly `mtu` bytes. */
export function pmtudDataBytes(mtu: number): number {
  return mtu - IP_HEADER_BYTES - ICMP_HEADER_BYTES;
}
