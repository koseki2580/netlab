/** Walker features added within apiVersion 1 (REQ-320). */
import { describe, expect, it } from 'vitest';
import { defineProtocol } from './define';
import { expectRefused, toyDescriptor, toyField } from './testing';
import { deriveLayout } from './wire';

describe('lengths in units, and sections that repeat to the end (TC-1260)', () => {
  const pack = defineProtocol(
    toyDescriptor({
      header: [toyField({ key: 'kind' })],
      sections: [
        {
          key: 'options',
          name: 'Options',
          meaning: { en: 'Options, to the end.', ja: '終わりまでのオプション。' },
          fields: [
            toyField({ key: 'type' }),
            toyField({ key: 'length' }),
            toyField({
              key: 'data',
              type: 'bytes',
              bits: undefined,
              lengthFrom: 'length',
              lengthScale: 8,
              lengthOffset: -2,
              example: [1, 2, 3, 4, 5, 6],
            }),
          ],
        },
      ],
    }),
  );

  it('writes every entry given, each data field as long as its length says', () => {
    const { bytes } = deriveLayout(pack, {
      kind: 9,
      options: [
        { type: 1, length: 1, data: [1, 2, 3, 4, 5, 6] },
        { type: 2, length: 1, data: [6, 5, 4, 3, 2, 1] },
      ],
    });
    expect(bytes).toEqual([9, 1, 1, 1, 2, 3, 4, 5, 6, 2, 1, 6, 5, 4, 3, 2, 1]);
  });

  it('refuses a length that disagrees with the data', () => {
    expectRefused(
      () =>
        deriveLayout(pack, {
          kind: 9,
          options: [{ type: 1, length: 2, data: [1, 2, 3, 4, 5, 6] }],
        }),
      'protocol-pack/invalid-header',
      'pack/length-mismatch',
      'options[0].data',
    );
  });
});

describe('fields that depend on a value, and the rest of the message (TC-1261)', () => {
  const pack = defineProtocol(
    toyDescriptor({
      header: [
        toyField({ key: 'kind' }),
        toyField({ key: 'id', bits: 16, when: { field: 'kind', values: [1] } }),
        toyField({ key: 'rest', type: 'bytes', bits: undefined, example: [] }),
      ],
    }),
  );

  it('writes a when-field only for its values, and the rest as given', () => {
    expect(deriveLayout(pack, { kind: 1, id: 0x0102, rest: [7, 8] }).bytes).toEqual([
      1, 1, 2, 7, 8,
    ]);
    expect(deriveLayout(pack, { kind: 2, id: 0x0102, rest: [7] }).bytes).toEqual([2, 7]);
  });

  it('refuses a rest-of-message field that is not last, and a when that points nowhere', () => {
    expectRefused(
      () =>
        defineProtocol(
          toyDescriptor({
            header: [
              toyField({ key: 'rest', type: 'bytes', bits: undefined, example: [] }),
              toyField(),
            ],
          }),
        ),
      'protocol-pack/invalid-descriptor',
      'pack/invalid-width',
      'header.rest',
    );
    expectRefused(
      () =>
        defineProtocol(
          toyDescriptor({ header: [toyField({ when: { field: 'nope', values: [1] } })] }),
        ),
      'protocol-pack/invalid-descriptor',
      'pack/unknown-reference',
      'header.a',
    );
  });
});
