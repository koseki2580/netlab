import type { ObservabilityTrace, PacketHop } from '../../../../types/simulation';
import { NetflowExporter } from '../../../../observability/NetflowExporter';
import { SflowSampler } from '../../../../observability/SflowSampler';
import {
  appendHop,
  continueWith,
  type LoopContext,
  type RoutedContext,
  type StageResult,
} from './_shared';

/** A flow-export event, written as a hop of its own beside the forward. */
function appendObservabilityHop(
  ctx: LoopContext,
  forwardHop: Omit<PacketHop, 'step'>,
  trace: ObservabilityTrace,
): void {
  appendHop(
    ctx,
    { ...forwardHop, event: 'forward', action: trace.kind, observabilityTrace: trace },
    ctx.workingPacket,
  );
}

export function runObservabilityStage(ctx: RoutedContext): StageResult {
  const node = ctx.hop.node;
  const hopBase = ctx.hop.base;
  const next = ctx.routing.next;
  if (!next) {
    return continueWith(ctx);
  }

  const forwardHop: Omit<PacketHop, 'step'> = {
    ...hopBase,
    event: ctx.routing.forwardEvent ?? 'forward',
    toNodeId: next.nodeId,
    activeEdgeId: next.edgeId,
  };
  if (ctx.routing.natTranslation) {
    forwardHop.natTranslation = ctx.routing.natTranslation;
  }
  const forwardAclMatch = ctx.routing.egressAclMatch ?? ctx.routing.ingressAclMatch;
  if (forwardAclMatch != null) {
    forwardHop.aclMatch = forwardAclMatch;
  }
  const changedFields = ctx.deps.frameMaterializer.diffPacketFields(
    ctx.routing.packetBeforeForward ?? ctx.routing.packetBeforeHop,
    ctx.workingPacket,
  );
  if (changedFields.length > 0) {
    forwardHop.changedFields = changedFields;
  }
  ctx.routing.forwardHop = forwardHop;

  if (node.data.role === 'router' && node.data.netflow?.enabled) {
    const exporter =
      ctx.netflowExporters.get(ctx.current) ??
      new NetflowExporter(ctx.current, node.data.netflow, ctx.flowCollector);
    ctx.netflowExporters.set(ctx.current, exporter);
    const update = exporter.observe(
      ctx.workingPacket,
      hopBase.ingressInterfaceId ?? 'unknown',
      hopBase.egressInterfaceId ?? 'unknown',
      ctx.stepCounter,
    );
    if (update) {
      appendObservabilityHop(ctx, forwardHop, {
        kind: 'netflow:flow-update',
        routerId: update.routerId,
        flowKey: update.flowKey,
        packets: update.packets ?? 0,
        bytes: update.bytes ?? 0,
      });
    }
  }

  if (node.data.role === 'switch' && node.data.sflow?.enabled) {
    const egressPortId = hopBase.egressInterfaceId ?? 'unknown';
    const port = (node.data.ports ?? []).find((candidate) => candidate.id === egressPortId);
    if (port?.sflowEnabled !== false) {
      const sampler =
        ctx.sflowSamplers.get(ctx.current) ??
        new SflowSampler(ctx.current, node.data.sflow, ctx.flowCollector);
      ctx.sflowSamplers.set(ctx.current, sampler);
      const update = sampler.observe(
        ctx.workingPacket.frame,
        ctx.workingPacket.ingressPortId || 'unknown',
        egressPortId,
        ctx.stepCounter,
      );
      if (update) {
        appendObservabilityHop(
          ctx,
          forwardHop,
          update.action === 'sflow:sampled'
            ? {
                kind: 'sflow:sampled',
                switchId: update.switchId,
                portId: update.portId,
                sequence: update.sequence,
              }
            : {
                kind: 'sflow:dropped',
                switchId: update.switchId,
                portId: update.portId,
                reason: update.reason,
              },
        );
      }
    }
  }

  return continueWith(ctx);
}
