import { isIpv6Packet } from '../../../../types/packets';
import type { PacketHop } from '../../../../types/simulation';
import { arpKey } from '../ArpDispatcher';
import type { injectNdpExchange } from '../ndpExchange';

type NdpInjector = typeof injectNdpExchange;
import { passArpThroughSwitches } from './floodCopies';
import {
  appendHop,
  BROADCAST_IP,
  continueWith,
  type RoutedContext,
  recordArpEntry,
  type StageResult,
} from './_shared';

export function runArpInjectionStage(ctx: RoutedContext): StageResult | Promise<StageResult> {
  const node = ctx.hop.node;
  const next = ctx.routing.next;
  if (!next) {
    return continueWith(ctx);
  }

  // IPv6 asks by Neighbor Discovery (REQ-191), IPv4 by ARP.
  const v6 = isIpv6Packet(ctx.workingPacket.frame.payload);
  ctx.routing.arpTarget = v6
    ? ctx.deps.arpDispatcher.resolveNeighborInfo(
        ctx.current,
        next.nodeId,
        ctx.workingPacket,
        ctx.shared.failureState,
        ctx.routing.routerEgressInterface?.id,
        ctx.routing.nextHopIp ?? undefined,
      )
    : node.data.role === 'router' || node.data.role === 'client' || node.data.role === 'server'
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
  // A host that must ask may get no answer inside its VLAN (802.1Q, REQ-350). That
  // check, and drawing it, load only when a host asks, as NDP's exchange does.
  if (
    !v6 &&
    ctx.ingressFrom === null &&
    (ctx.routing.arpTarget === null ||
      !ctx.shared.arpCache.has(arpKey(ctx.current, ctx.routing.arpTarget.targetIp))) &&
    (node.data.role === 'client' || node.data.role === 'server') &&
    ctx.workingPacket.frame.payload.dstIp !== BROADCAST_IP &&
    ctx.deps.ifaceResolver.findNode(next.nodeId)?.data.role === 'switch'
  ) {
    return import('../arpUnanswered').then((module) =>
      module.nobodyAnswers(ctx, next) ? module.askUnanswered(ctx, next) : ask(ctx, next, v6),
    );
  }
  return ask(ctx, next, v6);
}

/** The ARP (or NDP) exchange, when the sender must ask and an answer comes. */
function ask(
  ctx: RoutedContext,
  next: { nodeId: string; edgeId: string },
  v6: boolean,
): StageResult | Promise<StageResult> {
  const hopBase = ctx.hop.base;
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

  const finish = (injectNdp?: NdpInjector): StageResult | Promise<StageResult> => {
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

      ctx.stepCounter = injectNdp
        ? injectNdp(
            ctx.deps.traceRecorder,
            ctx.deps.ifaceResolver,
            ctx.routing.arpTarget,
            ctx.current,
            targetMac,
            next.edgeId,
            ctx.workingPacket,
            ctx.stepCounter,
            ctx.shared.hops,
            ctx.shared.snapshots,
            ctx.baseTs,
          )
        : ctx.deps.arpDispatcher.injectExchange(
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
        const request = requestHop?.dstMac;
        throughSwitches = passArpThroughSwitches(ctx, {
          ...(v6 && request ? { requestMac: request } : {}),
          senderId: ctx.current,
          senderMac: ctx.routing.arpTarget.senderMac,
          targetId: ctx.routing.arpTarget.targetNodeId,
          targetMac,
          nextNodeId: next.nodeId,
          edgeId: next.edgeId,
        }).then((copies) => {
          if (
            copies.length > 0 &&
            (requestHop?.event === 'arp-request' || requestHop?.event === 'ndp-solicit')
          ) {
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
      // A device's ARP table lists IPv4 only.
      if (!v6) {
        recordArpEntry(ctx, ctx.current, ctx.routing.arpTarget.targetIp, targetMac);
        recordArpEntry(
          ctx,
          ctx.routing.arpTarget.targetNodeId,
          ctx.routing.arpTarget.senderIp,
          ctx.routing.arpTarget.senderMac,
        );
      }
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
  };
  // NDP's framing is loaded only when an IPv6 sender first has to ask.
  return v6 && shouldInjectArp
    ? import('../ndpExchange').then((module) => finish(module.injectNdpExchange))
    : finish();
}
