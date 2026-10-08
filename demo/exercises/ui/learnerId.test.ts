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
});
