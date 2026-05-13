import { describe, expect, it } from 'vitest';
import {
  parseMplsStack,
  popMplsLabel,
  pushMplsLabel,
  serializeMplsStack,
  swapMplsLabel,
} from './MplsLabelStack';

describe('MPLS label stack', () => {
  it('serializes RFC 3032 label 16 vector', () => {
    const bytes = serializeMplsStack([{ label: 16, tc: 0, endOfStack: true, ttl: 64 }]);
    expect(Array.from(bytes)).toEqual([0x00, 0x01, 0x01, 0x40]);
    expect(parseMplsStack(bytes)).toEqual([{ label: 16, tc: 0, endOfStack: true, ttl: 64 }]);
  });

  it('keeps end-of-stack invariant when pushing, swapping, and popping', () => {
    const stack = pushMplsLabel([], { label: 200, tc: 0, endOfStack: true, ttl: 64 });
    const pushed = pushMplsLabel(stack, { label: 100, tc: 0, endOfStack: true, ttl: 63 });
    expect(pushed.map((label) => label.endOfStack)).toEqual([false, true]);
    expect(swapMplsLabel(pushed, 101)[0]?.label).toBe(101);
    expect(popMplsLabel(pushed).stack[0]?.endOfStack).toBe(true);
  });
});
