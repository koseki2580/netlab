/**
 * @property-seed 0x5a4b12 plan/81f TLS state-machine totality and determinism.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import { INITIAL_TLS_CONTEXT, transitionTls, type TlsEvent } from './TlsHandshake';

const events = fc.constantFrom<TlsEvent>(
  { type: 'start', bytes: new Uint8Array([1]) },
  { type: 'recvServerHello', selectedAlpn: 'http/1.1', bytes: new Uint8Array([2]) },
  { type: 'recvCertificate', bytes: new Uint8Array([3]) },
  { type: 'recvCertificateVerify', bytes: new Uint8Array([4]) },
  { type: 'recvFinished', who: 'server', bytes: new Uint8Array([5]) },
  { type: 'recvFinished', who: 'client', bytes: new Uint8Array([6]) },
  { type: 'recvAppData', bytes: new Uint8Array([7]) },
  { type: 'tickStep' },
);

describe('TLS handshake state-machine properties', () => {
  it('is total and deterministic for event sequences', () => {
    fc.assert(
      fc.property(fc.array(events, { maxLength: 30 }), (sequence) => {
        const run = () =>
          sequence.reduce((ctx, event) => transitionTls(ctx, event), INITIAL_TLS_CONTEXT);
        expect(run()).toEqual(run());
        expect(run().state).toMatch(/^(init|wait_sh|wait_ee_etc|connected|closed)$/);
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
