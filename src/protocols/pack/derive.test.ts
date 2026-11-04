import { describe, expect, it } from 'vitest';
import {
  deriveAnnotatedFields,
  deriveFilterToken,
  deriveGlossary,
  deriveLayout,
  derivePacketLabFieldIds,
  deriveTraceLabel,
} from './derive';
import { dnsPack } from './fixtures/dns.pack';
import { grePack } from './fixtures/gre.pack';
import { expectRefused } from './testing';
import type { HeaderValues } from './types';

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const EXAMPLE_COM = [7, ...ascii('example'), 3, ...ascii('com'), 0];

const GRE_KS: HeaderValues = {
  c: 0,
  k: 1,
  s: 1,
  ver: 0,
  protocolType: 0x0800,
  key: 81,
  sequence: 7,
};

const DNS_QUERY: HeaderValues = {
  id: 0x1234,
  qr: 0,
  opcode: 0,
  aa: 0,
  tc: 0,
  rd: 1,
  ra: 0,
  ad: 0,
  cd: 0,
  rcode: 0,
  qdcount: 1,
  ancount: 0,
  nscount: 0,
  arcount: 0,
  question: [{ qname: 'example.com', qtype: 1, qclass: 1 }],
};

const DNS_RESPONSE: HeaderValues = {
  ...DNS_QUERY,
  qr: 1,
  ra: 1,
  ancount: 1,
  answer: [
    { name: 'example.com', type: 1, class: 1, ttl: 300, rdlength: 4, rdata: [93, 184, 216, 34] },
  ],
};

const at = <T extends { readonly path: string }>(fields: readonly T[], path: string): T => {
  const found = fields.find((f) => f.path === path);
  if (!found) throw new Error(`no field ${path}`);
  return found;
};

