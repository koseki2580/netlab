import type { PacketHop } from '../../../../types/simulation';
import { NetflowExporter } from '../../../../observability/NetflowExporter';
import { SflowSampler } from '../../../../observability/SflowSampler';
import {
  continueWith,
  type LoopContext,
  requireHopBase,
  requireNode,
  requirePacketBeforeHop,
  type StageResult,
} from './_shared';

export function runObservabilityStage(ctx: LoopContext): StageResult {
  const node = requireNode(ctx);
  const hopBase = requireHopBase(ctx);
  const next = ctx.next;
  if (!next) {
    return continueWith(ctx);
  }

  const forwardHop: Omit<PacketHop, 'step'> = {
    ...hopBase,
    event: ctx.forwardEvent ?? 'forward',
    toNodeId: next.nodeId,
    activeEdgeId: next.edgeId,
  };
  if (ctx.natTranslation) {
    forwardHop.natTranslation = ctx.natTranslation;
  }
  const forwardAclMatch = ctx.egressAclMatch ?? ctx.ingressAclMatch;
  if (forwardAclMatch != null) {
    forwardHop.aclMatch = forwardAclMatch;
  }
  const changedFields = ctx.deps.frameMaterializer.diffPacketFields(
    ctx.packetBeforeForward ?? requirePacketBeforeHop(ctx),
    ctx.workingPacket,
  );
  if (changedFields.length > 0) {
    forwardHop.changedFields = changedFields;
  }
  ctx.forwardHop = forwardHop;

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
      ctx.stepCounter = ctx.deps.appendObservabilityTrace(
        forwardHop,
        {
          kind: 'netflow:flow-update',
          routerId: update.routerId,
          flowKey: update.flowKey,
          packets: update.packets ?? 0,
          bytes: update.bytes ?? 0,
        },
        ctx.workingPacket,
        ctx.stepCounter,
        ctx.shared.hops,
        ctx.shared.snapshots,
      );
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
        ctx.stepCounter = ctx.deps.appendObservabilityTrace(
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
          ctx.workingPacket,
          ctx.stepCounter,
          ctx.shared.hops,
          ctx.shared.snapshots,
        );
      }
    }
  }

  return continueWith(ctx);
}
