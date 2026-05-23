import { protocolName, isPortBearingPayload } from '../routingHelpers';
import {
  appendHop,
  breakWith,
  buildLoopGuardKey,
  continueWith,
  isIgmpMessage,
  type LoopContext,
  type StageResult,
} from './_shared';

export function runPreflightStage(ctx: LoopContext): StageResult {
  const node = ctx.deps.ifaceResolver.findNode(ctx.current);
  if (!node) {
    appendHop(
      ctx,
      {
        nodeId: ctx.current,
        nodeLabel: ctx.current,
        srcIp: ctx.workingPacket.frame.payload.srcIp,
        dstIp: ctx.workingPacket.frame.payload.dstIp,
        ttl: ctx.workingPacket.frame.payload.ttl,
        protocol: protocolName(ctx.workingPacket.frame.payload.protocol),
        event: 'drop',
        ...(ctx.ingressFrom !== null ? { fromNodeId: ctx.ingressFrom } : {}),
        reason: 'node-not-found',
        timestamp: ctx.baseTs,
      },
      ctx.workingPacket,
    );
    return breakWith(ctx);
  }

  const loopGuardKey = buildLoopGuardKey(ctx, node, ctx.workingPacket, ctx.ingressEdgeId);
  if (ctx.visitedStates.has(loopGuardKey)) {
    appendHop(
      ctx,
      {
        nodeId: ctx.current,
        nodeLabel: node.data.label,
        srcIp: ctx.workingPacket.frame.payload.srcIp,
        dstIp: ctx.workingPacket.frame.payload.dstIp,
        ttl: ctx.workingPacket.frame.payload.ttl,
        protocol: protocolName(ctx.workingPacket.frame.payload.protocol),
        event: 'drop',
        ...(ctx.ingressFrom !== null ? { fromNodeId: ctx.ingressFrom } : {}),
        reason: 'routing-loop',
        timestamp: ctx.baseTs,
      },
      ctx.workingPacket,
    );
    return breakWith(ctx);
  }
  ctx.visitedStates.add(loopGuardKey);

  if (ctx.shared.failureState.downNodeIds.has(ctx.current)) {
    appendHop(
      ctx,
      {
        nodeId: ctx.current,
        nodeLabel: node.data.label,
        srcIp: ctx.workingPacket.frame.payload.srcIp,
        dstIp: ctx.workingPacket.frame.payload.dstIp,
        ttl: ctx.workingPacket.frame.payload.ttl,
        protocol: protocolName(ctx.workingPacket.frame.payload.protocol),
        event: 'drop',
        ...(ctx.ingressFrom !== null ? { fromNodeId: ctx.ingressFrom } : {}),
        reason: 'node-down',
        timestamp: ctx.baseTs,
      },
      ctx.workingPacket,
    );
    return breakWith(ctx);
  }

  const ipPacket = ctx.workingPacket.frame.payload;
  const transport = ipPacket.payload;
  ctx.node = node;
  ctx.ipPacket = ipPacket;
  ctx.transport = transport;
  ctx.hopBase = {
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

  return continueWith(ctx);
}
