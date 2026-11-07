import { describe, expect, it } from 'vitest';
import type { DnsMessage } from '../../types/packets';
import { deriveAnnotatedFields } from '../pack/wire';
import { installDnsRecords } from './records';
import { dnsMessageToValues, dnsWire } from './wire';

installDnsRecords();

const referral: DnsMessage = {
  layer: 'L7',
  transactionId: 0x1234,
  isResponse: true,
  questions: [{ name: 'web.example.com', type: 'AAAA' }],
  answers: [
    { name: 'web.example.com', type: 'AAAA', ttl: 300, address: '2001:db8::80' },
    { name: 'example.com', type: 'MX', ttl: 3600, address: 'mail.example.com', preference: 10 },
    { name: 'www.example.com', type: 'CNAME', ttl: 300, address: 'web.example.com' },
  ],
  authority: [{ name: 'com', type: 'NS', ttl: 172800, address: 'a.gtld-servers.net' }],
  additional: [{ name: 'a.gtld-servers.net', type: 'A', ttl: 172800, address: '192.5.6.30' }],
  rcode: 0,
  authoritative: false,
  recursionDesired: false,
  recursionAvailable: false,
};

// TC-1232
describe('DNS records of every type on the wire', () => {
  it('counts each section and carries the flags it was given', () => {
    const values = dnsMessageToValues(referral);
    expect(values).toMatchObject({ qdcount: 1, ancount: 3, nscount: 1, arcount: 1 });
    expect(values).toMatchObject({ aa: 0, rd: 0, ra: 0, rcode: 0 });
    expect(dnsMessageToValues({ ...referral, rcode: 3, answers: [] })).toMatchObject({ rcode: 3 });
    expect(
      dnsMessageToValues({ ...referral, recursionAvailable: true, recursionDesired: true }),
    ).toMatchObject({ rd: 1, ra: 1 });
  });

  it('encodes RDATA by type: AAAA 16 bytes, MX a preference and a name, names as labels', () => {
    const values = dnsMessageToValues(referral);
    const [aaaa, mx, cname] = values['answer'] as Record<string, unknown>[];
    expect(aaaa).toMatchObject({ type: 28, rdlength: 16 });
    expect(mx).toMatchObject({ type: 15, rdlength: 2 + 18 });
    expect((mx?.['rdata'] as number[]).slice(0, 2)).toEqual([0, 10]);
    expect(cname).toMatchObject({ type: 5, rdlength: 17 });
    expect((values['authority'] as Record<string, unknown>[])[0]).toMatchObject({ type: 2 });
  });

  it('reads RDATA back as a person would write it', () => {
    const shown = deriveAnnotatedFields(dnsWire, dnsMessageToValues(referral))
      .map((field) => field.displayValue)
      .join('\n');
    expect(shown).toContain('2001:db8::80');
    expect(shown).toContain('10 mail.example.com');
    expect(shown).toContain('web.example.com');
    expect(shown).toContain('a.gtld-servers.net');
    expect(shown).toContain('192.5.6.30');
  });

  it('keeps an earlier answer as it was: AA 1, RD 1, RA 0, NXDOMAIN when empty', () => {
    const earlier: DnsMessage = {
      layer: 'L7',
      transactionId: 1,
      isResponse: true,
      questions: [{ name: 'web.lab', type: 'A' }],
      answers: [{ name: 'web.lab', type: 'A', ttl: 300, address: '10.0.0.80' }],
    };
    expect(dnsMessageToValues(earlier)).toMatchObject({
      aa: 1,
      rd: 1,
      ra: 0,
      rcode: 0,
      nscount: 0,
      arcount: 0,
    });
    expect(dnsMessageToValues({ ...earlier, answers: [] })).toMatchObject({ rcode: 3 });
  });
});
