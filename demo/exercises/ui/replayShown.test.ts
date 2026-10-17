// @vitest-environment node
/**
 * What the diagram says when it replays a Check: the marker must never state a
 * cause the feedback does not state, and must not sit on a device the packet
 * was merely flooded to. TC-660, TC-661.
 */
import { describe, expect, it } from 'vitest';
import { en } from '../../../src/i18n/locales/en';
import { ja } from '../../../src/i18n/locales/ja';
import { gradeExercise } from '../grade/gradeExercise';
import { exerciseById } from '../templates';
import { diagramWords, shownTrace } from './replayShown';

async function startResult(id: string, checkId: string) {
  const exercise = exerciseById(id);
  if (!exercise) throw new Error(`no ${id}`);
  const grade = await gradeExercise(exercise, exercise.start);
  const result = grade.results.find((entry) => entry.checkId === checkId);
  if (!result?.trace) throw new Error(`no trace for ${checkId}`);
  return { exercise, result, trace: result.trace };
}

// TC-660
describe('the words of the diagram in an exercise', () => {
  it('every "dropped here" sentence of the library is replaced by one that names no cause', () => {
    for (const [locale, catalog, words] of [
      ['ja', ja, 'ここで止まりました'],
      ['en', en, 'It stopped here'],
    ] as const) {
      const own = diagramWords(locale);
      const dropKeys = Object.keys(catalog).filter((key) =>
        key.startsWith('simulation.packetStory.drop'),
      );
      expect(dropKeys.length).toBeGreaterThan(5);
      for (const key of dropKeys) expect(own[key as keyof typeof own], key).toBe(words);
    }
  });

  it('a cable that is out is called what the page calls it, and what moves is not called a packet', () => {
    const own = diagramWords('ja');
    expect(own['simulation.linkState.down']).toBe('ぬけているケーブル');
    for (const key of Object.keys(ja).filter(
      (entry) =>
        entry.startsWith('simulation.packetStory.') ||
        entry.startsWith('simulation.linkState.down'),
    )) {
      expect(own[key as keyof typeof own], key).not.toMatch(/リンク|パケット|故障|経路/);
    }
  });
});

// TC-661
describe('where the replay ends', () => {
  it('a frame nobody could take was flooded to a bystander: the replay ends before it, with the marker there', async () => {
    const { exercise, result, trace } = await startResult('l1-host-address~1', 'reach-pc1-srv');
    // The simulator reports the drop at another PC, and the feedback is about the till's address.
    expect(result.evidence?.nodeId).toBe('pc2');
    expect(result.evidence?.diagnosis).toBe('wrong-network');
    const shown = shownTrace(trace, exercise.start);
    expect(shown.hops.map((hop) => hop.nodeId)).toEqual(['pc1', 'sw1']);
    const last = shown.hops[shown.hops.length - 1];
    expect(last).toMatchObject({ nodeId: 'sw1', event: 'drop' });
    expect(last?.activeEdgeId).toBeUndefined();
    // The trace the grader holds is not changed.
    expect(trace.hops.map((hop) => hop.nodeId)).toEqual(['pc1', 'sw1', 'pc2']);
  });

  it('a drop at the sender, at a router, or a delivery is shown as it is', async () => {
    for (const [id, checkId] of [
      ['l1-cable-off~1', 'reach-pc1-srv'],
      ['l1-router-address~0', 'reach-pc1-srv'],
      ['l1-host-address~1', 'reach-pc2-srv'],
    ] as const) {
      const { exercise, trace } = await startResult(id, checkId);
      expect(shownTrace(trace, exercise.start), id).toBe(trace);
    }
  });
});
