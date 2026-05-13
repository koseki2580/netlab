import type { EvpnMacIpEntry, EvpnType2, EvpnType5 } from '../../../types/tunneling';

export function advertiseType2(input: Omit<EvpnType2, 'kind' | 'label1'>): EvpnType2 {
  return {
    kind: 'evpn-mac-ip',
    label1: input.vni,
    ...input,
  };
}

export function advertiseType5(input: Omit<EvpnType5, 'kind' | 'label'>): EvpnType5 {
  return {
    kind: 'evpn-ip-prefix',
    label: input.vni,
    ...input,
  };
}

export function learnType2(route: EvpnType2): EvpnMacIpEntry {
  return {
    vni: route.vni,
    mac: route.mac,
    ...(route.ip === undefined ? {} : { ip: route.ip }),
    remoteVtepIp: route.originVtepIp,
  };
}
