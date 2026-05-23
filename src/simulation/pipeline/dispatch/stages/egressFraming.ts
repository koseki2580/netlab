import type { InFlightPacket } from '../../../../types/packets';
import type { PacketHop } from '../../../../types/simulation';
import { effectiveMtu, fragment, packetSizeBytes } from '../../../fragmentation';
import {
  appendDropHop,
  appendHop,
  breakWith,
  continueWith,
  type LoopContext,
  requireHopBase,
  requireNode,
  requirePacketBeforeHop,
  type StageResult,
} from './_shared';

export async function runEgressFramingAndFragmentationStage(
  ctx: LoopContext,
): Promise<StageResult> {
  const node = requireNode(ctx);
  const hopBase = requireHopBase(ctx);
  const next = ctx.next;
  if (!next) {
    return continueWith(ctx);
  }

  if (node.data.role === 'router') {
    const egressIface = ctx.deps.ifaceResolver.findLogicalById(
      ctx.current,
      hopBase.egressInterfaceId,
    );
    const egressEdge = ctx.deps.topology.edges.find((candidate) => candidate.id === next.edgeId);
    const mtu = effectiveMtu(egressEdge?.data?.mtuBytes, egressIface?.mtu);
    const size = packetSizeBytes(ctx.workingPacket.frame.payload);

    if (size > mtu && ctx.workingPacket.frame.payload.flags?.df === true) {
      const extras: Partial<Omit<PacketHop, 'step' | 'event' | 'reason'>> = { nextHopMtu: mtu };
      const routerIp = hopBase.ingressInterfaceId
        ? ctx.deps.ifaceResolver.findLogicalById(ctx.current, hopBase.ingressInterfaceId)?.ipAddress
        : ctx.deps.getEffectiveNodeIp(node);
      if (
        routerIp &&
        !ctx.shared.options.suppressGeneratedIcmp &&
        ctx.deps.icmpBuilder.shouldEmitGeneratedIcmp(ctx.workingPacket.frame.payload.srcIp)
      ) {
        extras.icmpGenerated = true;
        ctx.generatedIcmpPackets.push(
          ctx.deps.icmpBuilder.buildFragmentationNeeded(
            ctx.current,
            routerIp,
            ctx.workingPacket,
            mtu,
          ),
        );
      }
      appendDropHop(ctx, 'fragmentation-needed', ctx.workingPacket, extras, {
        aclMatch: ctx.egressAclMatch ?? ctx.ingressAclMatch,
      });
      return breakWith(ctx);
    }

    if (size > mtu) {
      const identification =
        ctx.workingPacket.frame.payload.identification ??
        ctx.deps.frameMaterializer.derivePacketIdentification(ctx.workingPacket);
      const fragments = fragment(ctx.workingPacket.frame.payload, mtu, identification);
      const nextIngressPort = ctx.deps.portResolver.resolvePortFromEdge(
        next.nodeId,
        next.edgeId,
        'ingress',
      );
      const fragmentAclMatch = ctx.egressAclMatch ?? ctx.ingressAclMatch ?? undefined;
      ctx.senderIp = egressIface?.ipAddress ?? null;

      for (const [fragmentIndex, fragmentPayload] of fragments.entries()) {
        let fragmentPacket: InFlightPacket = {
          ...ctx.workingPacket,
          frame: {
            ...ctx.workingPacket.frame,
            payload: fragmentPayload,
            srcMac: egressIface?.macAddress ?? ctx.workingPacket.frame.srcMac,
            dstMac: ctx.resolvedDstMac ?? ctx.workingPacket.frame.dstMac,
          },
        };
        fragmentPacket = ctx.deps.frameMaterializer.withFrameFcs(
          ctx.deps.frameMaterializer.withIpv4HeaderChecksum(fragmentPacket),
        );

        const fragmentHop: Omit<PacketHop, 'step'> = {
          ...hopBase,
          event: ctx.forwardEvent ?? 'forward',
          toNodeId: next.nodeId,
          activeEdgeId: next.edgeId,
          action: 'fragment',
          fragmentIndex,
          fragmentCount: fragments.length,
          identification,
          nextHopMtu: mtu,
        };
        if (ctx.natTranslation) {
          fragmentHop.natTranslation = ctx.natTranslation;
        }
        if (fragmentAclMatch) {
          fragmentHop.aclMatch = fragmentAclMatch;
        }
        const changedFields = ctx.deps.frameMaterializer.diffPacketFields(
          ctx.packetBeforeForward ?? requirePacketBeforeHop(ctx),
          fragmentPacket,
        );
        if (changedFields.length > 0) {
          fragmentHop.changedFields = changedFields;
        }
        appendHop(ctx, fragmentHop, fragmentPacket);

        const forwardedFragment: InFlightPacket = {
          ...fragmentPacket,
          currentDeviceId: next.nodeId,
          ingressPortId: nextIngressPort?.id ?? fragmentPacket.ingressPortId,
        };
        const fragmentResult = await ctx.deps.runFragment(
          {
            packet: forwardedFragment,
            current: next.nodeId,
            ingressFrom: ctx.current,
            ingressEdgeId: next.edgeId,
            senderIp: ctx.senderIp,
            stepCounter: ctx.stepCounter,
            baseTs: ctx.baseTs,
            visitedStates: new Set(ctx.visitedStates),
          },
          ctx.shared,
        );
        ctx.stepCounter = fragmentResult.stepCounter;
        ctx.generatedIcmpPackets.push(...fragmentResult.generatedIcmpPackets);
      }

      return {
        kind: 'return',
        value: { stepCounter: ctx.stepCounter, generatedIcmpPackets: ctx.generatedIcmpPackets },
      };
    }

    ctx.senderIp = egressIface?.ipAddress ?? null;
    ctx.workingPacket = ctx.deps.frameMaterializer.withFrameFcs({
      ...ctx.workingPacket,
      frame: {
        ...ctx.workingPacket.frame,
        srcMac: egressIface?.macAddress ?? ctx.workingPacket.frame.srcMac,
        dstMac: ctx.resolvedDstMac ?? ctx.workingPacket.frame.dstMac,
      },
    });
  } else if (node.data.role === 'client' || node.data.role === 'server') {
    ctx.senderIp = ctx.deps.getEffectiveNodeIp(node) ?? null;
    const resolvedSrcMac = ctx.deps.macResolver.resolveEndpointMac(ctx.current);
    ctx.workingPacket = ctx.deps.frameMaterializer.withFrameFcs({
      ...ctx.workingPacket,
      frame: {
        ...ctx.workingPacket.frame,
        srcMac:
          resolvedSrcMac && ctx.deps.macResolver.isPlaceholderMac(ctx.workingPacket.frame.srcMac)
            ? resolvedSrcMac
            : ctx.workingPacket.frame.srcMac,
        dstMac:
          ctx.resolvedDstMac &&
          ctx.deps.macResolver.isPlaceholderMac(ctx.workingPacket.frame.dstMac)
            ? ctx.resolvedDstMac
            : ctx.workingPacket.frame.dstMac,
      },
    });
  } else if (node.data.role === 'switch') {
    const egressPort = ctx.deps.portResolver.resolvePortFromEdge(
      ctx.current,
      next.edgeId,
      'egress',
    );
    if (egressPort) {
      hopBase.egressInterfaceId = egressPort.id;
      hopBase.egressInterfaceName = egressPort.name;
    }
  }

  return continueWith(ctx);
}
