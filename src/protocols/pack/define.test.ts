import { describe, expect, it } from 'vitest';
import { defineProtocol } from './define';
import { dnsPack } from './fixtures/dns.pack';
import { grePack } from './fixtures/gre.pack';
import { expectRefused, toyDescriptor, toyField } from './testing';
import type { ProtocolDescriptor } from './types';

const invalid = 'protocol-pack/invalid-descriptor' as const;

describe('defineProtocol', () => {
  it('TC-920: accepts the GRE and DNS descriptors as given', () => {
    expect(grePack).toMatchObject({
      id: 'gre',
      name: { short: 'GRE', en: 'Generic Routing Encapsulation', ja: '汎用ルーティングカプセル化' },
      layer: 'L3',
      numbers: { ipProtocol: 47 },
      defaultVersion: 'rfc2890',
    });
    expect(grePack.specs.map((s) => s.id)).toEqual(['RFC 2784', 'RFC 2890']);
    expect(dnsPack).toMatchObject({
      id: 'dns',
      layer: 'L7',
      numbers: {
        ports: [
          { transport: 'udp', port: 53 },
          { transport: 'tcp', port: 53 },
        ],
      },
      defaultVersion: 'rfc4035',
    });
    expect(dnsPack.specs.find((s) => s.id === 'RFC 1035')).toMatchObject({
      year: 1987,
      status: 'internet-standard',
    });
  });

  it('TC-921: refuses a malformed id, an empty meaning and a missing example', () => {
    expectRefused(
      () => defineProtocol(toyDescriptor({ id: 'GRE!' })),
      invalid,
      'pack/invalid-id',
      'id',
    );
    expectRefused(
      () =>
        defineProtocol(
          toyDescriptor({ header: [toyField({ meaning: { en: 'A byte.', ja: '  ' } })] }),
        ),
      invalid,
      'pack/missing-text',
      'header.a.meaning.ja',
    );
    const { example: _omit, ...noExample } = toyField();
    expectRefused(
      () => defineProtocol(toyDescriptor({ header: [noExample as never] })),
      invalid,
      'pack/missing-example',
      'header.a',
    );
    expectRefused(
      () => defineProtocol(toyDescriptor({ name: { short: 'TOY', en: 'Toy', ja: '' } })),
      invalid,
      'pack/missing-text',
      'name.ja',
    );
  });

  it('TC-922: refuses references that point nowhere', () => {
    const cases: [ProtocolDescriptor, string][] = [
      [toyDescriptor({ header: [toyField({ presentIf: 'nope' })] }), 'header.a'],
      [
        toyDescriptor({
          header: [toyField({ key: 'n' }), toyField({ key: 'b', presentIf: 'n' })],
        }),
        'header.b',
      ],
      [
        toyDescriptor({
          header: [toyField({ key: 'b', type: 'bytes', bits: undefined, lengthFrom: 'len' })],
        }),
        'header.b',
      ],
      [
        toyDescriptor({
          sections: [
            {
              key: 'rows',
              name: 'Rows',
              countFrom: 'nope',
              meaning: { en: 'x', ja: 'x' },
              fields: [toyField()],
            },
          ],
        }),
        'sections.rows',
      ],
      [toyDescriptor({ header: [toyField({ in: ['v9'] })] }), 'header.a'],
      [
        toyDescriptor({
          versions: [{ id: 'v1', specs: ['RFC 9999'], default: true, extends: 'v0' }],
        }),
        'versions.v1',
      ],
      [toyDescriptor({ versions: [{ id: 'v1', specs: ['RFC 1'], default: true }] }), 'versions.v1'],
      [toyDescriptor({ label: { field: 'nope' } }), 'label'],
    ];
    for (const [descriptor, path] of cases) {
      expectRefused(() => defineProtocol(descriptor), invalid, 'pack/unknown-reference', path);
    }
  });

  it('TC-923: refuses fields that do not close on a byte boundary', () => {
    expectRefused(
      () => defineProtocol(toyDescriptor({ header: [toyField({ bits: 7 })] })),
      invalid,
      'pack/misaligned',
    );
    expectRefused(
      () =>
        defineProtocol(
          toyDescriptor({
            header: [
              toyField({ bits: 4 }),
              toyField({ key: 'n', type: 'domain-name', bits: undefined, example: 'a.b' }),
              toyField({ key: 'pad', bits: 4 }),
            ],
          }),
        ),
      invalid,
      'pack/misaligned',
      'header.n',
    );
  });

  it('TC-924: refuses an example or enum value that does not fit its width', () => {
    expectRefused(
      () =>
        defineProtocol(
          toyDescriptor({
            header: [toyField({ bits: 3, example: 8 }), toyField({ key: 'b', bits: 5 })],
          }),
        ),
      invalid,
      'pack/value-out-of-range',
      'header.a',
    );
    expectRefused(
      () =>
        defineProtocol(
          toyDescriptor({
            header: [
              toyField({ type: 'enum', bits: 4, values: [{ value: 16, name: 'BIG' }], example: 0 }),
              toyField({ key: 'b', bits: 4 }),
            ],
          }),
        ),
      invalid,
      'pack/value-out-of-range',
      'header.a',
    );
  });

  it('TC-925: refuses an unsupported apiVersion and names the supported one', () => {
    const error = expectRefused(
      () => defineProtocol({ ...toyDescriptor(), apiVersion: 2 } as unknown as ProtocolDescriptor),
      invalid,
      'pack/unsupported-api-version',
    );
    expect(error.message).toContain('1');
  });

  it('TC-926: needs exactly one default version and keys unique per version', () => {
    const spec = ['RFC 9999'];
    expectRefused(
      () => defineProtocol(toyDescriptor({ versions: [{ id: 'v1', specs: spec }] })),
      invalid,
      'pack/invalid-versions',
    );
    expectRefused(
      () =>
        defineProtocol(
          toyDescriptor({
            versions: [
              { id: 'v1', specs: spec, default: true },
              { id: 'v2', specs: spec, default: true },
            ],
          }),
        ),
      invalid,
      'pack/invalid-versions',
    );
    expectRefused(
      () =>
        defineProtocol(
          toyDescriptor({
            versions: [
              { id: 'v1', specs: spec, default: true },
              { id: 'v1', specs: spec },
            ],
          }),
        ),
      invalid,
      'pack/invalid-versions',
    );
    const twoVersions = [
      { id: 'v1', specs: spec, default: true },
      { id: 'v2', specs: spec },
    ];
    expectRefused(
      () =>
        defineProtocol(
          toyDescriptor({
            versions: twoVersions,
            header: [toyField({ in: ['v1', 'v2'] }), toyField({ in: ['v2'] })],
          }),
        ),
      invalid,
      'pack/duplicate-key',
      'header.a',
    );
    expect(() =>
      defineProtocol(
        toyDescriptor({
          versions: twoVersions,
          header: [toyField({ in: ['v1'] }), toyField({ in: ['v2'], bits: 16 })],
        }),
      ),
    ).not.toThrow();
  });
});
