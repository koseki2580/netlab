import { makeInterfaceFailureId } from '../../../../types/failure';
import { isReservedInterface } from '../../../AddressPlane';
import {
  appendDropHop,
  breakWith,
  continueWith,
  type RoutedContext,
  type StageResult,
} from './_shared';

export function runRouterPostRoutingStage(ctx: RoutedContext): StageResult {
  const node = ctx.hop.node;
  const hopBase = ctx.hop.base;

  if (node.data.role !== 'router') {
    return continueWith(ctx);
  }

  if (ctx.routing.routerEgressInterface) {
    hopBase.egressInterfaceId = ctx.routing.routerEgressInterface.id;
    hopBase.egressInterfaceName = ctx.routing.routerEgressInterface.name;
  }

  if (
    ctx.routing.routerEgressInterface &&
    ctx.shared.failureState.downInterfaceIds.has(
      makeInterfaceFailureId(ctx.current, ctx.routing.routerEgressInterface.id),
    )
  ) {
    appendDropHop(
      ctx,
      'interface-down',
      ctx.workingPacket,
      {},
      { aclMatch: ctx.routing.ingressAclMatch },
    );
    return breakWith(ctx);
  }

  // A side given its network's network or broadcast address carries nothing.
  if (
    [hopBase.ingressInterfaceId, hopBase.egressInterfaceId].some((id) => {
      const iface = ctx.deps.ifaceResolver.findLogicalById(ctx.current, id);
      return iface !== null && isReservedInterface(iface);
    })
  ) {
    appendDropHop(
      ctx,
      'reserved-address',
      ctx.workingPacket,
      {},
      {
        aclMatch: ctx.routing.ingressAclMatch,
      },
    );
    return breakWith(ctx);
  }

  const aclProcessor = ctx.deps.services.processors.getAclProcessor(ctx.current);
  if (aclProcessor) {
    const egressResult = aclProcessor.applyEgress(
      ctx.workingPacket,
      hopBase.egressInterfaceId,
      ctx.stepCounter,
    );
    ctx.routing.egressAclMatch = egressResult.match;
    if (egressResult.dropReason) {
      appendDropHop(
        ctx,
        egressResult.dropReason,
        egressResult.packet,
        {},
        {
          aclMatch: egressResult.match,
        },
      );
      return breakWith(ctx);
    }

    ctx.workingPacket = egressResult.packet;
  }

  const natProcessor = ctx.deps.services.processors.getNatProcessor(ctx.current);
  if (natProcessor) {
    const postRoutingResult = natProcessor.applyPostRouting(
      ctx.workingPacket,
      hopBase.ingressInterfaceId,
      hopBase.egressInterfaceId,
      ctx.stepCounter,
      ctx.routing.outsideToInsideMatched,
    );
    if (postRoutingResult.dropReason) {
      appendDropHop(
        ctx,
        postRoutingResult.dropReason,
        postRoutingResult.packet,
        {},
        {
          aclMatch: ctx.routing.egressAclMatch ?? ctx.routing.ingressAclMatch,
          natTranslation: postRoutingResult.translation ?? ctx.routing.natTranslation,
        },
      );
      return breakWith(ctx);
    }

    ctx.workingPacket = postRoutingResult.packet;
    ctx.routing.natTranslation = postRoutingResult.translation ?? ctx.routing.natTranslation;
  }

  return continueWith(ctx);
}
