import { protocolName, isPortBearingPayload } from '../routingHelpers';
import {
  appendHop,
  breakWith,
  buildLoopGuardKey,
  continueWith,
  isIgmpMessage,
  type HopFacts,
  type LoopContext,
  type StageResult,
} from './_shared';

/**
 * A drop before the hop has begun (no device, a loop, a device that is down):
 * the hop is written from the packet alone.
 */
function dropBeforeHop(ctx: LoopContext, nodeLabel: string, reason: string): StageResult {
  const ipPacket = ctx.workingPacket.frame.payload;
  appendHop(
    ctx,
    {
      nodeId: ctx.current,
      nodeLabel,
      srcIp: ipPacket.srcIp,
      dstIp: ipPacket.dstIp,
      ttl: ipPacket.ttl,
      protocol: protocolName(ipPacket.protocol),
      event: 'drop',
      ...(ctx.ingressFrom !== null ? { fromNodeId: ctx.ingressFrom } : {}),
      reason,
      timestamp: ctx.baseTs,
    },
    ctx.workingPacket,
  );
  return breakWith(ctx);
}

export function runPreflightStage(ctx: LoopContext): StageResult {
  const node = ctx.deps.ifaceResolver.findNode(ctx.current);
  if (!node) {
    return dropBeforeHop(ctx, ctx.current, 'node-not-found');
  }

  const loopGuardKey = buildLoopGuardKey(ctx, node, ctx.workingPacket, ctx.ingressEdgeId);
  if (ctx.visitedStates.has(loopGuardKey)) {
    return dropBeforeHop(ctx, node.data.label, 'routing-loop');
  }
  ctx.visitedStates.add(loopGuardKey);

  if (ctx.shared.failureState.downNodeIds.has(ctx.current)) {
    return dropBeforeHop(ctx, node.data.label, 'node-down');
  }

  const ipPacket = ctx.workingPacket.frame.payload;
  const transport = ipPacket.payload;
  const base: HopFacts['base'] = {
    nodeId: ctx.current,
    nodeLabel: node.data.label,
    srcIp: ipPacket.srcIp,
    dstIp: ipPacket.dstIp,
    ttl: ipPacket.ttl,
    protocol: protocolName(ipPacket.protocol),
    ...(isPortBearingPayload(transport)
      ? { srcPort: transport.srcPort, dstPort: transport.dstPort }
      : {}),
    ...(isIgmpMessage(transport)
      ? {
          action:
            transport.groupAddress !== '0.0.0.0'
              ? (`IGMP ${transport.igmpType} group=${transport.groupAddress}` as const)
              : (`IGMP ${transport.igmpType}` as const),
        }
      : {}),
    event: 'forward',
    ...(ctx.ingressFrom !== null ? { fromNodeId: ctx.ingressFrom } : {}),
    timestamp: ctx.baseTs,
  };
  ctx.hop = { node, ipPacket, transport, base };

  // A host holding its LAN's network or broadcast address neither sends nor
  // receives: the engine refuses the address, as a real host refuses to take it.
  if (ctx.deps.addresses.hasReservedAddress(node)) {
    appendHop(ctx, { ...base, event: 'drop', reason: 'reserved-address' }, ctx.workingPacket);
    return breakWith(ctx);
  }

  return continueWith(ctx);
}
