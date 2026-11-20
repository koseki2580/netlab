/** REQ-408 — email delivery and authentication (TC-2120..TC-2128). */
import { describe, expect, it } from 'vitest';
import {
  ENVELOPE,
  MESSAGES,
  MX_RECORDS,
  checkSpf,
  deliver,
  deliveryOrder,
  dnsData,
  evaluate,
  inCidr,
  organisationalDomain,
  smtpTranscript,
} from './email';

const reject = dnsData('reject');

describe('TC-2120: MX hosts are tried lowest preference first', () => {
  it('10 mx1 comes before 20 mx2 whatever order DNS lists them in', () => {
    expect(deliveryOrder(MX_RECORDS).map((r) => r.host)).toEqual([
      'mx1.example.org',
      'mx2.example.org',
    ]);
  });
  it('with both up, mail goes to mx1 on the first attempt', () => {
    const result = deliver(MX_RECORDS, new Set());
    expect(result.deliveredTo).toBe('mx1.example.org');
    expect(result.attempts).toHaveLength(1);
  });
});

describe('TC-2121: when the preferred host is down the sender falls back', () => {
  it('mx1 down: two attempts, delivered to mx2', () => {
    const result = deliver(MX_RECORDS, new Set(['mx1.example.org']));
    expect(result.attempts.map((a) => [a.host, a.answered])).toEqual([
      ['mx1.example.org', false],
      ['mx2.example.org', true],
    ]);
    expect(result.deliveredTo).toBe('mx2.example.org');
  });
  it('both down: nothing accepts it, so it stays queued', () => {
    const result = deliver(MX_RECORDS, new Set(['mx1.example.org', 'mx2.example.org']));
    expect(result.deliveredTo).toBeNull();
    expect(result.attempts).toHaveLength(2);
  });
});

describe('TC-2122: the SMTP dialogue', () => {
  const lines = smtpTranscript('mx2.example.org', ENVELOPE);
  it('server replies come in the order 220, 250, 220, 250, 250, 250, 354, 250, 221', () => {
    const codes = lines.filter((l) => l.from === 'server' && !/^\d{3}-/.test(l.text));
    expect(codes.map((l) => l.code)).toEqual([220, 250, 220, 250, 250, 250, 354, 250, 221]);
  });
  it('names the host it talks to and carries the envelope addresses', () => {
    expect(lines[0]?.text).toBe('220 mx2.example.org ESMTP');
    const client = lines.filter((l) => l.from === 'client').map((l) => l.text);
    expect(client).toContain('MAIL FROM:<alice@example.com>');
    expect(client).toContain('RCPT TO:<bob@example.org>');
    expect(client.filter((text) => text.startsWith('EHLO'))).toHaveLength(2);
    expect(client.indexOf('STARTTLS')).toBeLessThan(
      client.indexOf('MAIL FROM:<alice@example.com>'),
    );
  });
});

describe('TC-2123: SPF checks the connecting IP against the MAIL FROM domain', () => {
  it('CIDR matching', () => {
    expect(inCidr('192.0.2.10', '192.0.2.0/24')).toBe(true);
    expect(inCidr('192.0.3.10', '192.0.2.0/24')).toBe(false);
    expect(inCidr('203.0.113.66', '203.0.113.64/26')).toBe(true);
    expect(inCidr('203.0.113.5', '203.0.113.64/26')).toBe(false);
  });
  it('direct and list pass, forwarded fails, a domain without a record is none, ~all softfails', () => {
    expect(checkSpf(MESSAGES.direct, reject)).toBe('pass');
    expect(checkSpf(MESSAGES.list, reject)).toBe('pass');
    expect(checkSpf(MESSAGES.forwarded, reject)).toBe('fail');
    expect(checkSpf({ ...MESSAGES.direct, mailFromDomain: 'unknown.example' }, reject)).toBe(
      'none',
    );
    const soft = { ...reject, spf: { 'example.com': 'v=spf1 ip4:192.0.2.0/24 ~all' } };
    expect(checkSpf(MESSAGES.forwarded, soft)).toBe('softfail');
  });
});

describe('TC-2124: a direct send passes everything', () => {
  it('SPF and DKIM pass and align (mail.example.com aligns with example.com, relaxed)', () => {
    expect(organisationalDomain('mail.example.com')).toBe('example.com');
    expect(evaluate(MESSAGES.direct, reject)).toEqual({
      spf: 'pass',
      spfAligned: true,
      dkim: 'pass',
      dkimAligned: true,
      dmarc: 'pass',
      policy: 'reject',
      action: 'deliver',
    });
  });
});

describe('TC-2125: a mailing list that changes the body fails DMARC', () => {
  it('DKIM breaks, SPF passes for example.net which does not align', () => {
    const verdict = evaluate(MESSAGES.list, reject);
    expect([verdict.spf, verdict.spfAligned, verdict.dkim, verdict.dkimAligned]).toEqual([
      'pass',
      false,
      'fail',
      false,
    ]);
    expect([verdict.dmarc, verdict.action]).toEqual(['fail', 'reject']);
  });
});

describe('TC-2126: a forwarded message passes DMARC through DKIM alone', () => {
  it('SPF fails at the forwarder, DKIM still verifies and aligns', () => {
    const verdict = evaluate(MESSAGES.forwarded, reject);
    expect([verdict.spf, verdict.dkim, verdict.dkimAligned]).toEqual(['fail', 'pass', true]);
    expect([verdict.dmarc, verdict.action]).toEqual(['pass', 'deliver']);
  });
});

describe('TC-2127: a forged From: fails DMARC and p=reject rejects it', () => {
  it('SPF passes for other.example but does not align; no DKIM', () => {
    const verdict = evaluate(MESSAGES.forged, reject);
    expect([verdict.spf, verdict.spfAligned, verdict.dkim]).toEqual(['pass', false, 'none']);
    expect([verdict.dmarc, verdict.action]).toEqual(['fail', 'reject']);
  });
});

describe('TC-2128: the policy decides what happens to a failure, never to a pass', () => {
  it('p=none delivers, p=quarantine sends to spam, p=reject refuses', () => {
    expect(evaluate(MESSAGES.forged, dnsData('none')).action).toBe('deliver');
    expect(evaluate(MESSAGES.forged, dnsData('quarantine')).action).toBe('quarantine');
    expect(evaluate(MESSAGES.forged, dnsData('reject')).action).toBe('reject');
    expect(evaluate(MESSAGES.forwarded, dnsData('quarantine')).action).toBe('deliver');
  });
  it('a From: domain with no DMARC record gets no verdict', () => {
    const verdict = evaluate(MESSAGES.forged, { ...reject, dmarc: {} });
    expect([verdict.dmarc, verdict.policy, verdict.action]).toEqual(['none', null, 'deliver']);
  });
  it('the record is found at the organisational domain for a subdomain From:', () => {
    const sub = { ...MESSAGES.forged, headerFromDomain: 'news.example.com' };
    expect(evaluate(sub, reject).policy).toBe('reject');
  });
});
