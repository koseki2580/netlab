/** The httpcache concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { httpcache as en } from '../../src/i18n/locales/en/concept/decks/httpcache';
import { httpcache as ja } from '../../src/i18n/locales/ja/concept/decks/httpcache';
import { DECK } from '../../src/learning/concept-check/lessonDecks/httpcache';
import { DEPLOY_TIME, type Resource, type Step, simulate } from './httpCache';

const row = (step: Step, id: Resource['id']) => step.rows.find((r) => r.resource.id === id)!;

describe('TC-2305: httpcache deck facts', () => {
  it('q1: no-cache index.html is revalidated at 30 s and answered 304 with no body', () => {
    const index = row(simulate([0, 30])[1]!, 'index');
    expect(index.resource.cacheControl).toBe('no-cache');
    expect(index).toMatchObject({ browser: 'revalidated-304', status: 304, browserBytes: 0 });
  });

  it('q2: private account.json is stored by the browser and passed by the CDN', () => {
    const [first, second] = simulate([0, 30]);
    expect(row(first!, 'account')).toMatchObject({ cdn: 'pass', cdnAge: null, browserAge: 0 });
    expect(row(second!, 'account').browser).toBe('fresh');
  });

  it('q3: at 120 s hero.jpg is revalidated with the CDN, which answers 304 itself', () => {
    const image = row(simulate([0, 120])[1]!, 'image');
    expect(image).toMatchObject({
      browser: 'revalidated-304',
      cdn: 'hit',
      status: 304,
      originHit: false,
    });
  });

  it('q4: after a deploy at 60 s, at 120 s index.html is new and style.css old, unrequested', () => {
    expect(DEPLOY_TIME).toBe(60);
    const at120 = simulate([0, 120], DEPLOY_TIME)[1]!;
    expect(row(at120, 'index').version).toBe(2);
    expect(row(at120, 'style')).toMatchObject({ version: 1, browser: 'fresh', status: null });
  });
});

describe('httpcache deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.httpcache.${q}`;
        const right = catalog[`${base}.${answer}`]!.length;
        const wrong = Math.max(
          ...(['a', 'b', 'c'] as const)
            .filter((letter) => letter !== answer)
            .map((letter) => catalog[`${base}.${letter}`]!.length),
        );
        expect(right / wrong, `${base}`).toBeLessThanOrEqual(1.6);
      }
    }
  });

  it('the right answer letter varies across the deck', () => {
    expect(new Set(DECK.answers.map(([, answer]) => answer)).size).toBeGreaterThan(1);
  });
});
