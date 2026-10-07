// @vitest-environment node
/**
 * Three instances of every template, as the learner reads them. A change here
 * is a change to what learners get: read the diff (a native read of the
 * Japanese is part of review), then bump `GENERATOR_VERSION`.
 */

import { describe, expect, it } from 'vitest';
import { GENERATOR_VERSION, TEMPLATES } from './index';

describe(`exercise templates, generator version ${GENERATOR_VERSION}`, () => {
  it.each(TEMPLATES.map((template) => [template.id, template] as const))(
    '%s: seeds 0, 1 and 2',
    (_, template) => {
      const instances = [0, 1, 2].map((seed) => {
        const exercise = template.generate(seed);
        return {
          id: exercise.id,
          fingerprint: exercise.fingerprint,
          title: exercise.title.ja,
          brief: exercise.brief.ja,
        };
      });
      expect(instances).toMatchSnapshot();
    },
  );
});
