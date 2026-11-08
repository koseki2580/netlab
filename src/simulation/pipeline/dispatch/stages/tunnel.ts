import { isIpv6Packet } from '../../../../types/packets';
import { continueWith, type HopContext, type StageResult } from './_shared';

/**
 * The packs' encapsulation hooks in the engine (REQ-304, REQ-331). A router with a GRE
 * tunnel interface or a VXLAN VTEP loads the tunnel code on first use; any other hop
 * passes untouched, at once.
 */
export function runTunnelStage(ctx: HopContext): StageResult | Promise<StageResult> {
  const { node, ipPacket } = ctx.hop;
  const tunnels =
    node.data.vtep !== undefined || node.data.interfaces?.some((iface) => iface.greTunnel);
  if (node.data.role !== 'router' || !tunnels || isIpv6Packet(ipPacket)) return continueWith(ctx);
  return import('./tunnelHop').then((module) => module.tunnelHop(ctx));
}
