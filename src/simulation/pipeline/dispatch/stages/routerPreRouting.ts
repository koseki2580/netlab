import { IGMP_PROTOCOL } from '../../../../types/multicast';
import {
  appendDropHop,
  breakWith,
  continueWith,
  isIgmpMessage,
  type LoopContext,
  requireHopBase,
  requireNode,
  type StageResult,
} from './_shared';

export function runRouterPreRoutingStage(ctx: LoopContext): StageResult {
  const node = requireNode(ctx);
  const hopBase = requireHopBase(ctx);
  const ipPacket = ctx.ipPacket ?? ctx.workingPacket.frame.payload;
  const transport = ctx.transport ?? ipPacket.payload;

  ctx.packetBeforeHop = ctx.workingPacket;
  ctx.packetBeforeForward = null;
  ctx.natTranslation = null;
  ctx.outsideToInsideMatched = false;
  ctx.ingressAclMatch = null;
  ctx.egressAclMatch = null;
  ctx.next = null;
  ctx.selectedRoute = null;
  ctx.routerEgressInterface = null;
  ctx.arpTarget = null;
  ctx.forwardEvent = null;
  ctx.resolvedDstMac = null;
  ctx.forwardHop = null;
  ctx.neighbors = ctx.deps.getNeighborsFn(
    ctx.current,
    node.data.role === 'router' ? null : ctx.ingressFrom,
    ctx.shared.failureState,
  );
  const multicastTable =
    node.data.role === 'switch' ? ctx.deps.services.getMulticastTable(ctx.current) : null;
  ctx.forwardCtx = {
    neighbors: ctx.neighbors,
    ...(multicastTable != null ? { multicastTable } : {}),
  };

  if (node.data.role !== 'router') {
    return continueWith(ctx);
  }

  const natProcessor = ctx.deps.services.getNatProcessor(ctx.current);
  if (natProcessor) {
    const preRoutingResult = natProcessor.applyPreRouting(
      ctx.workingPacket,
      hopBase.ingressInterfaceId,
      ctx.stepCounter,
    );
    if (preRoutingResult.dropReason) {
      appendDropHop(
        ctx,
        preRoutingResult.dropReason,
        preRoutingResult.packet,
        {},
        {
          natTranslation: preRoutingResult.translation,
        },
      );
      return breakWith(ctx);
    }

    ctx.workingPacket = preRoutingResult.packet;
    ctx.natTranslation = preRoutingResult.translation;
    ctx.outsideToInsideMatched = preRoutingResult.matched;
  }

  const aclProcessor = ctx.deps.services.getAclProcessor(ctx.current);
  if (aclProcessor) {
    const ingressResult = aclProcessor.applyIngress(
      ctx.workingPacket,
      hopBase.ingressInterfaceId,
      ctx.stepCounter,
    );
    ctx.ingressAclMatch = ingressResult.match;
    if (ingressResult.dropReason) {
      appendDropHop(
        ctx,
        ingressResult.dropReason,
        ingressResult.packet,
        {},
        {
          aclMatch: ingressResult.match,
        },
      );
      return breakWith(ctx);
    }

    ctx.workingPacket = ingressResult.packet;
  }

  if (ipPacket.protocol === IGMP_PROTOCOL && isIgmpMessage(transport)) {
    const igmpProcessor = ctx.deps.services.getIgmpProcessor(ctx.current);
    if (igmpProcessor) {
      const ifaceId = hopBase.ingressInterfaceId ?? ctx.current;
      if (transport.igmpType === 'v2-membership-report') {
        igmpProcessor.recordReport(ifaceId, transport.groupAddress);
      } else if (transport.igmpType === 'v2-leave-group') {
        igmpProcessor.recordLeave(ifaceId, transport.groupAddress);
      }
    }
  }

  return continueWith(ctx);
}
