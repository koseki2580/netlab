/**
 * The access-port security lesson (REQ-402): what a switch lets through an
 * access port, and what it blocks, with 802.1X and RADIUS (IEEE 802.1X,
 * RFC 3580 for the VLAN attributes), port security, DHCP snooping and
 * dynamic ARP inspection.
 *
 * Simplified: an unauthorised 802.1X port passes only EAPOL (real switches
 * may also pass a few link-local protocols such as LLDP or CDP); the switch
 * falls back to MAC Authentication Bypass after sending its EAP request
 * `EAP_TRIES` times, `EAP_TX_PERIOD_S` apart (a common switch's defaults,
 * not a standard); each device in the port-security part sends one frame,
 * in the order listed; DAI checks a sender's IP, MAC and port against the
 * DHCP snooping bindings and nothing else (no rate limits, no option 82).
 */

// ---------------------------------------------------------------- 802.1X

export type FrameKind = 'eapol' | 'dhcp' | 'arp' | 'dns' | 'web';
export const FRAME_KINDS: readonly FrameKind[] = ['eapol', 'dhcp', 'arp', 'dns', 'web'];

export type PortState = 'unauthorised' | 'authorised';

/** Does an 802.1X port in `state` forward a frame of `kind` from the connected device? */
export function portForwards(state: PortState, kind: FrameKind): boolean {
  return state === 'authorised' || kind === 'eapol';
}

/** The frame kinds an unauthorised port forwards. */
export function unauthorisedPasses(): FrameKind[] {
  return FRAME_KINDS.filter((kind) => portForwards('unauthorised', kind));
}

export type DeviceId = 'employee' | 'contractor' | 'printer' | 'camera';

export interface Device {
  readonly id: DeviceId;
  readonly mac: string;
  /** The device runs an 802.1X supplicant and has credentials of this group. */
  readonly group: 'employee' | 'contractor' | null;
}

export const DEVICES: readonly Device[] = [
  { id: 'employee', mac: '3c:22:fb:10:00:01', group: 'employee' },
  { id: 'contractor', mac: '3c:22:fb:30:00:02', group: 'contractor' },
  { id: 'printer', mac: '00:1b:a9:40:00:03', group: null },
  { id: 'camera', mac: '00:40:8c:99:00:04', group: null },
];

/** The RADIUS server's policy: VLAN per 802.1X group, and the MAC addresses it knows. */
export const GROUP_VLAN: Readonly<Record<'employee' | 'contractor', number>> = {
  employee: 10,
  contractor: 30,
};
export const KNOWN_MACS: Readonly<Record<string, number>> = { '00:1b:a9:40:00:03': 40 };
export const GUEST_VLAN = 99;

export const EAP_TX_PERIOD_S = 30;
export const EAP_TRIES = 3;

/** RFC 3580 §3.31: the attributes that name a VLAN in an Access-Accept. */
export interface VlanAttributes {
  /** Tunnel-Type (64) = 13, VLAN. */
  readonly tunnelType: 13;
  /** Tunnel-Medium-Type (65) = 6, IEEE 802. */
  readonly tunnelMediumType: 6;
  /** Tunnel-Private-Group-ID (81): the VLAN, as a string. */
  readonly tunnelPrivateGroupId: string;
}

export interface AuthResult {
  readonly method: '802.1X' | 'MAB';
  readonly radius: 'Access-Accept' | 'Access-Reject';
  readonly attributes: VlanAttributes | null;
  readonly portState: PortState;
  /** The VLAN the device ends up in, or null when it gets no access. */
  readonly vlan: number | null;
  readonly guest: boolean;
  /** Seconds the switch waits for an EAPOL answer before trying MAB. */
  readonly waitS: number;
}

const accept = (vlan: number): VlanAttributes => ({
  tunnelType: 13,
  tunnelMediumType: 6,
  tunnelPrivateGroupId: String(vlan),
});

/** What happens when `device` is plugged into an 802.1X port with MAB as the fallback. */
export function authenticate(device: Device, guestVlan: number | null): AuthResult {
  if (device.group) {
    const vlan = GROUP_VLAN[device.group];
    return {
      method: '802.1X',
      radius: 'Access-Accept',
      attributes: accept(vlan),
      portState: 'authorised',
      vlan,
      guest: false,
      waitS: 0,
    };
  }
  const waitS = EAP_TX_PERIOD_S * EAP_TRIES;
  const known = KNOWN_MACS[device.mac];
  if (known !== undefined) {
    return {
      method: 'MAB',
      radius: 'Access-Accept',
      attributes: accept(known),
      portState: 'authorised',
      vlan: known,
      guest: false,
      waitS,
    };
  }
  return {
    method: 'MAB',
    radius: 'Access-Reject',
    attributes: null,
    portState: guestVlan === null ? 'unauthorised' : 'authorised',
    vlan: guestVlan,
    guest: guestVlan !== null,
    waitS,
  };
}

// --------------------------------------------------------- port security

export type ViolationMode = 'protect' | 'restrict' | 'shutdown';
export const VIOLATION_MODES: readonly ViolationMode[] = ['protect', 'restrict', 'shutdown'];

export interface PortSecurityResult {
  readonly port: 'up' | 'err-disabled';
  /** For each MAC, in the order its first frame arrived: does it get through? */
  readonly allowed: readonly boolean[];
  readonly withAccess: number;
  /** Frames dropped as violations. */
  readonly dropped: number;
  /** Does the switch log the violation and raise the violation counter? */
  readonly logged: boolean;
}

