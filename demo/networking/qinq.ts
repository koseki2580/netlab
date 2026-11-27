/**
 * The Q-in-Q lesson (REQ-442): IEEE 802.1ad provider bridging. A provider edge
 * pushes a service tag (S-tag, TPID 0x88A8) outside the customer's own 802.1Q
 * tag (C-tag, TPID 0x8100), carries the frame across its core by the S-VLAN,
 * and pops the S-tag at the far edge.
 *
 * Frame sizes count the Ethernet header (14 bytes), each 4-byte tag, the
 * payload and the 4-byte FCS; the preamble, the inter-frame gap and padding of
 * short frames are left out (the lesson uses full-size payloads). VLAN IDs 0 and 4095 are reserved, so 4094
 * are usable in each tag. Simplified: one S-VLAN per customer (port-based
 * service), no MAC learning, no spanning tree, no PCP/DEI handling; the
 * "shared VLAN" contrast is a provider that trunks the customers' own VLAN 10
 * through as it is.
 */

export const TPID = { cTag: 0x8100, sTag: 0x88a8 } as const;
export const ETH_HEADER_BYTES = 14;
export const TAG_BYTES = 4;
export const FCS_BYTES = 4;
export const USABLE_VIDS = 4096 - 2;

export interface Tag {
  readonly kind: 'S' | 'C';
  readonly tpid: number;
  readonly vid: number;
}

/** Bytes on the wire from destination MAC to FCS, for a payload under `tags` tags. */
export function frameBytes(payloadBytes: number, tags: number): number {
  return ETH_HEADER_BYTES + tags * TAG_BYTES + payloadBytes + FCS_BYTES;
}

/** The largest payload that fits a link whose largest frame is `maxFrameBytes`, under `tags` tags. */
export function maxPayload(maxFrameBytes: number, tags: number): number {
  return maxFrameBytes - ETH_HEADER_BYTES - FCS_BYTES - tags * TAG_BYTES;
}

export type CustomerId = 'A' | 'B';
export type Mode = 'qinq' | 'shared-vlan';

/** Both customers tag their traffic with C-VLAN 10; the provider gives each its own S-VLAN. */
export const CUSTOMER_VLAN = 10;
export const S_VLAN: Readonly<Record<CustomerId, number>> = { A: 100, B: 200 };

export interface Hop {
  readonly from: string;
  readonly to: string;
  /** Outermost tag first. */
  readonly tags: readonly Tag[];
  readonly bytes: number;
}

export interface Journey {
  readonly hops: readonly Hop[];
  /** The customer sites at the far edge that receive the frame. */
  readonly deliveredTo: readonly string[];
}

const cTag: Tag = { kind: 'C', tpid: TPID.cTag, vid: CUSTOMER_VLAN };

/**
 * A frame from `customer`'s site 1 to its site 2, across PE1 → P → PE2.
 * With Q-in-Q PE1 pushes the customer's S-tag and PE2 pops it, delivering to
 * the ports of that S-VLAN only. With one shared VLAN the provider forwards by
 * the customers' VLAN 10, which both customers use, so PE2 floods to both.
 */
export function journey(customer: CustomerId, mode: Mode, payloadBytes = 1500): Journey {
  const src = `${customer}1`;
  const edgeTags: readonly Tag[] = [cTag];
  const coreTags: readonly Tag[] =
    mode === 'qinq' ? [{ kind: 'S', tpid: TPID.sTag, vid: S_VLAN[customer] }, cTag] : [cTag];
  const hop = (from: string, to: string, tags: readonly Tag[]): Hop => ({
    from,
    to,
    tags,
    bytes: frameBytes(payloadBytes, tags.length),
  });
  const customers: readonly CustomerId[] = ['A', 'B'];
  // PE2 forwards by the outer VLAN: the S-VLAN with Q-in-Q, else the C-VLAN.
  const deliveredTo =
    mode === 'qinq'
      ? customers.filter((c) => S_VLAN[c] === S_VLAN[customer]).map((c) => `${c}2`)
      : customers.map((c) => `${c}2`);
  return {
    hops: [
      hop(src, 'PE1', edgeTags),
      hop('PE1', 'P', coreTags),
      hop('P', 'PE2', coreTags),
      ...deliveredTo.map((site) => hop('PE2', site, edgeTags)),
    ],
    deliveredTo,
  };
}

/** How many customer VLANs a provider can carry, with one tag or with an S-tag outside a C-tag. */
export function vlanSpace(tags: 1 | 2): number {
  return USABLE_VIDS ** tags;
}
