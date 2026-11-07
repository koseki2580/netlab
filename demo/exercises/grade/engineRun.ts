/**
 * Running the real simulator for a judge, and the readings both judges share.
 *
 * Both the device exercises (`probe.ts`: a ping or a TCP handshake between two
 * nodes) and the packet exercises (`packet-lab/facts.ts`: one hand-built
 * packet) run on a fresh engine per send, disposed afterwards: engines keep
 * ARP caches, NAT tables and connection tracking between packets, and a
 * judgement must not depend on what was sent before. The facts each one reads
 * keep their own shape, because each is pinned by its own contract test
 * (`engineContract.test.ts`, `packet-lab/contract.test.ts`).
 */

import { HookEngine } from '../../../src/hooks/HookEngine';
import { MainThreadEngine } from '../../../src/simulation/worker/MainThreadEngine';
import type { PacketHop } from '../../../src/types/simulation';
import type { NetworkTopology, TopologySnapshot } from '../../../src/types/topology';
import { isNeighborLookupHop } from '../../../src/types/simulation';

type Nodes = Pick<TopologySnapshot, 'nodes'>;

/**
 * Run `run` on a fresh engine for `prepared` and dispose of it afterwards,
 * whatever happened. A failure to dispose is not a failure of the run.
 * Rejects when building the engine or `run` does: callers turn that into
 * their own "the engine stopped" result.
 */
export async function withEngine<T>(
  prepared: NetworkTopology,
  run: (engine: MainThreadEngine) => Promise<T>,
): Promise<T> {
  const engine = new MainThreadEngine(prepared, new HookEngine());
  try {
    return await run(engine);
  } finally {
    try {
      engine.dispose();
    } catch {
      // Disposal must not turn a finished run into a failure.
    }
  }
}

/** An ARP exchange happens beside a packet's path, not along it. */
export const isArpHop = (hop: PacketHop): boolean => isNeighborLookupHop(hop);

/**
 * The rows of the packet itself: no ARP rows, and a sender that asked first has
 * one row, not `create` and then the `forward` that follows its exchange.
 */
export const packetRows = (hops: readonly PacketHop[]): PacketHop[] =>
  hops
    .filter((hop) => !isArpHop(hop))
    .filter(
      (hop, index, rows) =>
        !(
          hop.event === 'forward' &&
          rows[index - 1]?.event === 'create' &&
          rows[index - 1]?.nodeId === hop.nodeId
        ),
    );

/** The address a probe uses for a node: a host's `ip`, else a router's first interface. */
export function addressOf(topology: Nodes, nodeId: string): string | null {
  const node = topology.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return null;
  if (typeof node.data.ip === 'string' && node.data.ip.length > 0) return node.data.ip;
  const first = node.data.interfaces?.[0]?.ipAddress;
  return first !== undefined && first.length > 0 ? first : null;
}

/** The node that holds `ip`, as a host address or on a side of a router; null when none does. */
export function ownerOf(topology: Nodes, ip: string): string | null {
  const node = topology.nodes.find(
    (candidate) =>
      candidate.data.ip === ip ||
      (candidate.data.interfaces ?? []).some((side) => side.ipAddress === ip),
  );
  return node?.id ?? null;
}

/** What an engine failure is reported as. */
export const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
