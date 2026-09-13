import { type RouteEntry, type RoutingProtocol } from '../../types/routing';
import type { NetworkTopology } from '../../types/topology';
import { networkAddress } from '../../utils/cidr';
import { isIpv6Address } from '../../utils/ipv6';

/**
 * The routes a router has simply because of the addresses on its own
 * interfaces.
 *
 * Nothing derived these, so a router reached a subnet only if the topology's
 * author had also written a static route for it. That is not how a router
 * behaves — giving an interface an address is what makes its subnet reachable —
 * and the omission was invisible until a lesson dropped its first packet: the
 * TCP handshake lesson's SYN died at the router as "no route", which is the one
 * segment that lesson exists to show.
 *
 * These win over every other source, as a connected route does on real
 * hardware: nothing a protocol learns can be a better way to reach a subnet the
 * router is already sitting on.
 */
export class ConnectedProtocol implements RoutingProtocol {
  name = 'connected' as const;
  adminDistance = 0;

  computeRoutes(topology: NetworkTopology): RouteEntry[] {
    const entries: RouteEntry[] = [];

    for (const node of topology.nodes) {
      if (node.data.role !== 'router') continue;

      for (const iface of node.data.interfaces ?? []) {
        // A sub-interface carries its own address, and on real hardware that
        // address installs its own connected route — which is what makes
        // router-on-a-stick reach each VLAN it terminates.
        for (const addressed of [iface, ...(iface.subInterfaces ?? [])]) {
          if (addressed.ipAddress) {
            entries.push({
              destination: `${networkAddress(addressed.ipAddress, addressed.prefixLength)}/${addressed.prefixLength}`,
              nextHop: 'direct',
              metric: 0,
              protocol: this.name,
              adminDistance: this.adminDistance,
              nodeId: node.id,
            });
          }

          const { ipv6Address, prefixLength6 } = addressed;
          if (ipv6Address && prefixLength6 !== undefined && isIpv6Address(ipv6Address)) {
            entries.push({
              af: 'v6',
              destination: `${ipv6Address}/${prefixLength6}`,
              nextHop: 'direct',
              metric: 0,
              protocol: this.name,
              adminDistance: this.adminDistance,
              nodeId: node.id,
            });
          }
        }
      }
    }

    return entries;
  }
}

export const connectedProtocol = new ConnectedProtocol();
