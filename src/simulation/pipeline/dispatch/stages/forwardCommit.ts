import { appendHop, continueWith, type LoopContext, type StageResult } from './_shared';

export function runForwardCommitStage(ctx: LoopContext): StageResult {
  const next = ctx.next;
  if (!next || !ctx.forwardHop) {
    return continueWith(ctx);
  }

  appendHop(ctx, ctx.forwardHop, ctx.workingPacket);

  ctx.ingressFrom = ctx.current;
  ctx.ingressEdgeId = next.edgeId;
  const nextIngressPort = ctx.deps.portResolver.resolvePortFromEdge(
    next.nodeId,
    next.edgeId,
    'ingress',
  );
  ctx.workingPacket = {
    ...ctx.workingPacket,
    currentDeviceId: next.nodeId,
    ingressPortId: nextIngressPort?.id ?? ctx.workingPacket.ingressPortId,
  };
  ctx.current = next.nodeId;

  return continueWith(ctx);
}
