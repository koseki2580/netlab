/** The words on the final test's score card. Pure, so they can be checked without a page. */

interface Words {
  readonly en: string;
  readonly ja: string;
}

/**
 * What the mark means, in proportion to the mark: full marks, a pass with
 * something missed, or not yet. "You have the basics" beside a miss told a
 * learner the miss did not matter.
 */
export function examVerdict({
  score,
  passMark,
  level,
  total = 10,
}: {
  score: number;
  passMark: number;
  level: number;
  total?: number;
}): Words {
  const missed = total - score;
  if (missed === 0) {
    return level === 1
      ? { en: 'Full marks. You have the basics.', ja: '満点です。基本は身についています。' }
      : { en: 'Full marks. You passed this level.', ja: '満点です。このレベルは合格です。' };
  }
  if (score >= passMark) {
    return {
      en: `You passed. Check the ${missed} you missed below.`,
      ja: `合格です。まちがえた ${missed} 問は、下で確かめましょう。`,
    };
  }
  const more = passMark - score;
  return {
    en: `${more} more to pass. Each missed question names the lesson that teaches it. Go back to those, then try again.`,
    ja: `あと ${more} 問で合格です。まちがえた問題には、それを教えるレッスンが書いてあります。そこへ戻ってから、もう一度挑戦してください。`,
  };
}

/** Which questions were missed, by number: said at the top, so nobody has to scroll to find out. */
export function missedSentence(numbers: readonly number[]): Words {
  if (numbers.length === 0) return { en: '', ja: '' };
  if (numbers.length === 1) {
    return { en: `You missed question ${numbers[0]}`, ja: `まちがえたのは 問 ${numbers[0]} です` };
  }
  return {
    en: `You missed ${numbers.length} questions (${numbers.join(', ')})`,
    ja: `まちがえたのは ${numbers.length} 問です（${numbers.map((n) => `問 ${n}`).join('・')}）`,
  };
}
