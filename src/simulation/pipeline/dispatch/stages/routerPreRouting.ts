import { macTableFor } from './floodCopies';
import { IGMP_PROTOCOL } from '../../../../types/multicast';
import {
  appendDropHop,
  breakWith,
  continueWith,
  isIgmpMessage,
  freshRouting,
  type HopContext,
  type RoutedContext,
  type StageResult,
} from './_shared';

export function runRouterPreRoutingStage(ctx: HopContext): StageResult {
  const node = ctx.hop.node;
  const hopBase = ctx.hop.base;
  const { ipPacket, transport } = ctx.hop;

  // A fresh record for what routing decides at this hop.
  const neighbors = ctx.deps.getNeighborsFn(
    ctx.current,
    node.data.role === 'router' ? null : ctx.ingressFrom,
    ctx.shared.failureState,
  );
  const multicastTable =
    node.data.role === 'switch'
      ? ctx.deps.services.processors.getMulticastTable(ctx.current)
      : null;
  const routed: RoutedContext = Object.assign(ctx, {
    routing: freshRouting(ctx.workingPacket, neighbors, {
      neighbors,
      ...(multicastTable != null ? { multicastTable } : {}),
      ...(node.data.role === 'switch' ? { macTable: macTableFor(ctx.shared, ctx.current) } : {}),
    }),
  });

  if (node.data.role !== 'router') {
    return continueWith(routed);
  }

  const natProcessor = routed.deps.services.processors.getNatProcessor(routed.current);
  if (natProcessor) {
    const preRoutingResult = natProcessor.applyPreRouting(
      routed.workingPacket,
      hopBase.ingressInterfaceId,
      routed.stepCounter,
    );
    if (preRoutingResult.dropReason) {
      appendDropHop(
        routed,
        preRoutingResult.dropReason,
        preRoutingResult.packet,
        {},
        {
          natTranslation: preRoutingResult.translation,
        },
      );
      return breakWith(routed);
    }

    routed.workingPacket = preRoutingResult.packet;
    routed.routing.natTranslation = preRoutingResult.translation;
    routed.routing.outsideToInsideMatched = preRoutingResult.matched;
  }

  const aclProcessor = routed.deps.services.processors.getAclProcessor(routed.current);
  if (aclProcessor) {
    const ingressResult = aclProcessor.applyIngress(
      routed.workingPacket,
      hopBase.ingressInterfaceId,
      routed.stepCounter,
    );
    routed.routing.ingressAclMatch = ingressResult.match;
    if (ingressResult.dropReason) {
      appendDropHop(
        routed,
        ingressResult.dropReason,
        ingressResult.packet,
        {},
        {
          aclMatch: ingressResult.match,
        },
      );
      return breakWith(routed);
    }

    routed.workingPacket = ingressResult.packet;
  }

  if (ipPacket.protocol === IGMP_PROTOCOL && isIgmpMessage(transport)) {
    const igmpProcessor = routed.deps.services.processors.getIgmpProcessor(routed.current);
    if (igmpProcessor) {
      const ifaceId = hopBase.ingressInterfaceId ?? routed.current;
      if (transport.igmpType === 'v2-membership-report') {
        igmpProcessor.recordReport(ifaceId, transport.groupAddress);
      } else if (transport.igmpType === 'v2-leave-group') {
        igmpProcessor.recordLeave(ifaceId, transport.groupAddress);
      }
    }
  }

  return continueWith(routed);
}
