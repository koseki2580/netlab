import { isIpv6Packet } from '../../../../types/packets';
import type { PacketHop } from '../../../../types/simulation';
import { arpKey } from '../ArpDispatcher';
import { passArpThroughSwitches } from './floodCopies';
import {
  appendHop,
  continueWith,
  type RoutedContext,
  recordArpEntry,
  type StageResult,
} from './_shared';

export function runArpInjectionStage(ctx: RoutedContext): StageResult | Promise<StageResult> {
  const node = ctx.hop.node;
  const hopBase = ctx.hop.base;
  const next = ctx.routing.next;
  if (!next) {
    return continueWith(ctx);
  }

  ctx.routing.arpTarget =
    !isIpv6Packet(ctx.workingPacket.frame.payload) &&
    (node.data.role === 'router' || node.data.role === 'client' || node.data.role === 'server')
      ? ctx.deps.arpDispatcher.resolveTargetInfo(
          ctx.current,
          next.nodeId,
          ctx.workingPacket,
          ctx.shared.failureState,
          ctx.routing.routerEgressInterface?.id,
          next.edgeId,
          ctx.routing.nextHopIp ?? undefined,
        )
      : null;
  const shouldInjectArp =
    ctx.routing.arpTarget !== null &&
    !ctx.shared.arpCache.has(arpKey(ctx.current, ctx.routing.arpTarget.targetIp));

  if (shouldInjectArp && ctx.ingressFrom === null) {
    const createHop: Omit<PacketHop, 'step'> = {
      ...hopBase,
      event: 'create',
      toNodeId: next.nodeId,
      activeEdgeId: next.edgeId,
    };
    const changedFields = ctx.deps.frameMaterializer.diffPacketFields(
      ctx.routing.packetBeforeHop,
      ctx.workingPacket,
    );
    if (changedFields.length > 0) {
      createHop.changedFields = changedFields;
    }
    appendHop(ctx, createHop, ctx.workingPacket);
  }

  ctx.routing.packetBeforeForward =
    shouldInjectArp && ctx.ingressFrom === null ? ctx.workingPacket : ctx.routing.packetBeforeHop;

  let throughSwitches: Promise<void> | null = null;
  if (shouldInjectArp && ctx.routing.arpTarget) {
    const targetMac = ctx.deps.arpDispatcher.resolveTargetMac(
      ctx.current,
      next.nodeId,
      ctx.routing.arpTarget.targetNodeId,
      ctx.workingPacket,
      ctx.shared.failureState,
      hopBase.egressInterfaceId,
      ctx.routing.nextHopIp ?? undefined,
    );

    ctx.stepCounter = ctx.deps.arpDispatcher.injectExchange(
      ctx.current,
      ctx.routing.arpTarget.targetNodeId,
      ctx.routing.arpTarget.senderIp,
      ctx.routing.arpTarget.targetIp,
      ctx.routing.arpTarget.senderMac,
      targetMac,
      next.edgeId,
      ctx.workingPacket,
      ctx.stepCounter,
      ctx.shared.hops,
      ctx.shared.snapshots,
      ctx.baseTs,
    );
    // The exchange crosses the switches on its way (REQ-121): they learn both
    // ends, and the request's copies are listed on its hop.
    if (ctx.deps.ifaceResolver.findNode(next.nodeId)?.data.role === 'switch') {
      const requestHop = ctx.shared.hops[ctx.shared.hops.length - 2];
      throughSwitches = passArpThroughSwitches(ctx, {
        senderId: ctx.current,
        senderMac: ctx.routing.arpTarget.senderMac,
        targetId: ctx.routing.arpTarget.targetNodeId,
        targetMac,
        nextNodeId: next.nodeId,
        edgeId: next.edgeId,
      }).then((copies) => {
        if (copies.length > 0 && requestHop?.event === 'arp-request') {
          requestHop.flood = { copies };
        }
      });
    }

    ctx.shared.arpCache.set(arpKey(ctx.current, ctx.routing.arpTarget.targetIp), targetMac);
    if (ctx.routing.arpTarget.senderIp.trim()) {
      ctx.shared.arpCache.set(
        arpKey(ctx.routing.arpTarget.targetNodeId, ctx.routing.arpTarget.senderIp),
        ctx.routing.arpTarget.senderMac,
      );
    }
    recordArpEntry(ctx, ctx.current, ctx.routing.arpTarget.targetIp, targetMac);
    recordArpEntry(
      ctx,
      ctx.routing.arpTarget.targetNodeId,
      ctx.routing.arpTarget.senderIp,
      ctx.routing.arpTarget.senderMac,
    );
  }

  ctx.routing.forwardEvent = ctx.ingressFrom === null && !shouldInjectArp ? 'create' : 'forward';
  ctx.routing.resolvedDstMac = ctx.routing.arpTarget
    ? (ctx.shared.arpCache.get(arpKey(ctx.current, ctx.routing.arpTarget.targetIp)) ??
      ctx.deps.arpDispatcher.resolveTargetMac(
        ctx.current,
        next.nodeId,
        ctx.routing.arpTarget.targetNodeId,
        ctx.workingPacket,
        ctx.shared.failureState,
        hopBase.egressInterfaceId,
        ctx.routing.nextHopIp ?? undefined,
      ))
    : ctx.deps.macResolver.resolveDstMac(
        ctx.current,
        next.nodeId,
        hopBase.egressInterfaceId,
        ctx.workingPacket,
        ctx.shared.failureState,
        ctx.routing.nextHopIp ?? undefined,
      );

  return throughSwitches ? throughSwitches.then(() => continueWith(ctx)) : continueWith(ctx);
}
