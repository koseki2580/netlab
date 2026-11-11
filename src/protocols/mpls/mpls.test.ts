/** TC-1297: the MPLS pack writes RFC 3032 label-stack entries. */
import { describe, expect, it } from 'vitest';
import { defineProtocol } from '../pack/define';
import { mergeLearn } from '../pack/merge';
import { deriveLayout } from '../pack/wire';
import learn from './pack-mpls';
import { mplsToValues, mplsWire } from './wire';

describe('the MPLS pack (TC-1297)', () => {
  it('passes defineProtocol with text in both languages and writes RFC 3032 entries', () => {
    const pack = defineProtocol(mergeLearn(mplsWire, learn));
    for (const field of pack.sections![0]!.fields) {
      expect(field.meaning.en.trim()).not.toBe('');
      expect(field.meaning.ja.trim()).not.toBe('');
    }
    const bytes = deriveLayout(
      pack,
      mplsToValues([{ label: 16, tc: 0, endOfStack: true, ttl: 63 }]),
    ).bytes;
    expect(bytes).toEqual([0x00, 0x01, 0x01, 0x3f]);
  });
});
