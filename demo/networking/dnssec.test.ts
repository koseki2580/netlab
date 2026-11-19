/** REQ-394 — DNSSEC validation along the chain of trust (TC-1980..TC-1985). */
import { describe, expect, it } from 'vitest';
import {
  ALTERED_ADDRESS,
  KEYS,
  SIGNED_ADDRESS,
  TRUST_ANCHOR,
  dsDigest,
  received,
  sign,
  signature,
  standInHash,
  validate,
} from './dnssec';

const results = (scenario: Parameters<typeof validate>[0], nowDay?: number) =>
  validate(scenario, nowDay).steps.map((step) => step.result);

describe('TC-1980: an untouched answer validates at every step and is Secure', () => {
  it('all six checks pass; the client gets the address with AD set', () => {
    const validation = validate('secure');
    expect(results('secure')).toEqual(['pass', 'pass', 'pass', 'pass', 'pass', 'pass']);
    expect(validation).toMatchObject({
      verdict: 'secure',
      rcode: 'NOERROR',
      ad: true,
      address: SIGNED_ADDRESS,
      stoppedAt: null,
    });
  });
});

describe('TC-1981: an A record changed on the way fails its signature and is Bogus', () => {
  it('steps 1–5 pass, step 6 fails as a mismatch, the client gets SERVFAIL and no address', () => {
    const validation = validate('tampered');
    expect(results('tampered')).toEqual(['pass', 'pass', 'pass', 'pass', 'pass', 'fail']);
    expect(validation.steps[5]!.failure).toBe('mismatch');
    expect(validation.steps[5]!.computed).not.toBe(validation.steps[5]!.expected);
    expect(validation).toMatchObject({
      verdict: 'bogus',
      rcode: 'SERVFAIL',
      ad: false,
      address: null,
      stoppedAt: 6,
    });
  });
  it('the received record really carries the other address', () => {
    expect(received('tampered').answer.address).toBe(ALTERED_ADDRESS);
  });
});

describe('TC-1982: a delegation with no DS in the parent is Insecure: answered, not validated', () => {
  it('the chain stops at step 4, later steps are skipped, the address arrives without AD', () => {
    const validation = validate('no-ds');
    expect(results('no-ds')).toEqual(['pass', 'pass', 'pass', 'no-ds', 'skipped', 'skipped']);
    expect(validation).toMatchObject({
      verdict: 'insecure',
      rcode: 'NOERROR',
      ad: false,
      address: SIGNED_ADDRESS,
      stoppedAt: 4,
    });
  });
});

describe('TC-1983: a signature is valid only between its inception and expiration days', () => {
  it('the answer signed until day 30 is Bogus (expired) on day 40, Secure on day 30', () => {
    const late = validate('expired', 40);
    expect(late.steps[5]).toMatchObject({ result: 'fail', failure: 'expired' });
    expect(late.verdict).toBe('bogus');
    expect(validate('expired', 30).verdict).toBe('secure');
    expect(validate('expired', 31).verdict).toBe('bogus');
  });
  it('before inception (day 0) the first signature checked already fails as not yet valid', () => {
    const early = validate('secure', 0);
    expect(early.steps[1]).toMatchObject({ result: 'fail', failure: 'not-yet-valid' });
    expect(early.stoppedAt).toBe(2);
    expect(early.verdict).toBe('bogus');
  });
});

describe('TC-1984: the parent’s DS is the digest of the child’s key, and the anchor of the root’s', () => {
  it('each DS received equals the digest of the child zone’s DNSKEY', () => {
    const got = received('secure');
    expect(got.dsExample.digest).toBe(dsDigest(KEYS['example.']));
    expect(got.dsShop!.digest).toBe(dsDigest(KEYS['shop.example.']));
    expect(TRUST_ANCHOR).toBe(dsDigest(KEYS['.']));
  });
  it('a different key gives a different digest, so it would not match the DS', () => {
    expect(dsDigest({ zone: 'example.', material: 'another-key' })).not.toBe(
      dsDigest(KEYS['example.']),
    );
    expect(dsDigest({ zone: 'shop.example.', material: KEYS['example.'].material })).not.toBe(
      dsDigest(KEYS['example.']),
    );
  });
});

describe('TC-1985: the stand-in signature covers the data and its validity window', () => {
  it('is deterministic and changes with one character of data', () => {
    expect(standInHash('www.shop.example. A 192.0.2.10')).toBe(
      standInHash('www.shop.example. A 192.0.2.10'),
    );
    expect(standInHash('www.shop.example. A 192.0.2.10')).not.toBe(
      standInHash('www.shop.example. A 192.0.2.11'),
    );
  });
  it('moving the expiration later invalidates the signature, so an old one cannot be stretched', () => {
    const key = KEYS['shop.example.'];
    const rrset = `www.shop.example. A ${SIGNED_ADDRESS}`;
    const original = sign(key, rrset, 1, 30);
    expect(signature(key, rrset, 1, 60)).not.toBe(original.signature);
    expect(signature(key, rrset, 1, 30)).toBe(original.signature);
  });
});
