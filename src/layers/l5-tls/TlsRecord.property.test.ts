/**
 * @property-seed 0x5a4b12 TLS record framing round-trip.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import { parseAllTlsRecords, parseTlsRecord, serializeTlsRecord } from './TlsRecord';

describe('TLS record properties', () => {
  it('round-trips record framing and parses coalesced records', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 0, maxLength: 256 }), (payload) => {
        const record = { contentType: 'handshake' as const, version: 0x0303 as const, payload };
        const encoded = serializeTlsRecord(record);
        const parsed = parseTlsRecord(encoded);
        expect(parsed).toMatchObject({ consumed: encoded.length });
        expect('record' in parsed && parsed.record).toEqual(record);

        const coalesced = new Uint8Array(encoded.length * 2);
        coalesced.set(encoded, 0);
        coalesced.set(encoded, encoded.length);
        const parsedAll = parseAllTlsRecords(coalesced);
        expect('records' in parsedAll && parsedAll.records).toHaveLength(2);
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
