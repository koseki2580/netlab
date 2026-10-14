/**
 * The fields of a packet as the form names them. Templates build their forms
 * from these and the judge names a field by the same label, so feedback never
 * uses a word the form does not show.
 */

import type { Candidate, Carries, FieldId, FieldInput, Localised, PacketField } from './model';

const L = (en: string, ja: string): Localised => ({ en, ja });

export const FIELD_LABELS: Readonly<Record<FieldId, Localised>> = {
  dstIp: L('Destination address', 'あて先アドレス'),
  dstMac: L('Destination MAC address', 'あて先 MAC アドレス'),
  ttl: L('TTL', 'TTL'),
  df: L('"Do not split" mark (DF)', '「分割しない」の印（DF）'),
  dstPort: L('Destination port', 'あて先ポート番号'),
  carries: L('Kind of traffic', '通信の種類'),
  size: L('Packet size in bytes', 'パケットの大きさ（バイト）'),
};

export const CARRIES_LABELS: Readonly<Record<Carries, Localised>> = {
  icmp: L('ICMP (ping)', 'ICMP（ping）'),
  tcp: L('TCP', 'TCP'),
  udp: L('UDP', 'UDP'),
};

/** The IP header, and the ICMP or UDP header after it. */
export const IP_HEADER_BYTES = 20;
export const TRANSPORT_HEADER_BYTES: Readonly<Record<Carries, number>> = {
  icmp: 8,
  udp: 8,
  tcp: 20,
};

const INPUTS: Readonly<Record<FieldId, FieldInput>> = {
  dstIp: { kind: 'address' },
  dstMac: { kind: 'mac' },
  // The README: limit the field to 1–255 (the simulator would take 0 and 300).
  ttl: { kind: 'number', min: 1, max: 255 },
  df: { kind: 'flag' },
  dstPort: { kind: 'number', min: 1, max: 65535 },
  carries: {
    kind: 'choice',
    options: (['tcp', 'udp'] as const).map((value) => ({ value, label: CARRIES_LABELS[value] })),
  },
  // 28 = an IP header and an ICMP or UDP header with nothing after them.
  size: { kind: 'number', min: 28, max: 9000 },
};

/** A field of the form; with `candidates`, one that is chosen instead of typed. */
export function field(id: FieldId, candidates?: readonly Candidate[]): PacketField {
  return { id, label: FIELD_LABELS[id], input: INPUTS[id], ...(candidates ? { candidates } : {}) };
}
