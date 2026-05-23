import { layerRegistry } from '../../../../registry/LayerRegistry';
import type { PacketHop } from '../../../../types/simulation';
import { buildRoutingDecision } from '../routingHelpers';
import {
  appendDropHop,
  appendHop,
  breakWith,
  continueWith,
  type LoopContext,
  requireHopBase,
  requireNode,
  requirePacketBeforeHop,
  type StageResult,
} from './_shared';

export async function runForwarderDispatchStage(ctx: LoopContext): Promise<StageResult> {
  const node = requireNode(ctx);
  const hopBase = requireHopBase(ctx);

  if (node.data.role === 'router' || node.data.role === 'switch') {
    const forwarderFactory = layerRegistry.getForwarder(node.data.layerId);
    if (forwarderFactory) {
      const forwarder = forwarderFactory(ctx.current, ctx.deps.topology);
      const decision = await forwarder.receive(
        ctx.workingPacket,
        ctx.workingPacket.ingressPortId ?? '',
        ctx.forwardCtx ?? { neighbors: ctx.neighbors },
      );
      if (decision.action === 'drop') {
        const extras: Partial<Omit<PacketHop, 'step' | 'event' | 'reason'>> = {};
        if (node.data.role === 'router' && decision.reason !== 'ttl-exceeded') {
          const routes = ctx.deps.topology.routeTables.get(ctx.current) ?? [];
          extras.routingDecision = buildRoutingDecision(
            ctx.workingPacket.frame.payload.dstIp,
            routes,
            null,
          );
        }
        if (
          node.data.role === 'router' &&
          decision.reason === 'ttl-exceeded' &&
          !ctx.shared.options.suppressGeneratedIcmp
        ) {
          const routerIp = hopBase.ingressInterfaceId
            ? ctx.deps.ifaceResolver.findLogicalById(ctx.current, hopBase.ingressInterfaceId)
                ?.ipAddress
            : undefined;
          const responseSourceIp = routerIp ?? ctx.deps.getEffectiveNodeIp(node);
          if (
            responseSourceIp &&
            ctx.deps.icmpBuilder.shouldEmitGeneratedIcmp(ctx.workingPacket.frame.payload.srcIp)
          ) {
            extras.icmpGenerated = true;
            ctx.generatedIcmpPackets.push(
              ctx.deps.icmpBuilder.buildTimeExceeded(
                ctx.current,
                responseSourceIp,
                ctx.workingPacket,
              ),
            );
          }
        }
        appendDropHop(ctx, decision.reason, ctx.workingPacket, extras, {
          aclMatch: ctx.ingressAclMatch,
        });
        return breakWith(ctx);
      }

      if (decision.action !== 'forward') {
        const deliverHop: Omit<PacketHop, 'step'> = {
          ...hopBase,
          event: 'deliver',
          ...(ctx.ingressAclMatch != null ? { aclMatch: ctx.ingressAclMatch } : {}),
        };
        if (ctx.natTranslation) {
          deliverHop.natTranslation = ctx.natTranslation;
        }
        const changedFields = ctx.deps.frameMaterializer.diffPacketFields(
          requirePacketBeforeHop(ctx),
          decision.packet,
        );
        if (changedFields.length > 0) {
          deliverHop.changedFields = changedFields;
        }
        appendHop(ctx, deliverHop, decision.packet);
        return breakWith(ctx);
      }

      ctx.workingPacket = decision.packet;
      ctx.next = { nodeId: decision.nextNodeId, edgeId: decision.edgeId };

      if (node.data.role === 'router') {
        ctx.selectedRoute = decision.selectedRoute ?? null;
        if (decision.ecmpTrace) {
          hopBase.action = 'ecmp:bucketed';
          hopBase.ecmpTrace = decision.ecmpTrace;
        }
        const ingressInterfaceMatch = ctx.deps.ifaceResolver.findLogicalById(
          ctx.current,
          decision.ingressInterfaceId,
        );
        if (ingressInterfaceMatch) {
          hopBase.ingressInterfaceId = ingressInterfaceMatch.id;
          hopBase.ingressInterfaceName = ingressInterfaceMatch.name;
        }
        const egressInterfaceId = decision.egressInterfaceId;
        const interfaceMatch = ctx.deps.ifaceResolver.findLogicalById(
          ctx.current,
          egressInterfaceId,
        );
        ctx.routerEgressInterface = interfaceMatch
          ? { id: interfaceMatch.id, name: interfaceMatch.name }
          : ctx.deps.portResolver.resolvePortFromEdge(ctx.current, ctx.next.edgeId, 'egress');
      }
    }
  } else if (ctx.ingressFrom === null) {
    ctx.next = ctx.neighbors[0] ?? null;
  }

  if (node.data.role === 'router') {
    const routes = ctx.deps.topology.routeTables.get(ctx.current) ?? [];
    hopBase.routingDecision = buildRoutingDecision(
      ctx.workingPacket.frame.payload.dstIp,
      routes,
      ctx.selectedRoute,
    );
  }

  if (!ctx.next) {
    appendDropHop(ctx, 'no-route', ctx.workingPacket, {}, { aclMatch: ctx.ingressAclMatch });
    return breakWith(ctx);
  }

  return continueWith(ctx);
}
