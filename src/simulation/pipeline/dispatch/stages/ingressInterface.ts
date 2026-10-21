import { continueWith, type HopContext, type StageResult } from './_shared';

export function runIngressInterfaceStage(ctx: HopContext): StageResult {
  const hopBase = ctx.hop.base;
  if (ctx.ingressFrom !== null) {
    const ingressInterface =
      (ctx.senderIp ? ctx.deps.ifaceResolver.resolveIngress(ctx.current, ctx.senderIp) : null) ??
      ctx.deps.portResolver.resolvePortFromEdge(ctx.current, ctx.ingressEdgeId ?? '', 'ingress');
    if (ingressInterface) {
      hopBase.ingressInterfaceId = ingressInterface.id;
      hopBase.ingressInterfaceName = ingressInterface.name;
    }
  }

  return continueWith(ctx);
}
