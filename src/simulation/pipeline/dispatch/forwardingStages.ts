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

export { runPreflightStage } from './stages/preflight';
export { runDeliverToSelfStage } from './stages/deliverToSelf';
export { runIngressInterfaceStage } from './stages/ingressInterface';
export { runRouterPreRoutingStage } from './stages/routerPreRouting';
export { runForwarderDispatchStage } from './stages/forwarderDispatch';
export { runRouterPostRoutingStage } from './stages/routerPostRouting';
export { runArpInjectionStage } from './stages/arpInjection';
export { runEgressFramingAndFragmentationStage } from './stages/egressFraming';
export { runObservabilityStage } from './stages/observability';
export { runLinkQosStage } from './stages/linkQos';
export { runForwardCommitStage } from './stages/forwardCommit';
