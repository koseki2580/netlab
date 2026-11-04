/**
 * NTP, the wire tier. RFC 5905 §7.3, the 48-byte packet header (extension fields and
 * the MAC are not modelled). Timestamps are 64-bit (32-bit seconds since 1900, then a
 * 32-bit fraction); the root delay and dispersion are 16.16 seconds. Poll and precision
 * are signed: the value is the byte, the display shows the signed number.
 *
 *   |LI | VN  |Mode |    Stratum     |     Poll      |  Precision    |
 *   |                         Root Delay                            |
 *   |                       Root Dispersion                         |
 *   |                          Reference ID                         |
 *   |       Reference, Origin, Receive, Transmit Timestamp (64)     |
 */
import type { FieldValue, ProtocolWire, WireField } from '../pack/types';
import { ntpIdentity } from './identity';

const signed = (value: FieldValue) => {
  const byte = Number(value);
  return String(byte > 127 ? byte - 256 : byte);
};
const shortFormat = (value: FieldValue) => `${(Number(value) / 65536).toFixed(6)} s`;
const u32 = (key: string, name: string): WireField => ({ key, name, type: 'uint', bits: 32 });
const timestamp = (key: string, name: string): WireField[] => [
  u32(`${key}Seconds`, `${name} (seconds)`),
  u32(`${key}Fraction`, `${name} (fraction)`),
];

export const ntpWire: ProtocolWire = {
  ...ntpIdentity,
  defaultVersion: 'rfc5905',
  versions: [{ id: 'rfc5905' }],
  label: { field: 'mode' },
  header: [
    {
      key: 'li',
      name: 'Leap Indicator',
      type: 'enum',
      bits: 2,
      values: [
        { value: 0, name: 'NO WARNING' },
        { value: 1, name: 'LAST MINUTE 61 S' },
        { value: 2, name: 'LAST MINUTE 59 S' },
        { value: 3, name: 'UNSYNCHRONIZED' },
      ],
    },
    { key: 'vn', name: 'Version Number', type: 'uint', bits: 3 },
    {
      key: 'mode',
      name: 'Mode',
      type: 'enum',
      bits: 3,
      values: [
        { value: 0, name: 'RESERVED' },
        { value: 1, name: 'SYMMETRIC ACTIVE' },
        { value: 2, name: 'SYMMETRIC PASSIVE' },
        { value: 3, name: 'CLIENT' },
        { value: 4, name: 'SERVER' },
        { value: 5, name: 'BROADCAST' },
        { value: 6, name: 'CONTROL' },
        { value: 7, name: 'PRIVATE' },
      ],
    },
    { key: 'stratum', name: 'Stratum', type: 'uint', bits: 8 },
    { key: 'poll', name: 'Poll', type: 'uint', bits: 8, format: signed },
    { key: 'precision', name: 'Precision', type: 'uint', bits: 8, format: signed },
    { ...u32('rootDelay', 'Root Delay'), format: shortFormat },
    { ...u32('rootDispersion', 'Root Dispersion'), format: shortFormat },
    { key: 'referenceId', name: 'Reference ID', type: 'bytes', bits: 32 },
    ...timestamp('reference', 'Reference Timestamp'),
    ...timestamp('origin', 'Origin Timestamp'),
    ...timestamp('receive', 'Receive Timestamp'),
    ...timestamp('transmit', 'Transmit Timestamp'),
  ],
};
