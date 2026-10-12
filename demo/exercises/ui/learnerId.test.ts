// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { learnerIdFromAddress, rememberedLearnerId } from './learnerId';

// TC-544
describe('the learner id named in the address', () => {
  it('is read before the #, where a hash-routed link usually carries it', () => {
    expect(learnerIdFromAddress('?learnerId=persona-kimura', '#/exercises')).toBe('persona-kimura');
  });

  it('is read after the #, as the route’s own query', () => {
    expect(learnerIdFromAddress('', '#/exercises/do/l1-host-address~0?learnerId=class-7')).toBe(
      'class-7',
    );
  });

  it('prefers the one after the # when both are given, as the rest of the app does', () => {
    expect(learnerIdFromAddress('?learnerId=outer', '#/exercises?learnerId=inner')).toBe('inner');
  });

  it('is null when none is named or the id is not a usable one', () => {
    expect(learnerIdFromAddress('', '#/exercises')).toBeNull();
    expect(learnerIdFromAddress('?learnerId=', '#/exercises')).toBeNull();
    expect(learnerIdFromAddress('?learnerId=a/b c', '#/exercises')).toBeNull();
  });

  it('stays for the life of the page once seen, so a link that drops the query keeps the learner', () => {
    const seen = { current: null as string | null };
    expect(rememberedLearnerId('', '#/exercises?learnerId=persona-sato', seen)).toBe(
      'persona-sato',
    );
    expect(rememberedLearnerId('', '#/exercises/level/1', seen)).toBe('persona-sato');
    expect(rememberedLearnerId('', '#/exercises?learnerId=other', seen)).toBe('other');
  });

  // TC-619
  it('stays across a reload of an address that no longer names it, within the same tab', () => {
    const kept = new Map<string, string>();
    const tab = {
      getItem: (key: string) => kept.get(key) ?? null,
      setItem: (key: string, value: string) => void kept.set(key, value),
    };
    expect(
      rememberedLearnerId('', '#/exercises?learnerId=persona-sato', { current: null }, tab),
    ).toBe('persona-sato');
    // A reload: the page starts with nothing seen, and the address has lost the query.
    expect(rememberedLearnerId('', '#/exercises/level/1', { current: null }, tab)).toBe(
      'persona-sato',
    );
    // An address that names another learner wins, and is what is kept from then on.
    expect(rememberedLearnerId('?learnerId=other', '#/exercises', { current: null }, tab)).toBe(
      'other',
    );
    expect(rememberedLearnerId('', '#/exercises', { current: null }, tab)).toBe('other');
  });

  // TC-619
  it('is not taken from a tab memory that holds something unusable, or that throws', () => {
    const bad = { getItem: () => 'a/b c', setItem: () => undefined };
    expect(rememberedLearnerId('', '#/exercises', { current: null }, bad)).toBeNull();
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(rememberedLearnerId('', '#/exercises', { current: null }, broken)).toBeNull();
    expect(rememberedLearnerId('?learnerId=x1', '#/exercises', { current: null }, broken)).toBe(
      'x1',
    );
  });
});
