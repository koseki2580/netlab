import type { TlsAlertDescription, TlsContentType, TlsRecord } from '../../types/tls';
import { TLS_RECORD_LEGACY_VERSION } from '../../types/tls';

const CONTENT_TYPE_TO_BYTE: Record<TlsContentType, number> = {
  change_cipher_spec: 20,
  alert: 21,
  handshake: 22,
  application_data: 23,
};

const BYTE_TO_CONTENT_TYPE = new Map<number, TlsContentType>(
  Object.entries(CONTENT_TYPE_TO_BYTE).map(([key, value]) => [value, key as TlsContentType]),
);

export function serializeTlsRecord(record: TlsRecord): Uint8Array {
  const maxLen = record.contentType === 'application_data' ? 2 ** 14 + 256 : 2 ** 14;
  if (record.payload.length > maxLen) {
    throw new RangeError(`TLS record payload exceeds ${maxLen} bytes`);
  }
  const out = new Uint8Array(5 + record.payload.length);
  out[0] = CONTENT_TYPE_TO_BYTE[record.contentType];
  out[1] = (TLS_RECORD_LEGACY_VERSION >> 8) & 0xff;
  out[2] = TLS_RECORD_LEGACY_VERSION & 0xff;
  out[3] = (record.payload.length >> 8) & 0xff;
  out[4] = record.payload.length & 0xff;
  out.set(record.payload, 5);
  return out;
}

export function parseTlsRecord(
  bytes: Uint8Array,
): { record: TlsRecord; consumed: number } | { error: TlsAlertDescription } {
  if (bytes.length < 5) return { error: 'decode_error' };
  const contentType = BYTE_TO_CONTENT_TYPE.get(bytes[0] ?? -1);
  if (!contentType) return { error: 'unexpected_message' };
  const version = ((bytes[1] ?? 0) << 8) | (bytes[2] ?? 0);
  if (version !== TLS_RECORD_LEGACY_VERSION) return { error: 'illegal_parameter' };
  const length = ((bytes[3] ?? 0) << 8) | (bytes[4] ?? 0);
  if (bytes.length < 5 + length) return { error: 'decode_error' };
  return {
    consumed: 5 + length,
    record: {
      contentType,
      version: TLS_RECORD_LEGACY_VERSION,
      payload: bytes.slice(5, 5 + length),
    },
  };
}

export function parseAllTlsRecords(
  bytes: Uint8Array,
): { records: TlsRecord[] } | { error: TlsAlertDescription } {
  const records: TlsRecord[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    const parsed = parseTlsRecord(bytes.slice(offset));
    if ('error' in parsed) return parsed;
    records.push(parsed.record);
    offset += parsed.consumed;
  }
  return { records };
}
