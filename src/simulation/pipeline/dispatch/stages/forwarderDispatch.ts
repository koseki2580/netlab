import { layerRegistry } from '../../../../registry/LayerRegistry';
import type { PacketHop } from '../../../../types/simulation';
import { topologyWithAddressView } from '../../../addressView';
import { bestRoute, buildRoutingDecision } from '../routingHelpers';
import { followCopies } from './floodCopies';
import {
  appendDropHop,
  appendHop,
  breakWith,
  continueWith,
  type RoutedContext,
  type StageResult,
} from './_shared';

export async function runForwarderDispatchStage(ctx: RoutedContext): Promise<StageResult> {
  const node = ctx.hop.node;
  const hopBase = ctx.hop.base;

  if (node.data.role === 'router' || node.data.role === 'switch') {
    const forwarderFactory = layerRegistry.getForwarder(node.data.layerId);
    if (forwarderFactory) {
      const forwarder = forwarderFactory(
        ctx.current,
        topologyWithAddressView(ctx.deps.topology, ctx.deps.addresses),
      );
      let decision = await forwarder.receive(
        ctx.workingPacket,
        ctx.workingPacket.ingressPortId ?? '',
        ctx.routing.forwardCtx ?? { neighbors: ctx.routing.neighbors },
      );
      if (decision.action === 'flood') {
        // The trace follows the copy toward the destination; every other copy
        // is listed on this hop with what became of it.
        const copies = await followCopies(
          ctx,
          ctx.current,
          decision.copies,
          new Set([ctx.current]),
        );
        if (copies.length > 0) hopBase.flood = { copies };
        if (!decision.forward) {
          appendDropHop(
            ctx,
            'no-receiver',
            decision.packet,
            {},
            {
              aclMatch: ctx.routing.ingressAclMatch,
            },
          );
          return breakWith(ctx);
        }
        decision = { action: 'forward', ...decision.forward };
      }
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
          const responseSourceIp = routerIp ?? ctx.deps.addresses.nodeIp(node);
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
          aclMatch: ctx.routing.ingressAclMatch,
        });
        return breakWith(ctx);
      }

      if (decision.action !== 'forward') {
        const deliverHop: Omit<PacketHop, 'step'> = {
          ...hopBase,
          event: 'deliver',
          ...(ctx.routing.ingressAclMatch != null ? { aclMatch: ctx.routing.ingressAclMatch } : {}),
        };
        if (ctx.routing.natTranslation) {
          deliverHop.natTranslation = ctx.routing.natTranslation;
        }
        const changedFields = ctx.deps.frameMaterializer.diffPacketFields(
          ctx.routing.packetBeforeHop,
          decision.packet,
        );
        if (changedFields.length > 0) {
          deliverHop.changedFields = changedFields;
        }
        appendHop(ctx, deliverHop, decision.packet);
        return breakWith(ctx);
      }

      ctx.workingPacket = decision.packet;
      ctx.routing.next = { nodeId: decision.nextNodeId, edgeId: decision.edgeId };

      if (node.data.role === 'router') {
        ctx.routing.selectedRoute = decision.selectedRoute ?? null;
        // A plugin forwarder may name no next hop: then the route it says it
        // used, or failing that the route table's longest match, decides it,
        // as it did before the decision carried one.
        const dstIp = ctx.workingPacket.frame.payload.dstIp;
        const route =
          ctx.routing.selectedRoute ??
          bestRoute(dstIp, ctx.deps.topology.routeTables.get(ctx.current) ?? []);
        ctx.routing.nextHopIp =
          decision.nextHopIp ?? (route && route.nextHop !== 'direct' ? route.nextHop : dstIp);
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
        ctx.routing.routerEgressInterface = interfaceMatch
          ? { id: interfaceMatch.id, name: interfaceMatch.name }
          : ctx.deps.portResolver.resolvePortFromEdge(
              ctx.current,
              ctx.routing.next.edgeId,
              'egress',
            );
      }
    }
  } else if (ctx.ingressFrom === null) {
    ctx.routing.next = ctx.routing.neighbors[0] ?? null;
  }

  if (node.data.role === 'router') {
    const routes = ctx.deps.topology.routeTables.get(ctx.current) ?? [];
    hopBase.routingDecision = buildRoutingDecision(
      ctx.workingPacket.frame.payload.dstIp,
      routes,
      ctx.routing.selectedRoute,
    );
  }

  if (!ctx.routing.next) {
    appendDropHop(
      ctx,
      'no-route',
      ctx.workingPacket,
      {},
      { aclMatch: ctx.routing.ingressAclMatch },
    );
    return breakWith(ctx);
  }

  return continueWith(ctx);
}
