import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../i18n/createTranslator';
import { en } from '../../i18n/locales/en';
import { ja } from '../../i18n/locales/ja';
import { generateRouteProblem, gradeRoute } from '../../learning/routing-decision';
import { expectedAnswer, generateProblem, subnetFacts } from '../../learning/subnetting';
import { parseCidr } from '../../utils/cidr';
import { routeExplanation, routePrompt, subnetExplanation, subnetPrompt } from './drillI18n';

const tEn = createTranslator('en', en);
const tJa = createTranslator('ja', ja);

function factsFor(cidr: string) {
  const { length } = parseCidr(cidr);
  return subnetFacts(cidr.split('/')[0] ?? '0.0.0.0', length);
}

/**
 * The catalog and the logic-layer generators/graders both carry the English
 * wording; these tests pin them together so they can never drift, and prove
 * the ja catalog actually localizes (not the raw key, not the English).
 */
describe('drill i18n consistency', () => {
  it('en subnet prompts and explanations equal the generator/grader English', () => {
    for (let seq = 0; seq < 120; seq += 1) {
      const problem = generateProblem(0x5eed, seq);
      const facts = factsFor(problem.givenCidr);
      const { expected, explanation } = expectedAnswer(problem);

      const prompt = subnetPrompt(problem);
      expect(tEn(prompt.key, prompt.params)).toBe(problem.prompt);

      const explain = subnetExplanation(problem, facts, expected);
      expect(tEn(explain.key, explain.params)).toBe(explanation);
    }
  });

  it('en route prompt and explanation equal the generator/grader English', () => {
    for (let seq = 0; seq < 80; seq += 1) {
      const problem = generateRouteProblem(0x70a57, seq);
      const prompt = routePrompt(problem);
      expect(tEn(prompt.key, prompt.params)).toBe(problem.prompt);

      const explain = routeExplanation(problem);
      const graded = gradeRoute(problem, 'whatever');
      expect(tEn(explain.key, explain.params)).toBe(graded.explanation);
    }
  });

  it('ja renders localized text for every prompt/explanation key (never the key or English)', () => {
    for (let seq = 0; seq < 40; seq += 1) {
      const problem = generateProblem(0x5eed, seq);
      const facts = factsFor(problem.givenCidr);
      const { expected } = expectedAnswer(problem);
      for (const entry of [subnetPrompt(problem), subnetExplanation(problem, facts, expected)]) {
        const text = tJa(entry.key, entry.params);
        expect(text).not.toBe(entry.key);
        expect(text).not.toBe(tEn(entry.key, entry.params));
      }

      const route = generateRouteProblem(0x70a57, seq);
      for (const entry of [routePrompt(route), routeExplanation(route)]) {
        const text = tJa(entry.key, entry.params);
        expect(text).not.toBe(entry.key);
        expect(text).not.toBe(tEn(entry.key, entry.params));
      }
    }
  });
});