describe('derived byte layout and field view', () => {
  it('TC-927: picks fields by version and refuses an unknown one', () => {
    const v2784 = deriveLayout(grePack, GRE_KS, { version: 'rfc2784' });
    expect(v2784.bytes).toEqual([0x00, 0x00, 0x08, 0x00]);
    expect(v2784.fields.map((f) => [f.path, f.bitLength])).toEqual([
      ['c', 1],
      ['reserved0', 12],
      ['ver', 3],
      ['protocolType', 16],
    ]);

    const byDefault = deriveLayout(grePack, GRE_KS);
    expect(byDefault).toEqual(deriveLayout(grePack, GRE_KS, { version: 'rfc2890' }));
    expect(byDefault.fields.map((f) => f.path)).toEqual([
      'c',
      'reserved0a',
      'k',
      's',
      'reserved0',
      'ver',
      'protocolType',
      'key',
      'sequence',
    ]);

    expectRefused(
      () => deriveLayout(grePack, GRE_KS, { version: 'rfc1701' }),
      'protocol-pack/unknown-version',
      'pack/unknown-version',
    );
  });

  it('TC-928: places every GRE field where RFC 2890 puts it', () => {
    const { bytes, fields } = deriveLayout(grePack, GRE_KS);
    expect(bytes).toEqual([0x30, 0x00, 0x08, 0x00, 0, 0, 0, 81, 0, 0, 0, 7]);
    const pos = (path: string) => {
      const f = at(fields, path);
      return [f.bitOffset, f.bitLength, f.byteOffset, f.byteLength];
    };
    expect(pos('c')).toEqual([0, 1, 0, 1]);
    expect(pos('reserved0a')).toEqual([1, 1, 0, 1]);
    expect(pos('k')).toEqual([2, 1, 0, 1]);
    expect(pos('s')).toEqual([3, 1, 0, 1]);
    expect(pos('reserved0')).toEqual([4, 9, 0, 2]);
    expect(pos('ver')).toEqual([13, 3, 1, 1]);
    expect(pos('protocolType')).toEqual([16, 16, 2, 2]);
    expect(pos('key')).toEqual([32, 32, 4, 4]);
    expect(pos('sequence')).toEqual([64, 32, 8, 4]);
  });

  it('TC-929: puts Checksum and Reserved1 on the wire only with C, and Key only with K', () => {
    const withChecksum = deriveLayout(grePack, {
      c: 1,
      k: 0,
      s: 0,
      ver: 0,
      protocolType: 0x0800,
      checksum: 0xbeef,
    });
    expect(withChecksum.bytes).toEqual([0x80, 0x00, 0x08, 0x00, 0xbe, 0xef, 0x00, 0x00]);
    expect(at(withChecksum.fields, 'checksum').byteOffset).toBe(4);
    expect(at(withChecksum.fields, 'reserved1').byteOffset).toBe(6);

    const noKey = deriveLayout(grePack, { c: 0, k: 0, s: 0, ver: 0, protocolType: 0x86dd, key: 5 });
    expect(noKey.fields.map((f) => f.path)).not.toContain('key');
    expect(noKey.bytes).toHaveLength(4);
  });

  it('TC-930: shifts every offset by the base offset and keeps the bytes', () => {
    const base0 = deriveLayout(grePack, GRE_KS);
    const base34 = deriveLayout(grePack, GRE_KS, { baseOffset: 34 });
    expect(base34.bytes).toEqual(base0.bytes);
    expect(base34.fields).toHaveLength(9);
    base34.fields.forEach((f, i) => {
      expect(f.byteOffset).toBe(base0.fields[i]!.byteOffset + 34);
      expect(f.bitOffset).toBe(base0.fields[i]!.bitOffset + 272);
    });
  });

  it('TC-931: gives each field-view row its display value and both meanings', () => {
    const rows = deriveAnnotatedFields(grePack, GRE_KS);
    const layout = deriveLayout(grePack, GRE_KS);
    expect(rows.every((r) => r.layer === 'L3')).toBe(true);
    expect(at(rows, 'protocolType')).toMatchObject({
      name: 'Protocol Type',
      displayValue: '0x0800 (IPv4)',
    });
    expect(at(rows, 'key').displayValue).toBe('81');
    expect(at(rows, 'k').displayValue).toBe('1');
    expect(at(rows, 'ver').displayValue).toBe('0 (GRE)');
    for (const row of rows) {
      expect(row.meaning!.en.trim()).not.toBe('');
      expect(row.meaning!.ja.trim()).not.toBe('');
    }
    expect(rows.map((r) => [r.path, r.byteOffset, r.byteLength, r.bitOffset])).toEqual(
      layout.fields.map((f) => [f.path, f.byteOffset, f.byteLength, f.bitOffset]),
    );
  });

  it('TC-932: writes a DNS query in RFC 1035 wire format', () => {
    const { bytes, fields } = deriveLayout(dnsPack, DNS_QUERY);
    expect(bytes).toEqual([
      0x12,
      0x34,
      0x01,
      0x00,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      ...EXAMPLE_COM,
      0,
      1,
      0,
      1,
    ]);
    expect(at(fields, 'question[0].qname')).toMatchObject({ byteOffset: 12, byteLength: 13 });
    expect(at(fields, 'question[0].qtype')).toMatchObject({ byteOffset: 25, byteLength: 2 });
  });

  it('TC-933: writes and shows a DNS answer record', () => {
    const { bytes } = deriveLayout(dnsPack, DNS_RESPONSE);
    expect(bytes.slice(2, 4)).toEqual([0x81, 0x80]);
    expect(bytes.slice(29)).toEqual([
      ...EXAMPLE_COM,
      0,
      1,
      0,
      1,
      0,
      0,
      0x01,
      0x2c,
      0,
      4,
      93,
      184,
      216,
      34,
    ]);
    const rows = deriveAnnotatedFields(dnsPack, DNS_RESPONSE);
    expect(at(rows, 'answer[0].ttl')).toMatchObject({ byteLength: 4, displayValue: '300' });
    expect(at(rows, 'answer[0].rdlength').displayValue).toBe('4');
    expect(at(rows, 'answer[0].rdata').displayValue).toBe('93.184.216.34');
    expect(at(rows, 'rcode').displayValue).toBe('0 (NOERROR)');
    expect(at(rows, 'id').displayValue).toBe('0x1234');
    expect(at(rows, 'qr').displayValue).toBe('1 (RESPONSE)');
  });

  it('TC-934: shows Z as 3 bits in RFC 1035 and as Z, AD, CD in RFC 4035', () => {
    const old = deriveLayout(dnsPack, DNS_QUERY, { version: 'rfc1035' });
    const now = deriveLayout(dnsPack, { ...DNS_QUERY, ad: 0, cd: 0 }, { version: 'rfc4035' });
    expect(at(old.fields, 'z').bitLength).toBe(3);
    expect(old.fields.map((f) => f.path)).not.toContain('ad');
    expect(at(now.fields, 'z').bitLength).toBe(1);
    expect([at(now.fields, 'ad').bitOffset, at(now.fields, 'cd').bitOffset]).toEqual([26, 27]);
    expect(now.bytes.slice(0, 12)).toEqual(old.bytes.slice(0, 12));
  });
});

