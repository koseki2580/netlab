import { makeInterfaceFailureId } from '../../../../types/failure';
import {
  appendDropHop,
  breakWith,
  continueWith,
  type LoopContext,
  requireHopBase,
  requireNode,
  type StageResult,
} from './_shared';

export function runRouterPostRoutingStage(ctx: LoopContext): StageResult {
  const node = requireNode(ctx);
  const hopBase = requireHopBase(ctx);

  if (node.data.role !== 'router') {
    return continueWith(ctx);
  }

  if (ctx.routerEgressInterface) {
    hopBase.egressInterfaceId = ctx.routerEgressInterface.id;
    hopBase.egressInterfaceName = ctx.routerEgressInterface.name;
  }

  if (
    ctx.routerEgressInterface &&
    ctx.shared.failureState.downInterfaceIds.has(
      makeInterfaceFailureId(ctx.current, ctx.routerEgressInterface.id),
    )
  ) {
    appendDropHop(ctx, 'interface-down', ctx.workingPacket, {}, { aclMatch: ctx.ingressAclMatch });
    return breakWith(ctx);
  }

  const aclProcessor = ctx.deps.services.getAclProcessor(ctx.current);
  if (aclProcessor) {
    const egressResult = aclProcessor.applyEgress(
      ctx.workingPacket,
      hopBase.egressInterfaceId,
      ctx.stepCounter,
    );
    ctx.egressAclMatch = egressResult.match;
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

  const natProcessor = ctx.deps.services.getNatProcessor(ctx.current);
  if (natProcessor) {
    const postRoutingResult = natProcessor.applyPostRouting(
      ctx.workingPacket,
      hopBase.ingressInterfaceId,
      hopBase.egressInterfaceId,
      ctx.stepCounter,
      ctx.outsideToInsideMatched,
    );
    if (postRoutingResult.dropReason) {
      appendDropHop(
        ctx,
        postRoutingResult.dropReason,
        postRoutingResult.packet,
        {},
        {
          aclMatch: ctx.egressAclMatch ?? ctx.ingressAclMatch,
          natTranslation: postRoutingResult.translation ?? ctx.natTranslation,
        },
      );
      return breakWith(ctx);
    }

    ctx.workingPacket = postRoutingResult.packet;
    ctx.natTranslation = postRoutingResult.translation ?? ctx.natTranslation;
  }

  return continueWith(ctx);
}
