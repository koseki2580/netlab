/** TC-1167: the template is a valid pack. Copy this test with the folder and add an RFC vector. */
import { describe, expect, it } from 'vitest';
import { defineProtocol } from '../pack/define';
import { mergeLearn } from '../pack/merge';
import { deriveLayout } from '../pack/wire';
import templateLearn from './pack-template';
import { templateWire } from './wire';

describe('the protocol template (TC-1167)', () => {
  it('passes defineProtocol and writes its bytes', () => {
    const pack = defineProtocol(mergeLearn(templateWire, templateLearn));
    expect(pack.id).toBe('template');
    expect(deriveLayout(pack, { kind: 1, flag: 1, length: 4 }).bytes).toEqual([1, 0x80, 0, 4]);
  });
});
