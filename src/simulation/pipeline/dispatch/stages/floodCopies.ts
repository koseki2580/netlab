import { layerRegistry } from '../../../../registry/LayerRegistry';
import type { FloodTarget } from '../../../../types/layers';
import type { FloodCopy } from '../../../../types/simulation';
import { topologyWithAddressView } from '../../../addressView';
import type { ForwardLoopShared } from '../ForwardingLoop';
import type { LoopContext } from './_shared';

/** The table of what switch `switchId` has learned, for this send. */
export function macTableFor(shared: ForwardLoopShared, switchId: string): Map<string, string> {
  shared.macTables ??= new Map();
  let table = shared.macTables.get(switchId);
  if (!table) {
    table = new Map();
    shared.macTables.set(switchId, table);
  }
  return table;
}

const notForMe = (base: Omit<FloodCopy, 'outcome'>): FloodCopy => ({
  ...base,
  outcome: 'discarded',
  reason: 'not-for-me',
});

/**
 * What becomes of each copy a switch sent out besides the one the trace
 * follows. A host or router throws a copy away: it was not for it. A switch
 * learns where the copy came from, then copies it on or sends it by a learned
 * port, and those copies are followed in turn. Nothing here adds a hop to the
 * trace; the copies are listed on the hop of the switch that made them.
 */
export async function followCopies(
  ctx: LoopContext,
  fromNodeId: string,
  targets: readonly FloodTarget[],
  visited: Set<string>,
): Promise<FloodCopy[]> {
  const out: FloodCopy[] = [];
  for (const target of targets) {
    const base = {
      fromNodeId,
      toNodeId: target.nextNodeId,
      edgeId: target.edgeId,
      egressPort: target.egressPort,
    };
    const node = ctx.deps.ifaceResolver.findNode(target.nextNodeId);
    const factory = node ? layerRegistry.getForwarder(node.data.layerId) : undefined;
    if (!node || node.data.role !== 'switch' || !factory || visited.has(node.id)) {
      out.push(notForMe(base));
      continue;
    }
    visited.add(node.id);
    const ingress = ctx.deps.portResolver.resolvePortFromEdge(node.id, target.edgeId, 'ingress');
    const packet = {
      ...target.packet,
      currentDeviceId: node.id,
      ingressPortId: ingress?.id ?? target.packet.ingressPortId,
    };
    const decision = await factory(
      node.id,
      topologyWithAddressView(ctx.deps.topology, ctx.deps.addresses),
    ).receive(packet, packet.ingressPortId ?? '', {
      neighbors: ctx.deps.getNeighborsFn(node.id, fromNodeId, ctx.shared.failureState),
      macTable: macTableFor(ctx.shared, node.id),
      ingressEdgeId: target.edgeId,
    });
    if (decision.action === 'flood') {
      out.push({ ...base, outcome: 'flooded' });
      const onward = decision.forward ? [decision.forward, ...decision.copies] : decision.copies;
      out.push(...(await followCopies(ctx, node.id, onward, visited)));
    } else if (decision.action === 'forward') {
      out.push({ ...base, outcome: 'forwarded' });
      out.push(...(await followCopies(ctx, node.id, [decision], visited)));
    } else if (decision.action === 'drop') {
      out.push({ ...base, outcome: 'dropped', reason: decision.reason });
    } else {
      out.push(notForMe(base));
    }
  }
  return out;
}

const BROADCAST_MAC = 'ff:ff:ff:ff:ff:ff';

/** Who asks whom in an ARP exchange, and the link the question leaves by. */
export interface ArpLeg {
  readonly senderId: string;
  readonly senderMac: string;
  readonly targetId: string;
  readonly targetMac: string;
  readonly nextNodeId: string;
  readonly edgeId: string;
  /** Where the question goes: broadcast for ARP, the solicited-node group's MAC for NDP. */
  readonly requestMac?: string;
}

/**
 * An ARP exchange through the switches between the two devices. The request
 * is a broadcast: it is copied through them, and each learns where the asker
 * is. The reply goes back by what they learned, and each learns where the
 * answerer is. Returns the request's copies that reached a device other than
 * the one asked (and past the first link, which the trace already draws).
 */
export async function passArpThroughSwitches(ctx: LoopContext, leg: ArpLeg): Promise<FloodCopy[]> {
  const packetFor = (srcMac: string, dstMac: string, dstNodeId: string) => ({
    ...ctx.workingPacket,
    dstNodeId,
    frame: { ...ctx.workingPacket.frame, srcMac, dstMac },
  });
  const request = await followCopies(
    ctx,
    leg.senderId,
    [
      {
        nextNodeId: leg.nextNodeId,
        edgeId: leg.edgeId,
        egressPort: '',
        packet: packetFor(leg.senderMac, leg.requestMac ?? BROADCAST_MAC, leg.targetId),
      },
    ],
    new Set([leg.senderId]),
  );
  const asked = request.find((copy) => copy.toNodeId === leg.targetId);
  if (asked && asked.fromNodeId !== leg.senderId) {
    await followCopies(
      ctx,
      leg.targetId,
      [
        {
          nextNodeId: asked.fromNodeId,
          edgeId: asked.edgeId,
          egressPort: '',
          packet: packetFor(leg.targetMac, leg.senderMac, leg.senderId),
        },
      ],
      new Set([leg.targetId]),
    );
  }
  return request.filter(
    (copy) =>
      copy.toNodeId !== leg.targetId &&
      !(copy.fromNodeId === leg.senderId && copy.edgeId === leg.edgeId),
  );
}
