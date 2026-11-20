/** REQ-402 — protecting access ports (TC-2060..TC-2068). */
import { describe, expect, it } from 'vitest';
import {
  DEVICES,
  FRAME_KINDS,
  GUEST_VLAN,
  ROGUE_PORT,
  SNOOP_FRAMES,
  UPLINK,
  authenticate,
  inspect,
  portForwards,
  portSecurity,
  unauthorisedPasses,
} from './accessSecurity';

const device = (id: string) => DEVICES.find((entry) => entry.id === id)!;
const HUB = ['m1', 'm2', 'm3'];

describe('TC-2060: an unauthorised 802.1X port forwards only EAPOL', () => {
  it('before authentication only EAPOL passes; after it, every kind passes', () => {
    expect(unauthorisedPasses()).toEqual(['eapol']);
    expect(portForwards('unauthorised', 'dhcp')).toBe(false);
    expect(FRAME_KINDS.every((kind) => portForwards('authorised', kind))).toBe(true);
  });
});

describe('TC-2061: RADIUS names the VLAN with the RFC 3580 tunnel attributes', () => {
  it('the employee lands in VLAN 10 and the contractor in VLAN 30, at once', () => {
    const employee = authenticate(device('employee'), null);
    expect(employee).toMatchObject({
      method: '802.1X',
      radius: 'Access-Accept',
      portState: 'authorised',
      vlan: 10,
      waitS: 0,
    });
    expect(employee.attributes).toEqual({
      tunnelType: 13,
      tunnelMediumType: 6,
      tunnelPrivateGroupId: '10',
    });
    expect(authenticate(device('contractor'), null).vlan).toBe(30);
  });
});

describe('TC-2062: a device without a supplicant falls back to MAC Authentication Bypass', () => {
  it('the known printer lands in VLAN 40 after the 90 s EAP timeout', () => {
    expect(authenticate(device('printer'), null)).toMatchObject({
      method: 'MAB',
      radius: 'Access-Accept',
      vlan: 40,
      waitS: 90,
    });
  });
  it('an unknown camera is rejected: no access, or the guest VLAN when one is set', () => {
    expect(authenticate(device('camera'), null)).toMatchObject({
      radius: 'Access-Reject',
      portState: 'unauthorised',
      vlan: null,
    });
    expect(authenticate(device('camera'), GUEST_VLAN)).toMatchObject({
      radius: 'Access-Reject',
      vlan: 99,
      guest: true,
    });
  });
});

describe('TC-2063: port security with three devices on a port allowing one', () => {
  it('protect: the first device works, two frames are dropped silently', () => {
    expect(portSecurity(1, 'protect', HUB)).toEqual({
      port: 'up',
      allowed: [true, false, false],
      withAccess: 1,
      dropped: 2,
      logged: false,
    });
  });
  it('restrict: the same, but the violations are logged and counted', () => {
    expect(portSecurity(1, 'restrict', HUB)).toMatchObject({
      port: 'up',
      withAccess: 1,
      dropped: 2,
      logged: true,
    });
  });
  it('shutdown: the second device err-disables the port and nobody has access', () => {
    expect(portSecurity(1, 'shutdown', HUB)).toEqual({
      port: 'err-disabled',
      allowed: [false, false, false],
      withAccess: 0,
      dropped: 1,
      logged: true,
    });
  });
  it('raising the maximum to 3 lets all three in with no violation', () => {
    expect(portSecurity(3, 'shutdown', HUB)).toMatchObject({
      port: 'up',
      withAccess: 3,
      dropped: 0,
    });
  });
});

describe('TC-2064: DHCP snooping drops server messages on untrusted ports', () => {
  it('the home router’s OFFER on Gi0/5 is dropped; the real server’s is forwarded', () => {
    const { decisions } = inspect(SNOOP_FRAMES, [UPLINK]);
    expect(decisions.slice(0, 5).map((d) => d.action)).toEqual([
      'forward',
      'drop',
      'forward',
      'forward',
      'forward',
    ]);
    expect(decisions[1]!.reason).toBe('server-on-untrusted');
  });
  it('trusting Gi0/5 by mistake lets the rogue OFFER through', () => {
    const { decisions } = inspect(SNOOP_FRAMES, [UPLINK, ROGUE_PORT]);
    expect(decisions[1]!.action).toBe('forward');
  });
});

describe('TC-2065: the binding table is built from leases acknowledged on trusted ports', () => {
  it('one ACK gives one binding: the PC’s MAC, 10.0.10.21, on Gi0/2', () => {
    expect(inspect(SNOOP_FRAMES, [UPLINK]).bindings).toEqual([
      { mac: 'aa:00:00:00:00:21', ip: '10.0.10.21', port: 'Gi0/2' },
    ]);
  });
});

describe('TC-2066: dynamic ARP inspection checks ARP from untrusted ports against the bindings', () => {
  it('the PC’s ARP passes, the gateway’s on the trusted uplink passes, a false gateway claim and a static host are dropped', () => {
    const arp = inspect(SNOOP_FRAMES, [UPLINK]).decisions.slice(5);
    expect(arp).toEqual([
      { action: 'forward', reason: 'binding-match' },
      { action: 'forward', reason: 'trusted-arp' },
      { action: 'drop', reason: 'no-binding' },
      { action: 'drop', reason: 'no-binding' },
    ]);
  });
});
