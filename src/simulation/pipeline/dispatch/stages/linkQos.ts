import { breakWith, continueWith, type LoopContext, type StageResult } from './_shared';

export function runLinkQosStage(ctx: LoopContext): StageResult {
  const next = ctx.next;
  if (!next || !ctx.forwardHop) {
    return continueWith(ctx);
  }

  const qosResult = ctx.deps.appendLinkQosTrace(
    ctx.forwardHop,
    ctx.workingPacket,
    next.edgeId,
    ctx.stepCounter,
    ctx.shared.hops,
    ctx.shared.snapshots,
    ctx.shared.failureState,
    ctx.shared.linkQueues,
  );
  ctx.stepCounter = qosResult.stepCounter;
  if (qosResult.dropped) {
    return breakWith(ctx);
  }

  return continueWith(ctx);
}
