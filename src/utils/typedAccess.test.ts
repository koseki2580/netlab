import { describe, it, expect } from 'vitest';
import { assertDefined, getRequired } from './typedAccess';
import { NetlabError } from '../errors/NetlabError';

describe('assertDefined', () => {
  it.each([[0], [''], [false], [null], [{}]])('passes through %p', (v) => {
    expect(() => assertDefined(v)).not.toThrow();
  });

  it('throws NetlabError on undefined', () => {
    expect(() => assertDefined(undefined)).toThrow(NetlabError);
  });

  it('uses provided message', () => {
    expect(() => assertDefined(undefined, 'node missing')).toThrow('node missing');
  });

  it('narrows after assertion', () => {
    const v: string | undefined = 'x' as string | undefined;
    assertDefined(v);
    expect(v.length).toBe(1);
  });
});

describe('getRequired', () => {
  it('returns element at index', () => {
    expect(getRequired([1, 2, 3], 1)).toBe(2);
  });

  it('throws on out-of-bounds', () => {
    expect(() => getRequired([1, 2, 3], 5)).toThrow(NetlabError);
  });

  it('throws on empty array', () => {
    expect(() => getRequired([], 0)).toThrow(/out of bounds.*length=0/);
  });

  it('attaches context', () => {
    try {
      getRequired([], 0, { reason: 'no nodes' });
    } catch (e) {
      expect(e).toBeInstanceOf(NetlabError);
      expect((e as NetlabError).context).toMatchObject({
        index: 0,
        length: 0,
        reason: 'no nodes',
      });
    }
  });
});
