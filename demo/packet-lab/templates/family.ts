/**
 * The packet-exercise templates as a family for the shared verify harness
 * (`demo/exercises/verify/harness.ts`). Test-only: nothing in the app imports it.
 */

import type { Offer, TemplateFamily } from '../../exercises/verify/harness';
import type { BuildPart, PacketExercise } from '../model';
import { buildPool, exerciseById, PACKET_GENERATOR_VERSION, POOL_SEEDS, TEMPLATES } from './index';

/** What a packet exercise offers to pick from: field candidates and the questions' candidates. */
function offers(exercise: PacketExercise): Offer[] {
  const fromFields = (part: BuildPart | undefined): Offer[] =>
    (part?.fields ?? []).flatMap((entry) =>
      entry.candidates
        ? [
            {
              key: `${exercise.templateId}:${entry.id}`,
              candidates: entry.candidates.map((candidate) => ({
                value:
                  typeof candidate.value === 'number' ? candidate.value : String(candidate.value),
                right: candidate.why === 'right',
              })),
            },
          ]
        : [],
    );
  if (exercise.kind === 'build-packet') return fromFields(exercise);
  if (exercise.kind === 'read-packet') {
    return [
      ...exercise.questions.map((question) => ({
        key: `${exercise.templateId}:${question.id}`,
        candidates: question.candidates.map((candidate) => ({
          value: typeof candidate.value === 'number' ? candidate.value : String(candidate.value),
          right: candidate.why === 'right',
        })),
      })),
      ...fromFields(exercise.fix),
    ];
  }
  return [];
}

/** The first five seeds that set different tasks (fingerprints). */
function fiveTasks(generate: (seed: number) => PacketExercise): PacketExercise[] {
  const found: PacketExercise[] = [];
  const seen = new Set<string>();
  for (let seed = 0; seed < POOL_SEEDS && found.length < 5; seed += 1) {
    const exercise = generate(seed);
    if (seen.has(exercise.fingerprint)) continue;
    seen.add(exercise.fingerprint);
    found.push(exercise);
  }
  return found;
}

export const PACKET_FAMILY: TemplateFamily<PacketExercise> = {
  name: 'packet',
  templates: TEMPLATES,
  poolSeeds: POOL_SEEDS,
  buildPool,
  exerciseById,
  minPool: 40,
  offers,
  golden: {
    describe: `packet exercise templates, generator version ${PACKET_GENERATOR_VERSION}`,
    it: '%s: five different tasks as the learner reads them',
    instances: (template) => fiveTasks(template.generate),
    count: 5,
    view: (exercise) => ({
      id: exercise.id,
      fingerprint: exercise.fingerprint,
      title: exercise.title.ja,
      task: exercise.task.ja,
      rule: exercise.rule.ja,
      brief: exercise.brief.ja,
    }),
  },
};
