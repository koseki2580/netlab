/**
 * Bits and bytes practice (REQ-367): the eight bits of an octet, which every
 * address, mask and subnet is made of. Four kinds of question, mixed in one
 * round so the learner has to tell them apart.
 */
export type BitsKind = 'to-binary' | 'to-decimal' | 'mask-octet' | 'and';

export interface BitsQuestion {
  readonly kind: BitsKind;
  /** to-binary / to-decimal: the octet. mask-octet: the prefix within the octet (0–8). and: the address octet. */
  readonly value: number;
  /** and: the mask octet. */
  readonly mask?: number;
}

export const WEIGHTS = [128, 64, 32, 16, 8, 4, 2, 1] as const;

export const toBinary = (value: number) => value.toString(2).padStart(8, '0');

/** The octet a /n gives within one octet: n ones from the left. */
export const maskOctet = (ones: number) => (0xff << (8 - ones)) & 0xff;

/** The right answer, as the learner would type it. */
export function answerOf(question: BitsQuestion): string {
  switch (question.kind) {
    case 'to-binary':
      return toBinary(question.value);
    case 'to-decimal':
      return String(question.value);
    case 'mask-octet':
      return String(maskOctet(question.value));
    case 'and':
      return String(question.value & (question.mask ?? 0));
  }
}

/** Whether an answer is right: binary answers ignore spaces, decimal ones leading zeros. */
export function isRight(question: BitsQuestion, answer: string): boolean {
  const typed = answer.replace(/\s+/g, '');
  if (question.kind === 'to-binary') return /^[01]{8}$/.test(typed) && typed === answerOf(question);
  return /^\d{1,3}$/.test(typed) && Number(typed) === Number(answerOf(question));
}

/** The worked answer: which weights are on, and how they add up. */
export function working(question: BitsQuestion): string {
  const sum = (value: number) => WEIGHTS.filter((weight) => value & weight).join(' + ') || '0';
  switch (question.kind) {
    case 'to-binary':
    case 'to-decimal':
      return `${toBinary(question.value)} = ${sum(question.value)} = ${question.value}`;
    case 'mask-octet': {
      const value = maskOctet(question.value);
      return `${toBinary(value)} = ${sum(value)} = ${value}`;
    }
    case 'and': {
      const mask = question.mask ?? 0;
      const result = question.value & mask;
      return `${toBinary(question.value)} AND ${toBinary(mask)} = ${toBinary(result)} = ${result}`;
    }
  }
}

function random(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const KINDS: readonly BitsKind[] = ['to-binary', 'to-decimal', 'mask-octet', 'and'];

/** A round of `count` questions, every kind in it, in a mixed order. */
export function generateRound(seed: number, count = 8): BitsQuestion[] {
  const next = random(seed);
  const octet = () => Math.floor(next() * 256);
  const questions = Array.from({ length: count }, (_, index): BitsQuestion => {
    const kind = KINDS[index % KINDS.length]!;
    if (kind === 'mask-octet') return { kind, value: 1 + Math.floor(next() * 7) };
    if (kind === 'and')
      return { kind, value: octet(), mask: maskOctet(1 + Math.floor(next() * 7)) };
    return { kind, value: octet() };
  });
  for (let index = questions.length - 1; index > 0; index -= 1) {
    const other = Math.floor(next() * (index + 1));
    [questions[index], questions[other]] = [questions[other]!, questions[index]!];
  }
  return questions;
}
