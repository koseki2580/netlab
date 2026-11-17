/** REQ-383 — post-quantum key exchange: sizes and who can recover a recorded key (TC-1870..TC-1873). */
import { describe, expect, it } from 'vitest';
import { ATTACKERS, clientHelloBytes, GROUPS, segmentsFor, SHARE, staysSecret } from './pqKex';

describe('TC-1870: the hybrid key share is 38 times X25519’s', () => {
  it('1216 bytes from the client and 1120 back, against 32 and 32', () => {
    expect(SHARE.x25519mlkem768).toEqual({ client: 1216, server: 1120 });
    expect(SHARE.x25519mlkem768.client / SHARE.x25519.client).toBe(38);
  });
});

describe('TC-1871: the hybrid ClientHello no longer fits one TCP segment', () => {
  it('512 bytes in one segment with X25519; 1696 bytes in two with the hybrid', () => {
    expect(clientHelloBytes('x25519')).toBe(512);
    expect(segmentsFor(clientHelloBytes('x25519'))).toBe(1);
    expect(clientHelloBytes('x25519mlkem768')).toBe(1696);
    expect(segmentsFor(clientHelloBytes('x25519mlkem768'))).toBe(2);
  });
});

describe('TC-1872: a recording made today, opened by a future quantum computer', () => {
  it('X25519 alone falls; ML-KEM and the hybrid hold; today every group holds', () => {
    expect(staysSecret('x25519', 'quantum')).toBe(false);
    expect(staysSecret('mlkem768', 'quantum')).toBe(true);
    expect(staysSecret('x25519mlkem768', 'quantum')).toBe(true);
    for (const group of ['x25519', 'mlkem768', 'x25519mlkem768'] as const) {
      expect(staysSecret(group, 'classical')).toBe(true);
    }
  });
});

describe('TC-1873: only the hybrid holds whichever turns out weak', () => {
  it('a flaw in ML-KEM breaks ML-KEM alone, not the hybrid; the hybrid holds in every case', () => {
    expect(staysSecret('mlkem768', 'mlkem-flaw')).toBe(false);
    expect(staysSecret('x25519', 'mlkem-flaw')).toBe(true);
    for (const attacker of ATTACKERS) expect(staysSecret('x25519mlkem768', attacker)).toBe(true);
    expect(GROUPS.filter((group) => ATTACKERS.every((a) => staysSecret(group, a)))).toEqual([
      'x25519mlkem768',
    ]);
  });
});
