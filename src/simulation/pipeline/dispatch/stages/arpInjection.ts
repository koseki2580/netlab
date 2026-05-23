import { isIpv6Packet } from '../../../../types/packets';
import type { PacketHop } from '../../../../types/simulation';
import {
  appendHop,
  continueWith,
  type LoopContext,
  recordArpEntry,
  requireHopBase,
  requireNode,
  requirePacketBeforeHop,
  type StageResult,
} from './_shared';

export function runArpInjectionStage(ctx: LoopContext): StageResult {
  const node = requireNode(ctx);
  const hopBase = requireHopBase(ctx);
  const next = ctx.next;
  if (!next) {
    return continueWith(ctx);
  }

  ctx.arpTarget =
    !isIpv6Packet(ctx.workingPacket.frame.payload) &&
    (node.data.role === 'router' || node.data.role === 'client' || node.data.role === 'server')
      ? ctx.deps.arpDispatcher.resolveTargetInfo(
          ctx.current,
          next.nodeId,
          ctx.workingPacket,
          ctx.shared.failureState,
          ctx.routerEgressInterface?.id,
          next.edgeId,
          ctx.selectedRoute?.nextHop,
        )
      : null;
  const shouldInjectArp =
    ctx.arpTarget !== null && !ctx.shared.arpCache.has(ctx.arpTarget.targetIp);

  if (shouldInjectArp && ctx.ingressFrom === null) {
    const createHop: Omit<PacketHop, 'step'> = {
      ...hopBase,
      event: 'create',
      toNodeId: next.nodeId,
      activeEdgeId: next.edgeId,
    };
    const changedFields = ctx.deps.frameMaterializer.diffPacketFields(
      requirePacketBeforeHop(ctx),
      ctx.workingPacket,
    );
    if (changedFields.length > 0) {
      createHop.changedFields = changedFields;
    }
    appendHop(ctx, createHop, ctx.workingPacket);
  }

  ctx.packetBeforeForward =
    shouldInjectArp && ctx.ingressFrom === null ? ctx.workingPacket : requirePacketBeforeHop(ctx);

  if (shouldInjectArp && ctx.arpTarget) {
    const targetMac = ctx.deps.arpDispatcher.resolveTargetMac(
      ctx.current,
      next.nodeId,
      ctx.arpTarget.targetNodeId,
      ctx.workingPacket,
      ctx.shared.failureState,
      hopBase.egressInterfaceId,
      ctx.selectedRoute?.nextHop,
    );

    ctx.stepCounter = ctx.deps.arpDispatcher.injectExchange(
      ctx.current,
      ctx.arpTarget.targetNodeId,
      ctx.arpTarget.senderIp,
      ctx.arpTarget.targetIp,
      ctx.arpTarget.senderMac,
      targetMac,
      next.edgeId,
      ctx.workingPacket,
      ctx.stepCounter,
      ctx.shared.hops,
      ctx.shared.snapshots,
      ctx.baseTs,
    );

    ctx.shared.arpCache.set(ctx.arpTarget.targetIp, targetMac);
    if (ctx.arpTarget.senderIp.trim()) {
      ctx.shared.arpCache.set(ctx.arpTarget.senderIp, ctx.arpTarget.senderMac);
    }
    recordArpEntry(ctx, ctx.current, ctx.arpTarget.targetIp, targetMac);
    recordArpEntry(
      ctx,
      ctx.arpTarget.targetNodeId,
      ctx.arpTarget.senderIp,
      ctx.arpTarget.senderMac,
    );
  }

  ctx.forwardEvent = ctx.ingressFrom === null && !shouldInjectArp ? 'create' : 'forward';
  ctx.resolvedDstMac = ctx.arpTarget
    ? (ctx.shared.arpCache.get(ctx.arpTarget.targetIp) ??
      ctx.deps.arpDispatcher.resolveTargetMac(
        ctx.current,
        next.nodeId,
        ctx.arpTarget.targetNodeId,
        ctx.workingPacket,
        ctx.shared.failureState,
        hopBase.egressInterfaceId,
        ctx.selectedRoute?.nextHop,
      ))
    : ctx.deps.macResolver.resolveDstMac(
        ctx.current,
        next.nodeId,
        hopBase.egressInterfaceId,
        ctx.workingPacket,
        ctx.shared.failureState,
        ctx.selectedRoute?.nextHop,
      );

  return continueWith(ctx);
}
