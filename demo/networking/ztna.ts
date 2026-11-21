/**
 * The ZTNA lesson (REQ-415): a remote worker reaching company apps through a
 * full-tunnel remote-access VPN versus zero-trust network access, where a
 * policy decides every request from identity, the app and device posture
 * (the idea NIST SP 800-207 describes as a policy engine and an enforcement
 * point in front of each resource).
 *
 * Simplified: one VPN ACL for everyone (permit 10.0.0.0/8), no posture check
 * at VPN connect time (some VPN products do one, but only at connect), a
 * posture made of two facts (managed? OS up to date?), and a fixed policy
 * table. Real products also weigh location, time, risk scores and MFA.
 */

export type AppId = 'hr' | 'code-repo' | 'finance-db' | 'printers' | 'wifi-admin';
export type UserId = 'engineer' | 'contractor' | 'engineer-stale';
export type Group = 'employees' | 'engineering' | 'contractors' | 'finance' | 'netops';

export interface App {
  readonly id: AppId;
  /** The app's internal address or subnet. */
  readonly prefix: string;
}

export const APPS: readonly App[] = [
  { id: 'hr', prefix: '10.1.0.10/32' },
  { id: 'code-repo', prefix: '10.2.0.20/32' },
  { id: 'finance-db', prefix: '10.3.0.30/32' },
  { id: 'printers', prefix: '10.4.0.0/24' },
  { id: 'wifi-admin', prefix: '10.5.0.5/32' },
];

export interface Device {
  readonly managed: boolean;
  readonly osUpToDate: boolean;
}

export interface User {
  readonly id: UserId;
  readonly groups: readonly Group[];
  readonly device: Device;
}

export const USERS: readonly User[] = [
  {
    id: 'engineer',
    groups: ['employees', 'engineering'],
    device: { managed: true, osUpToDate: true },
  },
  { id: 'contractor', groups: ['contractors'], device: { managed: false, osUpToDate: true } },
  {
    id: 'engineer-stale',
    groups: ['employees', 'engineering'],
    device: { managed: true, osUpToDate: false },
  },
];

/** The remote-access VPN gives every connected device this one ACL. */
export const VPN_ACL = '10.0.0.0/8';

/**
 * What a device must be for an app: `compliant` is managed and up to date;
 * `up-to-date` accepts a personal device whose OS is current.
 */
export type PostureRequirement = 'compliant' | 'up-to-date';

export interface Rule {
  readonly app: AppId;
  readonly groups: readonly Group[];
  readonly posture: PostureRequirement;
}

export const POLICY: readonly Rule[] = [
  { app: 'hr', groups: ['employees'], posture: 'compliant' },
  { app: 'code-repo', groups: ['engineering', 'contractors'], posture: 'up-to-date' },
  { app: 'finance-db', groups: ['finance'], posture: 'compliant' },
  { app: 'printers', groups: ['employees'], posture: 'compliant' },
  { app: 'wifi-admin', groups: ['netops'], posture: 'compliant' },
];

function parse(prefix: string): { readonly base: number; readonly length: number } {
  const [address, length] = prefix.split('/');
  const base = address!.split('.').reduce((value, octet) => value * 256 + Number(octet), 0);
  return { base, length: Number(length) };
}

/** How many addresses a prefix covers. */
export function addressCount(prefix: string): number {
  return 2 ** (32 - parse(prefix).length);
}

/** Whether `inner` lies entirely inside `outer`. */
export function contains(outer: string, inner: string): boolean {
  const o = parse(outer);
  const i = parse(inner);
  if (i.length < o.length) return false;
  const block = 2 ** (32 - o.length);
  return Math.floor(i.base / block) === Math.floor(o.base / block);
}

/** Model 1: the apps a VPN-connected device can open a connection to. Identity and posture play no part. */
export function vpnReachable(acl: string = VPN_ACL): AppId[] {
  return APPS.filter((app) => contains(acl, app.prefix)).map((app) => app.id);
}

export type Reason = 'allowed' | 'not-in-group' | 'unmanaged' | 'os-out-of-date';

export interface Decision {
  readonly app: AppId;
  readonly allow: boolean;
  readonly reason: Reason;
}

/** Model 2: the policy engine's answer to one request. Identity is checked first, then posture. */
export function decide(user: User, app: AppId, device: Device = user.device): Decision {
  const rule = POLICY.find((entry) => entry.app === app)!;
  if (!rule.groups.some((group) => user.groups.includes(group))) {
    return { app, allow: false, reason: 'not-in-group' };
  }
  if (!device.osUpToDate) return { app, allow: false, reason: 'os-out-of-date' };
  if (rule.posture === 'compliant' && !device.managed) {
    return { app, allow: false, reason: 'unmanaged' };
  }
  return { app, allow: true, reason: 'allowed' };
}

export type Model = 'vpn' | 'ztna';

export interface Exposure {
  /** Apps the device can use. */
  readonly apps: number;
  /** Internal addresses the device can send packets to directly. */
  readonly addresses: number;
}

/** What a device, if compromised, could reach. Under ZTNA only the proxy is reachable, not the apps. */
export function exposure(model: Model, user: User, device: Device = user.device): Exposure {
  if (model === 'vpn') return { apps: vpnReachable().length, addresses: addressCount(VPN_ACL) };
  return {
    apps: APPS.filter((app) => decide(user, app.id, device).allow).length,
    addresses: 0,
  };
}
