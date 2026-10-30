import { describe, expect, it } from 'vitest';
import { LESSONS } from '../lessonManifest';
import { LEVEL_KINDS } from '../exercises/store/estimate';
import { packetTemplates } from '../exercises/packet/packetSource';
import { EXAM_LEVELS } from './examLevels';
import {
  NO_PROGRESS,
  OFF_PATH,
  STAGES,
  checkpointPassed,
  examLevelsInStageOrder,
  nextThing,
  stageFacts,
  stageStatuses,
  type StageFacts,
} from './stages';

const facts = (partial: Partial<StageFacts>): StageFacts => ({ ...NO_PROGRESS, ...partial });

/** Every checkpoint of every stage up to `last` passed. */
function passedThrough(last: number): StageFacts {
  const checkpoints = STAGES.slice(0, last).flatMap((stage) => stage.checkpoints);
  return {
    courseDone: checkpoints.some((c) => c.kind === 'course'),
    configCleared: checkpoints.flatMap((c) => (c.kind === 'config' ? [c.level] : [])),
    packetCleared: checkpoints.flatMap((c) => (c.kind === 'packet' ? [c.level] : [])),
    examsPassed: checkpoints.flatMap((c) => (c.kind === 'exam' ? [c.level] : [])),
  };
}

// TC-950
describe('the seven stages (TC-950)', () => {
  it('are in order, each with its Japanese name', () => {
    expect(STAGES.map((stage) => stage.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(STAGES.map((stage) => stage.title.ja)).toEqual([
      '準備',
      'LAN',
      'IP',
      'トランスポートとサービス',
      '企業ネットワーク',
      '事業者とデータセンター',
      '最新とクラウド',
    ]);
  });

  it('place every lesson in exactly one stage, except the tool pages', () => {
    const placed = STAGES.flatMap((stage) => stage.lessons);
    expect(new Set(placed).size).toBe(placed.length);
    const everything = new Set<string>([...placed, ...OFF_PATH]);
    expect(LESSONS.map((lesson) => lesson.path).filter((path) => !everything.has(path))).toEqual(
      [],
    );
    expect(OFF_PATH.filter((path) => placed.includes(path))).toEqual([]);
  });
});

// TC-951
describe('what a stage asks of the learner (TC-951)', () => {
  it('names only exams, exercise levels and packet levels that exist and hold something', () => {
    for (const stage of STAGES) {
      for (const checkpoint of stage.checkpoints) {
        if (checkpoint.kind === 'exam') {
          const level = EXAM_LEVELS.find((entry) => entry.level === checkpoint.level);
          expect(level?.questions.length ?? 0, `stage ${stage.number}`).toBeGreaterThan(0);
        }
        if (checkpoint.kind === 'config') {
          expect(LEVEL_KINDS[checkpoint.level].length, `stage ${stage.number}`).toBeGreaterThan(0);
        }
        if (checkpoint.kind === 'packet') {
          expect(packetTemplates(checkpoint.level).length, `stage ${stage.number}`).toBeGreaterThan(
            0,
          );
        }
      }
      expect(stage.checkpoints.length, `stage ${stage.number}`).toBeGreaterThan(0);
    }
  });
});

// TC-952
describe('stages still being written (TC-952)', () => {
  it('list their planned topics in English and Japanese', () => {
    for (const number of [6, 7]) {
      const stage = STAGES.find((entry) => entry.number === number)!;
      expect(stage.comingSoon.length).toBeGreaterThan(0);
      for (const topic of stage.comingSoon) {
        expect(topic.en.trim()).not.toBe('');
        expect(topic.ja.trim()).not.toBe('');
      }
    }
  });
});

// TC-953
describe('when a checkpoint counts as passed (TC-953)', () => {
  it('the course only when it is finished', () => {
    expect(checkpointPassed({ kind: 'course' }, NO_PROGRESS)).toBe(false);
    expect(checkpointPassed({ kind: 'course' }, facts({ courseDone: true }))).toBe(true);
  });

  it('an exercise or packet level only when it is cleared, an exam only when its pass is recorded', () => {
    const some = facts({ configCleared: [1], packetCleared: [2], examsPassed: [1] });
    expect(checkpointPassed({ kind: 'config', level: 1 }, some)).toBe(true);
    expect(checkpointPassed({ kind: 'config', level: 2 }, some)).toBe(false);
    expect(checkpointPassed({ kind: 'packet', level: 2 }, some)).toBe(true);
    expect(checkpointPassed({ kind: 'packet', level: 1 }, some)).toBe(false);
    expect(checkpointPassed({ kind: 'exam', level: 1 }, some)).toBe(true);
    expect(checkpointPassed({ kind: 'exam', level: 2 }, some)).toBe(false);
  });
});

// TC-953
describe('what the path reads from the progress record (TC-953)', () => {
  const read = (done: readonly string[]) =>
    stageFacts({
      isCompleted: (id) => done.includes(id),
      courseStepIds: ['course:a', 'course:b'],
      deviceAttempts: [],
      packetAttempts: [],
      examLevels: [1, 2, 3, 4],
    });

  it('counts the course only when every step is recorded', () => {
    expect(read(['course:a']).courseDone).toBe(false);
    expect(read(['course:a', 'course:b']).courseDone).toBe(true);
  });

  it('reads exam passes from the ids the test records, and no level from no attempts', () => {
    const facts = read(['course:exam', 'course:exam:3']);
    expect(facts.examsPassed).toEqual([1, 3]);
    expect(facts.configCleared).toEqual([]);
    expect(facts.packetCleared).toEqual([]);
  });
});

// TC-954
describe('passing a stage, and what that unlocks (TC-954)', () => {
  it('needs every checkpoint of the stage; then the next stage opens', () => {
    const stage2 = STAGES[1]!;
    const allButOne = passedThrough(2);
    const missing = stage2.checkpoints[stage2.checkpoints.length - 1]!;
    const short: StageFacts = {
      ...allButOne,
      configCleared: allButOne.configCleared.filter(
        (level) => !(missing.kind === 'config' && missing.level === level),
      ),
      packetCleared: allButOne.packetCleared.filter(
        (level) => !(missing.kind === 'packet' && missing.level === level),
      ),
      examsPassed: allButOne.examsPassed.filter(
        (level) => !(missing.kind === 'exam' && missing.level === level),
      ),
    };
    expect(stageStatuses(short)[1]).toMatchObject({ passed: false, unlocked: true });
    expect(stageStatuses(short)[2]).toMatchObject({ unlocked: false });
    expect(stageStatuses(allButOne)[1]).toMatchObject({ passed: true });
    expect(stageStatuses(allButOne)[2]).toMatchObject({ unlocked: true, passed: false });
  });

  it('opens the first stage always', () => {
    expect(stageStatuses(NO_PROGRESS)[0]).toMatchObject({ unlocked: true, passed: false });
    expect(
      stageStatuses(NO_PROGRESS)
        .slice(1)
        .every((stage) => !stage.unlocked),
    ).toBe(true);
  });
});

// TC-955
describe('a learner who passed an exam before the path existed (TC-955)', () => {
  it('has every stage that exam closes passed', () => {
    const statuses = stageStatuses(facts({ examsPassed: [2] }));
    expect(statuses.map((stage) => stage.passed)).toEqual([
      true,
      true,
      true,
      true,
      true,
      false,
      false,
    ]);
    expect(statuses[5]).toMatchObject({ unlocked: true });
    expect(statuses[6]).toMatchObject({ unlocked: false });
  });
});

// TC-956
describe('the next thing to do (TC-956)', () => {
  it('is the course for a new learner', () => {
    expect(nextThing(NO_PROGRESS)).toEqual({ stage: 1, checkpoint: { kind: 'course' } });
  });

  it('is the stage 1 test once the course is done', () => {
    expect(nextThing(facts({ courseDone: true }))).toEqual({
      stage: 1,
      checkpoint: { kind: 'exam', level: 5 },
    });
  });

  it('is the first checkpoint of stage 2 once the stage 1 test is passed', () => {
    expect(nextThing(facts({ courseDone: true, examsPassed: [5] }))).toEqual({
      stage: 2,
      checkpoint: STAGES[1]!.checkpoints[0],
    });
  });

  it('is nothing once every stage is passed', () => {
    expect(nextThing(passedThrough(7))).toBeNull();
  });
});

const examsOf = (number: number) =>
  STAGES.find((stage) => stage.number === number)!.checkpoints.flatMap((checkpoint) =>
    checkpoint.kind === 'exam' ? [checkpoint.level] : [],
  );

// TC-961
describe('every stage has its own test (TC-961)', () => {
  it('gives stages 1, 2, 3 and 7 the new tests, levels 5 to 8', () => {
    expect([1, 2, 3, 7].map(examsOf)).toEqual([[5], [6], [7], [8]]);
  });

  it('keeps levels 1 and 2 on stages 4 and 5, and puts levels 3 and 4 on stage 6', () => {
    expect([4, 5, 6].map(examsOf)).toEqual([[1], [2], [3, 4]]);
  });

  it('places every test level in exactly one stage', () => {
    const placed = STAGES.flatMap((stage) => examsOf(stage.number));
    expect([...placed].sort((a, b) => a - b)).toEqual(EXAM_LEVELS.map((level) => level.level));
  });

  it('lists the tests in the order of the stages', () => {
    expect(examLevelsInStageOrder()).toEqual([5, 6, 7, 1, 2, 3, 4, 8]);
  });
});

// TC-962
describe('results from before the stage tests carry over (TC-962)', () => {
  const passed = (levels: number[]) =>
    stageStatuses(facts({ examsPassed: levels })).map((stage) => stage.passed);

  it('a pass of level 1 passes stages 1 to 4', () => {
    expect(passed([1])).toEqual([true, true, true, true, false, false, false]);
  });

  it('a pass of level 4, now a stage 6 test, passes stages 1 to 6 and opens stage 7', () => {
    expect(passed([4])).toEqual([true, true, true, true, true, true, false]);
    expect(stageStatuses(facts({ examsPassed: [4] }))[6]).toMatchObject({ unlocked: true });
  });

  it('a pass of a stage test passes that stage, and the stage test of stage 7 passes all', () => {
    expect(passed([5])).toEqual([true, false, false, false, false, false, false]);
    expect(passed([8]).every(Boolean)).toBe(true);
  });
});
