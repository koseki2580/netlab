// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { examVerdict, firstUnanswered, missedSentence, notLearnedSentence } from './examVerdict';

// TC-553
describe('what the score card says about the mark', () => {
  it('keeps "you have the basics" for full marks', () => {
    expect(examVerdict({ score: 10, passMark: 8, level: 1 }).ja).toBe(
      '満点です。基本は身についています。',
    );
    expect(examVerdict({ score: 10, passMark: 8, level: 2 }).ja).toBe(
      '満点です。このレベルは合格です。',
    );
  });

  it('says a pass with misses as a pass with something left to check', () => {
    expect(examVerdict({ score: 9, passMark: 8, level: 1 }).ja).toBe(
      '合格です。まちがえた 1 問は、下で確かめましょう。',
    );
    expect(examVerdict({ score: 8, passMark: 8, level: 3 }).en).toBe(
      'You passed. Check the 2 you missed below.',
    );
    expect(examVerdict({ score: 9, passMark: 8, level: 1 }).ja).not.toContain('身について');
  });

  it('says how far a mark below the pass mark is from it', () => {
    expect(examVerdict({ score: 5, passMark: 8, level: 1 }).ja).toBe(
      'あと 3 問で合格です。まちがえた問題には、それを教えるレッスンが書いてあります。そこへ戻ってから、もう一度挑戦してください。',
    );
    expect(examVerdict({ score: 7, passMark: 8, level: 1 }).en).toContain('1 more');
  });
});

// TC-552
describe('the line that names the missed questions', () => {
  it('names one, several, or none', () => {
    expect(missedSentence([5]).ja).toBe('まちがえたのは 問 5 です');
    expect(missedSentence([2, 5, 9]).ja).toBe('まちがえたのは 3 問です（問 2・問 5・問 9）');
    expect(missedSentence([5]).en).toBe('You missed question 5');
    expect(missedSentence([2, 5]).en).toBe('You missed 2 questions (2, 5)');
    expect(missedSentence([]).ja).toBe('');
  });
});

/** TC-569 — "not learned yet" is not a wrong answer, and is not called one. */
describe('answers marked "not learned yet"', () => {
  it('are named separately from wrong answers in the verdict', () => {
    expect(examVerdict({ score: 8, passMark: 8, level: 1, notLearned: 2 }).ja).toBe(
      '合格です。まだ習っていない 2 問は、下のレッスンで学べます。',
    );
    expect(examVerdict({ score: 8, passMark: 8, level: 1, notLearned: 1 }).ja).toBe(
      '合格です。まちがえた 1 問と、まだ習っていない 1 問は、下で確かめましょう。',
    );
    expect(examVerdict({ score: 5, passMark: 8, level: 1, notLearned: 2 }).ja).toBe(
      'あと 3 問で合格です。まちがえた問題と、まだ習っていない問題には、それを教えるレッスンが書いてあります。そこへ戻ってから、もう一度挑戦してください。',
    );
    expect(examVerdict({ score: 8, passMark: 8, level: 1, notLearned: 2 }).en).toBe(
      'You passed. The 2 you have not learned yet are taught in the lessons below.',
    );
  });

  it('are listed in their own sentence', () => {
    expect(notLearnedSentence([]).ja).toBe('');
    expect(notLearnedSentence([4]).ja).toBe('まだ習っていないのは 問 4 です');
    expect(notLearnedSentence([4, 7]).ja).toBe('まだ習っていない 2 問（問 4・問 7）');
    expect(notLearnedSentence([4, 7]).en).toBe('Not learned yet: 2 questions (4, 7)');
  });
});

/** TC-568 — where an unfinished test is taken up again. */
describe('the first unanswered question', () => {
  const ids = ['a', 'b', 'c'];
  it('is offered only when some, but not all, are answered', () => {
    expect(firstUnanswered(ids, {})).toBeNull();
    expect(firstUnanswered(ids, { a: 0, b: 'not-learned', c: 2 })).toBeNull();
    expect(firstUnanswered(ids, { a: 0, b: 1 })).toBe(3);
    expect(firstUnanswered(ids, { a: 0, c: 1 })).toBe(2);
  });
});
