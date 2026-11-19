/**
 * The DNSSEC lesson (REQ-394): how a validating resolver checks an answer
 * along the chain of trust from the root (RFC 4033–4035).
 *
 * Zones: the root → example. → shop.example., and the answer is the A record
 * of www.shop.example.
 *
 * Simplified, and said so on the page:
 * - Each zone has ONE key (real zones usually split it into a KSK and a ZSK,
 *   and sign their own DNSKEY set too; that self-signature is not modelled).
 * - Signatures and DS digests are a deterministic stand-in: a 32-bit FNV-1a
 *   string hash, not public-key cryptography. A real RRSIG can only be made
 *   with the zone's private key; this stand-in shows the checks, not the
 *   security.
 * - Time is counted in whole days; RRSIG inception and expiration are
 *   inclusive (RFC 4035 §5.3.1).
 * - A missing DS is taken as proven missing by a signed NSEC/NSEC3 record from
 *   the parent; that proof is not computed.
 */

export type ZoneName = '.' | 'example.' | 'shop.example.';
export type ScenarioId = 'secure' | 'tampered' | 'no-ds' | 'expired';
export type Verdict = 'secure' | 'insecure' | 'bogus';
export type StepResult = 'pass' | 'fail' | 'no-ds' | 'skipped';
export type Failure = 'mismatch' | 'expired' | 'not-yet-valid';

export const SCENARIOS: readonly ScenarioId[] = ['secure', 'tampered', 'no-ds', 'expired'];

export const QUERY_NAME = 'www.shop.example.';
export const SIGNED_ADDRESS = '192.0.2.10';
export const ALTERED_ADDRESS = '203.0.113.66';
/** The validator's clock, in days, unless the learner moves it. */
export const DEFAULT_NOW_DAY = 40;
export const MAX_DAY = 60;

/** A zone's public key (DNSKEY), reduced to the key material. */
export interface DnsKey {
  readonly zone: ZoneName;
  readonly material: string;
}

export interface Rrsig {
  readonly signer: ZoneName;
  readonly inception: number;
  readonly expiration: number;
  readonly signature: string;
}

/** 32-bit FNV-1a over the string, as 8 hex digits: the stand-in for real cryptography. */
export function standInHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** DS = digest of the child's owner name and DNSKEY (RFC 4034 §5.1.4), published by the parent. */
export function dsDigest(key: DnsKey): string {
  return standInHash(`${key.zone}|DNSKEY|${key.material}`);
}

/** The stand-in signature over a record set and its validity window. */
export function signature(
  key: DnsKey,
  rrset: string,
  inception: number,
  expiration: number,
): string {
  return standInHash(`${key.material}|${rrset}|${inception}|${expiration}`);
}

export function sign(key: DnsKey, rrset: string, inception: number, expiration: number): Rrsig {
  return {
    signer: key.zone,
    inception,
    expiration,
    signature: signature(key, rrset, inception, expiration),
  };
}

export const KEYS: Readonly<Record<ZoneName, DnsKey>> = {
  '.': { zone: '.', material: 'root-key-AwEAAag' },
  'example.': { zone: 'example.', material: 'example-key-AwEAAc3' },
  'shop.example.': { zone: 'shop.example.', material: 'shop-key-AwEAAd7' },
};

/** The validator's configured trust anchor: the digest of the root's key. */
export const TRUST_ANCHOR = dsDigest(KEYS['.']);

const dsRrset = (child: ZoneName, digest: string) => `${child} DS ${digest}`;
const aRrset = (address: string) => `${QUERY_NAME} A ${address}`;

/** What the resolver received for one scenario. */
export interface Received {
  /** DS for example., published (and signed) by the root. */
  readonly dsExample: { readonly digest: string; readonly rrsig: Rrsig };
  /** DS for shop.example., published by example.; null when example. has none. */
  readonly dsShop: { readonly digest: string; readonly rrsig: Rrsig } | null;
  readonly answer: { readonly address: string; readonly rrsig: Rrsig };
}

export function received(scenario: ScenarioId): Received {
  const dsExampleDigest = dsDigest(KEYS['example.']);
  const dsShopDigest = dsDigest(KEYS['shop.example.']);
  // The shop zone stopped re-signing in the expired scenario: its signature ended on day 30.
  const answerExpiration = scenario === 'expired' ? 30 : 90;
  const answerRrsig = sign(KEYS['shop.example.'], aRrset(SIGNED_ADDRESS), 1, answerExpiration);
  return {
    dsExample: {
      digest: dsExampleDigest,
      rrsig: sign(KEYS['.'], dsRrset('example.', dsExampleDigest), 1, 90),
    },
    dsShop:
      scenario === 'no-ds'
        ? null
        : {
            digest: dsShopDigest,
            rrsig: sign(KEYS['example.'], dsRrset('shop.example.', dsShopDigest), 1, 90),
          },
    // In the tampered scenario the address was changed on the way; the RRSIG was not.
    answer: {
      address: scenario === 'tampered' ? ALTERED_ADDRESS : SIGNED_ADDRESS,
      rrsig: answerRrsig,
    },
  };
}

