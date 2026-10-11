// @vitest-environment node
/**
 * Five instances of every template, one set in each place, as the learner reads them. A change here
 * is a change to what learners get: read the diff (a native read of the
 * Japanese is part of review), then bump `GENERATOR_VERSION`.
 */

import { describe, expect, it } from 'vitest';
import type { Exercise } from '../model/types';
import { GENERATOR_VERSION, TEMPLATES } from './index';
import { PLACES } from './shared/places';

/** The first seed set in each of the five places, so that every place's wording is read. */
function onePerPlace(generate: (seed: number) => Exercise): Exercise[] {
  return PLACES.flatMap((place) => {
    for (let seed = 0; seed < 60; seed += 1) {
      const exercise = generate(seed);
      if (exercise.fingerprint.split('|')[1] === place.id) return [exercise];
    }
    return [];
  });
}

// TC-478
describe(`exercise templates, generator version ${GENERATOR_VERSION}`, () => {
  it.each(TEMPLATES.map((template) => [template.id, template] as const))(
    '%s: one instance set in each place (home, shop, clinic, school, office)',
    (_, template) => {
      const instances = onePerPlace(template.generate).map((exercise) => ({
        id: exercise.id,
        fingerprint: exercise.fingerprint,
        title: exercise.title.ja,
        task: exercise.task?.ja,
        rule: exercise.rule?.ja,
        brief: exercise.brief.ja,
      }));
      expect(instances).toHaveLength(5);
      expect(instances).toMatchSnapshot();
    },
  );
});
