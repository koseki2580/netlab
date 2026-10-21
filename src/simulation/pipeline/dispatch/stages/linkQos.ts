import type { FailureState } from '../../../../types/failure';
import type { InFlightPacket } from '../../../../types/packets';
import type { PacketHop } from '../../../../types/simulation';
import { packetSizeBytes } from '../../../fragmentation';
import { stepsToPropagate, stepsToTransmit } from '../../../LinkQueue';
import type { LinkQueueRegistry } from '../../../LinkQueueRegistry';
import {
  breakWith,
  continueWith,
  type ForwardingStageDependencies,
  type RoutedContext,
  type StageResult,
} from './_shared';

export function runLinkQosStage(ctx: RoutedContext): StageResult {
  const next = ctx.routing.next;
  if (!next || !ctx.routing.forwardHop) {
    return continueWith(ctx);
  }

  const qosResult = appendLinkQosTrace(
    ctx.deps,
    ctx.routing.forwardHop,
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

/**
 * The hops a frame earns on a link with QoS: enqueued (and classified by a
 * shaper), then dequeued and arrived, or dropped when the link is down, its
 * queue is full, or it loses the frame. Appends nothing on a plain link.
 */
export function appendLinkQosTrace(
  deps: Pick<ForwardingStageDependencies, 'topology' | 'traceRecorder' | 'frameMaterializer'>,
  hopBase: Omit<PacketHop, 'step'>,
  workingPacket: InFlightPacket,
  edgeId: string,
  stepCounter: number,
  hops: PacketHop[],
  snapshots: InFlightPacket[],
  failureState: FailureState,
  linkQueues: LinkQueueRegistry,
): { stepCounter: number; dropped: boolean } {
  const edge = deps.topology.edges.find((candidate) => candidate.id === edgeId) ?? null;
  const queue = linkQueues.getOrCreate(edgeId, edge?.data?.link);
  if (!queue) {
    return { stepCounter, dropped: false };
  }

  const byteLength = packetSizeBytes(workingPacket.frame.payload);
  const enqueueStep = stepCounter;
  const packetDscp = workingPacket.frame.payload.dscp ?? 0;
  const queueDepth = () => {
    const state = queue.getState();
    if (state.shaper) {
      return state.shaper.classes.reduce((total, klass) => total + klass.queue.length, 0);
    }
    return state.queue.length;
  };

  if (failureState.downEdgeIds.has(edgeId) || edge?.data?.state === 'down') {
    stepCounter = deps.traceRecorder.appendHop(
      hops,
      snapshots,
      deps.frameMaterializer.withPacketMacs(
        {
          ...hopBase,
          event: 'drop',
          action: 'link:dropped',
          activeEdgeId: edgeId,
          reason: 'link-failed',
          linkQos: { edgeId, segSeq: 0, queueDepth: 0, reason: 'link-failed' },
        },
        workingPacket,
      ),
      workingPacket,
      stepCounter,
    );
    return { stepCounter, dropped: true };
  }

  const enqueue = queue.enqueue({ id: workingPacket.id, byteLength }, enqueueStep, packetDscp);
  if (enqueue.status === 'dropped') {
    stepCounter = deps.traceRecorder.appendHop(
      hops,
      snapshots,
      deps.frameMaterializer.withPacketMacs(
        {
          ...hopBase,
          event: 'drop',
          action: enqueue.reason === 'class-queue-full' ? 'shaper:dropped' : 'link:dropped',
          activeEdgeId: edgeId,
          reason: enqueue.reason,
          ...(enqueue.classId
            ? {
                shaperTrace: {
                  edgeId,
                  classId: enqueue.classId,
                  dscp: packetDscp,
                  segSeq: enqueue.segSeq,
                  queueDepth: enqueue.queueDepth,
                  reason: enqueue.reason,
                },
              }
            : {}),
          linkQos: {
            edgeId,
            segSeq: enqueue.segSeq,
            queueDepth: enqueue.queueDepth,
            reason: enqueue.reason,
          },
        },
        workingPacket,
      ),
      workingPacket,
      stepCounter,
    );
    return { stepCounter, dropped: true };
  }

  if (enqueue.classId) {
    stepCounter = deps.traceRecorder.appendHop(
      hops,
      snapshots,
      deps.frameMaterializer.withPacketMacs(
        {
          ...hopBase,
          event: 'forward',
          action: 'shaper:classified',
          activeEdgeId: edgeId,
          shaperTrace: {
            edgeId,
            classId: enqueue.classId,
            dscp: packetDscp,
            segSeq: enqueue.segSeq,
            queueDepth: enqueue.queueDepth,
          },
        },
        workingPacket,
      ),
      workingPacket,
      stepCounter,
    );
  }

  stepCounter = deps.traceRecorder.appendHop(
    hops,
    snapshots,
    deps.frameMaterializer.withPacketMacs(
      {
        ...hopBase,
        event: 'forward',
        action: 'link:enqueued',
        activeEdgeId: edgeId,
        linkQos: {
          edgeId,
          segSeq: enqueue.segSeq,
          queueDepth: enqueue.queueDepth,
        },
      },
      workingPacket,
    ),
    workingPacket,
    stepCounter,
  );

  const txStartAtStep = stepCounter;
  const firstTick = queue.tickStep(txStartAtStep);
  const loss = firstTick.dropped[0];
  if (loss) {
    stepCounter = deps.traceRecorder.appendHop(
      hops,
      snapshots,
      deps.frameMaterializer.withPacketMacs(
        {
          ...hopBase,
          event: 'drop',
          action: 'link:dropped',
          activeEdgeId: edgeId,
          reason: loss.reason,
          linkQos: {
            edgeId,
            segSeq: loss.queued.seq,
            queueDepth: queueDepth(),
            reason: loss.reason,
          },
        },
        workingPacket,
      ),
      workingPacket,
      stepCounter,
    );
    return { stepCounter, dropped: true };
  }

  const dequeued = firstTick.dequeued[0];
  if (!dequeued) {
    return { stepCounter, dropped: false };
  }

  stepCounter = deps.traceRecorder.appendHop(
    hops,
    snapshots,
    deps.frameMaterializer.withPacketMacs(
      {
        ...hopBase,
        event: 'forward',
        action: dequeued.classId ? 'shaper:dequeued' : 'link:dequeued',
        activeEdgeId: edgeId,
        ...(dequeued.classId
          ? {
              shaperTrace: {
                edgeId,
                classId: dequeued.classId,
                dscp: packetDscp,
                segSeq: dequeued.queued.seq,
                queueDepth: queueDepth(),
                ...(dequeued.deficit !== undefined ? { deficit: dequeued.deficit } : {}),
              },
            }
          : {}),
        linkQos: {
          edgeId,
          segSeq: dequeued.queued.seq,
          queueDepth: queueDepth(),
          txStartAtStep: dequeued.txStartAtStep,
          txEndAtStep: dequeued.txEndAtStep,
        },
      },
      workingPacket,
    ),
    workingPacket,
    stepCounter,
  );

  const cfg = edge?.data?.link ?? {};
  const arrivalStep =
    dequeued.txStartAtStep +
    stepsToTransmit(byteLength, cfg.bandwidthBps) +
    stepsToPropagate(cfg.propagationDelayMs);
  queue.tickStep(dequeued.txEndAtStep);
  queue.tickStep(arrivalStep);

  stepCounter = deps.traceRecorder.appendHop(
    hops,
    snapshots,
    deps.frameMaterializer.withPacketMacs(
      {
        ...hopBase,
        event: 'forward',
        action: 'link:arrived',
        activeEdgeId: edgeId,
        linkQos: {
          edgeId,
          segSeq: dequeued.queued.seq,
          queueDepth: queueDepth(),
          totalLatencySteps: arrivalStep - dequeued.txStartAtStep,
        },
      },
      workingPacket,
    ),
    workingPacket,
    arrivalStep,
  );

  return { stepCounter, dropped: false };
}
