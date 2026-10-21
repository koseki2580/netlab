export {
  MAX_HOPS,
  BROADCAST_IP,
  isIgmpMessage,
  appendDropHop,
  createLoopContext,
  type ForwardingStageDependencies,
  type LoopContext,
  type StageResult,
} from './stages/_shared';

import type { HopContext, LoopContext, RoutedContext, StageResult } from './stages/_shared';
import { runArpInjectionStage } from './stages/arpInjection';
import { runDeliverToSelfStage } from './stages/deliverToSelf';
import { runEgressFramingAndFragmentationStage } from './stages/egressFraming';
import { runForwardCommitStage } from './stages/forwardCommit';
import { runForwarderDispatchStage } from './stages/forwarderDispatch';
import { runIngressInterfaceStage } from './stages/ingressInterface';
import { runLinkQosStage } from './stages/linkQos';
import { runObservabilityStage } from './stages/observability';
import { runPreflightStage } from './stages/preflight';
import { runRouterPostRoutingStage } from './stages/routerPostRouting';
import { runRouterPreRoutingStage } from './stages/routerPreRouting';

type Pending = StageResult | Promise<StageResult>;

/**
 * One step of a hop, with what it needs: nothing yet (`start`), the hop's
 * facts (`hop`, after preflight), or this hop's routing record (`routed`,
 * after pre-routing). It carries on, stops this traversal, or returns.
 */
export type ForwardingStage =
  | { readonly needs: 'start'; readonly run: (ctx: LoopContext) => Pending }
  | { readonly needs: 'hop'; readonly run: (ctx: HopContext) => Pending }
  | { readonly needs: 'routed'; readonly run: (ctx: RoutedContext) => Pending };

/** The stages of one hop, in the order they run. */
export const FORWARDING_STAGES: readonly ForwardingStage[] = [
  { needs: 'start', run: runPreflightStage },
  { needs: 'hop', run: runDeliverToSelfStage },
  { needs: 'hop', run: runIngressInterfaceStage },
  { needs: 'hop', run: runRouterPreRoutingStage },
  { needs: 'routed', run: runForwarderDispatchStage },
  { needs: 'routed', run: runRouterPostRoutingStage },
  { needs: 'routed', run: runArpInjectionStage },
  { needs: 'routed', run: runEgressFramingAndFragmentationStage },
  { needs: 'routed', run: runObservabilityStage },
  { needs: 'routed', run: runLinkQosStage },
  { needs: 'routed', run: runForwardCommitStage },
];

function hasHop(ctx: LoopContext): ctx is HopContext {
  return ctx.hop !== null;
}

/** Whether the routing record is this hop's: pre-routing made it from this hop's packet. */
function isRouted(ctx: LoopContext, routedAt: LoopContext['routing']): ctx is RoutedContext {
  return ctx.hop !== null && ctx.routing !== null && ctx.routing === routedAt;
}

/**
 * Run `stage` on `ctx`, checking once that what it needs exists. The stages
 * then read it without guards of their own.
 */
export function runStage(
  stage: ForwardingStage,
  ctx: LoopContext,
  routedAt: LoopContext['routing'],
): Pending {
  switch (stage.needs) {
    case 'start':
      return stage.run(ctx);
    case 'hop':
      if (!hasHop(ctx)) throw new Error('ForwardingLoop stage requires hop facts');
      return stage.run(ctx);
    case 'routed':
      if (!isRouted(ctx, routedAt)) throw new Error('ForwardingLoop stage requires hop routing');
      return stage.run(ctx);
  }
}
