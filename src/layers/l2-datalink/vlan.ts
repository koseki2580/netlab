import type {
  ArpEthernetFrame,
  EthernetFrame,
} from '../../types/packets';
import type { SwitchPort } from '../../types/topology';

export const DEFAULT_VLAN_ID = 1;
const MIN_VLAN_ID = 1;
const MAX_VLAN_ID = 4094;
const DEFAULT_VLAN_TAG = {
  tpid: 0x8100 as const,
  pcp: 0,
  dei: 0 as const,
};

type VlanFrame = EthernetFrame | ArpEthernetFrame;

function getPortMode(port: SwitchPort): 'access' | 'trunk' {
  return port.vlanMode ?? 'access';
}

function getAccessVlan(port: SwitchPort): number {
  return port.accessVlan ?? DEFAULT_VLAN_ID;
}

function getNativeVlan(port: SwitchPort): number {
  return port.nativeVlan ?? DEFAULT_VLAN_ID;
}

export function isValidVlanId(vid: number): boolean {
  return Number.isInteger(vid) && vid >= MIN_VLAN_ID && vid <= MAX_VLAN_ID;
}

export function tagFrame<F extends VlanFrame>(frame: F, vid: number): F {
  if (frame.vlanTag) {
    return { ...frame };
  }

  return {
    ...frame,
    vlanTag: {
      ...DEFAULT_VLAN_TAG,
      vid,
    },
  };
}

export function stripTag<F extends VlanFrame>(frame: F): F {
  if (!frame.vlanTag) {
    return frame;
  }

  const { vlanTag: _vlanTag, ...rest } = frame;
  return rest as F;
}

export function isVlanAllowedOnPort(port: SwitchPort, vlanId: number): boolean {
  if (!isValidVlanId(vlanId)) {
    return false;
  }

  if (getPortMode(port) === 'access') {
    return getAccessVlan(port) === vlanId;
  }

  if (getNativeVlan(port) === vlanId) {
    return true;
  }

  return port.trunkAllowedVlans === undefined
    ? true
    : port.trunkAllowedVlans.includes(vlanId);
}

export function resolveIngressVlan(
  port: SwitchPort,
  frame: VlanFrame,
): number | null {
  if (getPortMode(port) === 'access') {
    if (frame.vlanTag) {
      return null;
    }

    const accessVlan = getAccessVlan(port);
    return isValidVlanId(accessVlan) ? accessVlan : null;
  }

  if (!frame.vlanTag) {
    const nativeVlan = getNativeVlan(port);
    return isValidVlanId(nativeVlan) ? nativeVlan : null;
  }

  if (!isVlanAllowedOnPort(port, frame.vlanTag.vid)) {
    return null;
  }

  return frame.vlanTag.vid;
}

export function prepareEgressFrame<F extends VlanFrame>(
  frame: F,
  port: SwitchPort,
  vlanId: number,
): F {
  if (getPortMode(port) === 'access') {
    return stripTag(frame);
  }

  if (getNativeVlan(port) === vlanId) {
    return stripTag(frame);
  }

  return tagFrame(stripTag(frame), vlanId);
}
