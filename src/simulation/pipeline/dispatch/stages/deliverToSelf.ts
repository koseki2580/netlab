import { Reassembler } from '../../../Reassembler';
import {
  appendHop,
  breakWith,
  BROADCAST_IP,
  continueWith,
  type LoopContext,
  requireHopBase,
  requireNode,
  type StageResult,
} from './_shared';

export function runDeliverToSelfStage(ctx: LoopContext): StageResult {
  const node = requireNode(ctx);
  const hopBase = requireHopBase(ctx);
  const ipPacket = ctx.ipPacket ?? ctx.workingPacket.frame.payload;

  if (
    ipPacket.dstIp === BROADCAST_IP &&
    ctx.workingPacket.dstNodeId === ctx.current &&
    (node.data.dhcpServer != null || node.data.dhcpClient != null)
  ) {
    appendHop(ctx, { ...hopBase, event: 'deliver' }, ctx.workingPacket);
    return breakWith(ctx);
  }

  if (
    ctx.workingPacket.dstNodeId === ctx.current &&
    node.data.role !== 'switch' &&
    ctx.deps.macResolver.nodeOwnsIp(node, ipPacket.dstIp)
  ) {
    const isFragmentedPacket =
      ipPacket.identification !== undefined &&
      (ipPacket.flags?.mf === true || (ipPacket.fragmentOffset ?? 0) > 0);

    if (isFragmentedPacket) {
      const reassembler = ctx.shared.reassemblers.get(ctx.current) ?? new Reassembler();
      ctx.shared.reassemblers.set(ctx.current, reassembler);
      const reassembledPacket = reassembler.accept(ipPacket);

      if (!reassembledPacket) {
        appendHop(
          ctx,
          { ...hopBase, event: 'deliver', action: 'reassembly-pending' },
          ctx.workingPacket,
        );
        return breakWith(ctx);
      }

      const deliveredPacket = ctx.deps.frameMaterializer.withFrameFcs(
        ctx.deps.frameMaterializer.withIpv4HeaderChecksum({
          ...ctx.workingPacket,
          frame: {
            ...ctx.workingPacket.frame,
            payload: reassembledPacket,
          },
        }),
      );
      const fragmentCount = reassembler.getLastCompletedFragmentCount();
      appendHop(
        ctx,
        {
          ...hopBase,
          event: 'deliver',
          action: 'reassembly-complete',
          ...(fragmentCount != null ? { fragmentCount } : {}),
        },
        deliveredPacket,
      );
      return breakWith(ctx);
    }

    appendHop(ctx, { ...hopBase, event: 'deliver' }, ctx.workingPacket);
    return breakWith(ctx);
  }

  return continueWith(ctx);
}