describe('derived label, filter token, packet-lab ids and glossary', () => {
  it('TC-935: labels GRE and DNS as the trace does', () => {
    expect(deriveTraceLabel(grePack, GRE_KS)).toBe('GRE');
    expect(deriveTraceLabel(dnsPack, DNS_QUERY)).toBe('DNS QUERY');
    expect(deriveTraceLabel(dnsPack, DNS_RESPONSE)).toBe('DNS RESPONSE');
    expect(deriveTraceLabel(dnsPack)).toBe('DNS');
  });

  it('TC-936: derives the filter token and the packet-lab ids per version', () => {
    expect(deriveFilterToken(grePack)).toBe('gre');
    const now = derivePacketLabFieldIds(grePack);
    expect(now).toEqual([
      'gre.c',
      'gre.k',
      'gre.s',
      'gre.ver',
      'gre.protocolType',
      'gre.checksum',
      'gre.key',
      'gre.sequence',
    ]);
    expect(derivePacketLabFieldIds(grePack, 'rfc2784')).toEqual([
      'gre.c',
      'gre.ver',
      'gre.protocolType',
      'gre.checksum',
    ]);
    expect(derivePacketLabFieldIds(dnsPack)).toContain('dns.answer.ttl');
  });

  it('TC-937: derives a bilingual glossary with versions, specs and named values', () => {
    const glossary = deriveGlossary(dnsPack);
    expect(glossary[0]).toMatchObject({
      id: 'dns',
      term: 'DNS',
      meaning: { en: 'Domain Name System', ja: 'ドメインネームシステム' },
    });
    const ids = glossary.map((e) => e.id);
    expect(ids).toContain('dns.question.qname');
    expect(ids).toContain('dns.answer.rdata');
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of glossary) {
      expect(entry.meaning.en.trim()).not.toBe('');
      expect(entry.meaning.ja.trim()).not.toBe('');
    }
    const ttl = glossary.find((e) => e.id === 'dns.answer.ttl')!;
    expect(ttl).toMatchObject({ term: 'TTL', example: '300', versions: ['rfc1035', 'rfc4035'] });
    expect(ttl.specs.map((s) => s.id)).toEqual(['RFC 1035', 'RFC 2181', 'RFC 4035']);
    const rcode = glossary.find((e) => e.id === 'dns.rcode')!;
    expect(rcode.values?.find((v) => v.name === 'NXDOMAIN')).toMatchObject({
      value: 3,
      meaning: { en: 'The name does not exist' },
    });
    const ad = glossary.find((e) => e.id === 'dns.ad')!;
    expect(ad.versions).toEqual(['rfc4035']);
    expect(glossary.find((e) => e.id === 'dns.z')!.versions).toEqual(['rfc1035', 'rfc4035']);
  });
});

describe('header objects that disagree with the schema', () => {
  const bad = 'protocol-pack/invalid-header' as const;

  it('TC-938: refuses a missing value and sends a missing reserved field as 0', () => {
    const { protocolType: _omit, ...noType } = GRE_KS;
    expectRefused(() => deriveLayout(grePack, noType), bad, 'pack/missing-value', 'protocolType');
    expect(deriveLayout(grePack, { ...GRE_KS, reserved0: undefined }).bytes.slice(0, 2)).toEqual([
      0x30, 0x00,
    ]);
  });

  it('TC-939: refuses a value that does not fit its field', () => {
    expectRefused(
      () => deriveLayout(grePack, { ...GRE_KS, ver: 8 }),
      bad,
      'pack/value-out-of-range',
      'ver',
    );
    const answer = (DNS_RESPONSE['answer'] as readonly HeaderValues[])[0]!;
    expectRefused(
      () => deriveLayout(dnsPack, { ...DNS_RESPONSE, answer: [{ ...answer, ttl: 2 ** 32 }] }),
      bad,
      'pack/value-out-of-range',
      'answer[0].ttl',
    );
  });

  it('TC-940: refuses a count or a length that disagrees with the entries', () => {
    expectRefused(
      () => deriveLayout(dnsPack, { ...DNS_QUERY, qdcount: 2 }),
      bad,
      'pack/count-mismatch',
      'qdcount',
    );
    const answer = (DNS_RESPONSE['answer'] as readonly HeaderValues[])[0]!;
    expectRefused(
      () => deriveLayout(dnsPack, { ...DNS_RESPONSE, answer: [{ ...answer, rdlength: 5 }] }),
      bad,
      'pack/length-mismatch',
      'answer[0].rdata',
    );
  });

  it('TC-941: refuses over-long DNS labels and names, and writes the root as one zero byte', () => {
    const ask = (qname: string) => ({ ...DNS_QUERY, question: [{ qname, qtype: 1, qclass: 1 }] });
    expectRefused(
      () => deriveLayout(dnsPack, ask(`${'a'.repeat(64)}.com`)),
      bad,
      'pack/value-out-of-range',
      'question[0].qname',
    );
    const longName = Array.from({ length: 5 }, () => 'b'.repeat(60)).join('.');
    expectRefused(
      () => deriveLayout(dnsPack, ask(longName)),
      bad,
      'pack/value-out-of-range',
      'question[0].qname',
    );
    const root = deriveLayout(dnsPack, ask('.'));
    expect(at(root.fields, 'question[0].qname').byteLength).toBe(1);
    expect(root.bytes[12]).toBe(0);
  });
});
