import { isInSubnet } from '../../../utils/cidr';
import type { Vpnv4Route, VrfConfig, VrfRuntime } from '../../../types/tunneling';

export function installVpnv4Route(vrfs: readonly VrfConfig[], route: Vpnv4Route): VrfRuntime[] {
  return vrfs.map((config) => ({
    config,
    routes: config.importRts.some((importRt) =>
      route.routeTargets.some((rt) => rt.value === importRt.value),
    )
      ? [route]
      : [],
  }));
}

export function lookupVrfRoute(vrf: VrfRuntime, destinationIp: string): Vpnv4Route | null {
  return vrf.routes.find((route) => isInSubnet(destinationIp, route.prefix)) ?? null;
}