export interface Step {
  readonly id: 1 | 2 | 3 | 4 | 5 | 6;
  /** 'anchor' and 'ds-match' compare a key's digest; 'signature' checks an RRSIG. */
  readonly kind: 'anchor' | 'ds-match' | 'signature';
  /** The zone whose key is checked, or which made the signature. */
  readonly zone: ZoneName;
  /** What is checked: a zone's key, or the record set signed. */
  readonly subject: string;
  readonly result: StepResult;
  readonly expected?: string;
  readonly computed?: string;
  readonly window?: { readonly inception: number; readonly expiration: number };
  readonly failure?: Failure;
}

export interface Validation {
  readonly steps: readonly Step[];
  readonly verdict: Verdict;
  /** What the client gets back: SERVFAIL for a bogus answer. */
  readonly rcode: 'NOERROR' | 'SERVFAIL';
  /** The AD (authenticated data) flag: set only when the answer is secure. */
  readonly ad: boolean;
  /** The address the client receives, or null on SERVFAIL. */
  readonly address: string | null;
  /** The first step that did not pass, or null. */
  readonly stoppedAt: number | null;
}

function checkDigest(
  id: Step['id'],
  kind: 'anchor' | 'ds-match',
  key: DnsKey,
  expected: string,
): Step {
  const computed = dsDigest(key);
  return {
    id,
    kind,
    zone: key.zone,
    subject: `${key.zone} DNSKEY`,
    result: computed === expected ? 'pass' : 'fail',
    expected,
    computed,
    ...(computed === expected ? {} : { failure: 'mismatch' as const }),
  };
}

function checkSignature(
  id: Step['id'],
  key: DnsKey,
  rrset: string,
  rrsig: Rrsig,
  nowDay: number,
): Step {
  const computed = signature(key, rrset, rrsig.inception, rrsig.expiration);
  const failure: Failure | undefined =
    computed !== rrsig.signature
      ? 'mismatch'
      : nowDay > rrsig.expiration
        ? 'expired'
        : nowDay < rrsig.inception
          ? 'not-yet-valid'
          : undefined;
  return {
    id,
    kind: 'signature',
    zone: key.zone,
    subject: rrset,
    result: failure ? 'fail' : 'pass',
    expected: rrsig.signature,
    computed,
    window: { inception: rrsig.inception, expiration: rrsig.expiration },
    ...(failure ? { failure } : {}),
  };
}

/** Walk the chain from the trust anchor to the answer, stopping at the first step that does not pass. */
export function validate(scenario: ScenarioId, nowDay: number = DEFAULT_NOW_DAY): Validation {
  const got = received(scenario);
  const planned: (() => Step)[] = [
    () => checkDigest(1, 'anchor', KEYS['.'], TRUST_ANCHOR),
    () =>
      checkSignature(
        2,
        KEYS['.'],
        dsRrset('example.', got.dsExample.digest),
        got.dsExample.rrsig,
        nowDay,
      ),
    () => checkDigest(3, 'ds-match', KEYS['example.'], got.dsExample.digest),
    () =>
      got.dsShop
        ? checkSignature(
            4,
            KEYS['example.'],
            dsRrset('shop.example.', got.dsShop.digest),
            got.dsShop.rrsig,
            nowDay,
          )
        : {
            id: 4,
            kind: 'signature',
            zone: 'example.',
            subject: 'shop.example. DS',
            result: 'no-ds',
          },
    () => checkDigest(5, 'ds-match', KEYS['shop.example.'], got.dsShop?.digest ?? ''),
    () =>
      checkSignature(
        6,
        KEYS['shop.example.'],
        aRrset(got.answer.address),
        got.answer.rrsig,
        nowDay,
      ),
  ];
  const skippedStep = (id: Step['id']): Step => {
    const [kind, zone, subject] = (
      {
        1: ['anchor', '.', '. DNSKEY'],
        2: ['signature', '.', 'example. DS'],
        3: ['ds-match', 'example.', 'example. DNSKEY'],
        4: ['signature', 'example.', 'shop.example. DS'],
        5: ['ds-match', 'shop.example.', 'shop.example. DNSKEY'],
        6: ['signature', 'shop.example.', `${QUERY_NAME} A`],
      } as const
    )[id];
    return { id, kind, zone, subject, result: 'skipped' };
  };

  const steps: Step[] = [];
  let stoppedAt: number | null = null;
  for (const [index, run] of planned.entries()) {
    const id = (index + 1) as Step['id'];
    if (stoppedAt !== null) {
      steps.push(skippedStep(id));
      continue;
    }
    const step = run();
    steps.push(step);
    if (step.result !== 'pass') stoppedAt = id;
  }

  const stopped = stoppedAt === null ? null : steps[stoppedAt - 1]!;
  const verdict: Verdict = !stopped ? 'secure' : stopped.result === 'no-ds' ? 'insecure' : 'bogus';
  return {
    steps,
    verdict,
    rcode: verdict === 'bogus' ? 'SERVFAIL' : 'NOERROR',
    ad: verdict === 'secure',
    address: verdict === 'bogus' ? null : got.answer.address,
    stoppedAt,
  };
}
