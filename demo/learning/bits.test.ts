/** REQ-367 — bits and bytes: the answers, how they are checked, and mixed rounds (TC-1750..TC-1752). */
import { describe, expect, it } from 'vitest';
import { answerOf, generateRound, isRight, maskOctet, working } from './bits';

describe('TC-1750: each kind of question has one right answer, worked out by weights', () => {
  it('converts, makes mask octets, and ANDs', () => {
    expect(answerOf({ kind: 'to-binary', value: 192 })).toBe('11000000');
    expect(answerOf({ kind: 'to-decimal', value: 168 })).toBe('168');
    expect([1, 2, 3, 4, 5, 6, 7].map(maskOctet)).toEqual([128, 192, 224, 240, 248, 252, 254]);
    expect(answerOf({ kind: 'mask-octet', value: 2 })).toBe('192');
    expect(answerOf({ kind: 'and', value: 200, mask: 224 })).toBe('192');
    expect(working({ kind: 'to-decimal', value: 168 })).toBe('10101000 = 128 + 32 + 8 = 168');
    expect(working({ kind: 'and', value: 200, mask: 224 })).toBe(
      '11001000 AND 11100000 = 11000000 = 192',
    );
  });
});

describe('TC-1751: answers are read the way a person types them', () => {
  it('ignores spaces in binary and leading zeros in decimal, and refuses anything else', () => {
    expect(isRight({ kind: 'to-binary', value: 10 }, '0000 1010')).toBe(true);
    expect(isRight({ kind: 'to-binary', value: 10 }, '1010')).toBe(false);
    expect(isRight({ kind: 'to-decimal', value: 10 }, '010')).toBe(true);
    expect(isRight({ kind: 'to-decimal', value: 10 }, 'ten')).toBe(false);
    expect(isRight({ kind: 'mask-octet', value: 3 }, '224')).toBe(true);
  });
});

describe('TC-1752: a round mixes every kind, and a seed repeats it', () => {
  it('holds all four kinds, valid values, and the same round for the same seed', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const round = generateRound(seed);
      expect(new Set(round.map((question) => question.kind)).size).toBe(4);
      for (const question of round) {
        expect(question.value).toBeGreaterThanOrEqual(0);
        expect(question.value).toBeLessThanOrEqual(255);
      }
    }
    expect(generateRound(7)).toEqual(generateRound(7));
  });
});
