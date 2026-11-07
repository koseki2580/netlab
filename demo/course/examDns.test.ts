import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../../src/cli/runtime';
import { createResolverCache, resolve } from '../../src/services/DnsResolver';
import { dnsLabTopology } from '../../src/services/dnsFixture';
import { EXAM_LEVEL_1 } from './examQuestions';
import { STAGES } from './stages';

const stageOfExamLevel = (level: number) =>
  STAGES.find((stage) =>
    stage.checkpoints.some(
      (checkpoint) => checkpoint.kind === 'exam' && checkpoint.level === level,
    ),
  )?.number;

const question = () => EXAM_LEVEL_1.questions.find((entry) => entry.id === 'dns-second-lookup');

// TC-1236
describe('the stage 4 test asks about the resolution chain and caching', () => {
  it('stands in level 1, ten questions, and the replaced one is gone', () => {
    expect(question()).toBeDefined();
    expect(EXAM_LEVEL_1.questions).toHaveLength(10);
    expect(EXAM_LEVEL_1.questions.map((entry) => entry.id)).not.toContain('route-table');
    expect(stageOfExamLevel(1)).toBe(4);
  });

  it('is right by the resolver: a minute later, nobody is asked and the TTL is 240', () => {
    const topology = enrichTopology(dnsLabTopology());
    const cache = createResolverCache();
    resolve(topology, 'resolver', { name: 'www.example.com', type: 'A' }, cache, 0);
    const later = resolve(topology, 'resolver', { name: 'www.example.com', type: 'A' }, cache, 60);
    expect(later.steps).toEqual([]);
    expect(later.answer.answers.map((record) => record.ttl)).toEqual([240, 240]);
    expect(question()?.options[question()?.answer ?? 0]?.en).toContain('240');
  });
});