/** One frame from each MAC, in order, arrives on a port allowing `maxMacs` addresses. */
export function portSecurity(
  maxMacs: number,
  mode: ViolationMode,
  macs: readonly string[],
): PortSecurityResult {
  const learned: string[] = [];
  const allowed: boolean[] = [];
  let dropped = 0;
  for (const mac of macs) {
    if (learned.includes(mac) || learned.length < maxMacs) {
      if (!learned.includes(mac)) learned.push(mac);
      allowed.push(true);
      continue;
    }
    dropped += 1;
    allowed.push(false);
    if (mode === 'shutdown') {
      // The whole port goes down: nothing on it gets through any more.
      return {
        port: 'err-disabled',
        allowed: macs.map(() => false),
        withAccess: 0,
        dropped,
        logged: true,
      };
    }
  }
  return {
    port: 'up',
    allowed,
    withAccess: allowed.filter(Boolean).length,
    dropped,
    logged: dropped > 0 && mode !== 'protect',
  };
}

// ------------------------------------------------ DHCP snooping and DAI

export type SnoopFrame =
  | {
      readonly kind: 'dhcp';
      readonly message: 'DISCOVER' | 'REQUEST' | 'OFFER' | 'ACK';
      readonly port: string;
      readonly clientMac: string;
      /** The address offered or acknowledged (server messages). */
      readonly ip?: string;
    }
  | {
      readonly kind: 'arp';
      readonly port: string;
      readonly senderMac: string;
      readonly senderIp: string;
    };

export interface Binding {
  readonly mac: string;
  readonly ip: string;
  readonly port: string;
}

export type SnoopReason =
  | 'client-message'
  | 'server-on-untrusted'
  | 'server-on-trusted'
  | 'trusted-arp'
  | 'binding-match'
  | 'no-binding';

export interface SnoopDecision {
  readonly action: 'forward' | 'drop';
  readonly reason: SnoopReason;
}

const SERVER_MESSAGES = new Set(['OFFER', 'ACK']);

/**
 * Run frames through a switch with DHCP snooping and DAI on, in order. An ACK
 * forwarded from a trusted port adds a binding; DAI then checks ARP from
 * untrusted ports against those bindings.
 */
export function inspect(
  frames: readonly SnoopFrame[],
  trusted: readonly string[],
): { readonly decisions: SnoopDecision[]; readonly bindings: Binding[] } {
  const bindings: Binding[] = [];
  const decisions: SnoopDecision[] = [];
  const clientPort = new Map<string, string>();
  for (const frame of frames) {
    const isTrusted = trusted.includes(frame.port);
    if (frame.kind === 'dhcp') {
      if (!SERVER_MESSAGES.has(frame.message)) {
        clientPort.set(frame.clientMac, frame.port);
        decisions.push({ action: 'forward', reason: 'client-message' });
      } else if (!isTrusted) {
        decisions.push({ action: 'drop', reason: 'server-on-untrusted' });
      } else {
        decisions.push({ action: 'forward', reason: 'server-on-trusted' });
        const port = clientPort.get(frame.clientMac);
        if (frame.message === 'ACK' && frame.ip && port) {
          bindings.push({ mac: frame.clientMac, ip: frame.ip, port });
        }
      }
    } else if (isTrusted) {
      decisions.push({ action: 'forward', reason: 'trusted-arp' });
    } else {
      const match = bindings.some(
        (b) => b.mac === frame.senderMac && b.ip === frame.senderIp && b.port === frame.port,
      );
      decisions.push(
        match
          ? { action: 'forward', reason: 'binding-match' }
          : { action: 'drop', reason: 'no-binding' },
      );
    }
  }
  return { decisions, bindings };
}

export const UPLINK = 'Gi0/1';
export const ROGUE_PORT = 'Gi0/5';
const PC = 'aa:00:00:00:00:21';
const ROGUE = 'b8:27:eb:00:00:05';
const STATIC = 'aa:00:00:00:00:33';
const GATEWAY = '00:00:0c:00:00:01';

/** The lesson's frames: a PC gets an address while a home router is plugged in by mistake. */
export const SNOOP_FRAMES: readonly SnoopFrame[] = [
  { kind: 'dhcp', message: 'DISCOVER', port: 'Gi0/2', clientMac: PC },
  { kind: 'dhcp', message: 'OFFER', port: ROGUE_PORT, clientMac: PC, ip: '192.168.1.100' },
  { kind: 'dhcp', message: 'OFFER', port: UPLINK, clientMac: PC, ip: '10.0.10.21' },
  { kind: 'dhcp', message: 'REQUEST', port: 'Gi0/2', clientMac: PC },
  { kind: 'dhcp', message: 'ACK', port: UPLINK, clientMac: PC, ip: '10.0.10.21' },
  { kind: 'arp', port: 'Gi0/2', senderMac: PC, senderIp: '10.0.10.21' },
  { kind: 'arp', port: UPLINK, senderMac: GATEWAY, senderIp: '10.0.10.1' },
  { kind: 'arp', port: ROGUE_PORT, senderMac: ROGUE, senderIp: '10.0.10.1' },
  { kind: 'arp', port: 'Gi0/3', senderMac: STATIC, senderIp: '10.0.10.50' },
];
