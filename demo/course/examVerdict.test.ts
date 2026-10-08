// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { examVerdict, missedSentence } from './examVerdict';

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
