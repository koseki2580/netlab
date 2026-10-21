import { appendHop, continueWith, type RoutedContext, type StageResult } from './_shared';

export function runForwardCommitStage(ctx: RoutedContext): StageResult {
  const next = ctx.routing.next;
  if (!next || !ctx.routing.forwardHop) {
    return continueWith(ctx);
  }

  appendHop(ctx, ctx.routing.forwardHop, ctx.workingPacket);

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
