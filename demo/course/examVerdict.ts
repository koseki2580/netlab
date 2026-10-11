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
  notLearned = 0,
}: {
  score: number;
  passMark: number;
  level: number;
  total?: number;
  /** How many of the questions not scored were answered "not learned yet". */
  notLearned?: number;
}): Words {
  const missed = total - score;
  // "Not learned yet" is an honest answer, not a mistake: calling it one told
  // a learner who had said "I have not got to this" that they had got it wrong.
  const wrong = missed - notLearned;
  if (missed === 0) {
    return level === 1
      ? { en: 'Full marks. You have the basics.', ja: '満点です。基本は身についています。' }
      : { en: 'Full marks. You passed this level.', ja: '満点です。このレベルは合格です。' };
  }
  if (score >= passMark && notLearned > 0) {
    return wrong > 0
      ? {
          en: `You passed. Check the ${wrong} you missed and the ${notLearned} you have not learned yet below.`,
          ja: `合格です。まちがえた ${wrong} 問と、まだ習っていない ${notLearned} 問は、下で確かめましょう。`,
        }
      : {
          en: `You passed. The ${notLearned} you have not learned yet are taught in the lessons below.`,
          ja: `合格です。まだ習っていない ${notLearned} 問は、下のレッスンで学べます。`,
        };
  }
  if (score >= passMark) {
    return {
      en: `You passed. Check the ${missed} you missed below.`,
      ja: `合格です。まちがえた ${missed} 問は、下で確かめましょう。`,
    };
  }
  const more = passMark - score;
  if (notLearned > 0) {
    return {
      en: `${more} more to pass. Each question you missed or have not learned yet names the lesson that teaches it. Go back to those, then try again.`,
      ja: `あと ${more} 問で合格です。まちがえた問題と、まだ習っていない問題には、それを教えるレッスンが書いてあります。そこへ戻ってから、もう一度挑戦してください。`,
    };
  }
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

/** Which questions were answered "not learned yet": named apart from the wrong ones. */
export function notLearnedSentence(numbers: readonly number[]): Words {
  if (numbers.length === 0) return { en: '', ja: '' };
  if (numbers.length === 1) {
    return {
      en: `Not learned yet: question ${numbers[0]}`,
      ja: `まだ習っていないのは 問 ${numbers[0]} です`,
    };
  }
  return {
    en: `Not learned yet: ${numbers.length} questions (${numbers.join(', ')})`,
    ja: `まだ習っていない ${numbers.length} 問（${numbers.map((n) => `問 ${n}`).join('・')}）`,
  };
}

/**
 * The number of the first question with no answer, when some but not all are
 * answered: where a learner coming back to an unfinished test takes it up.
 */
export function firstUnanswered(
  questionIds: readonly string[],
  answers: Readonly<Record<string, unknown>>,
): number | null {
  const index = questionIds.findIndex((id) => answers[id] === undefined);
  const answered = questionIds.filter((id) => answers[id] !== undefined).length;
  return index >= 0 && answered > 0 ? index + 1 : null;
}
