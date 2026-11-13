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

// TC-1078
describe('stage 4 teaches flow control (TC-1078)', () => {
  it('lists the lesson, after the handshake, and it is a real route', () => {
    const lessons = STAGES.find((stage) => stage.number === 4)!.lessons;
    expect(lessons.indexOf('/simulation/tcp-flow-control')).toBe(
      lessons.indexOf('/simulation/tcp-handshake') + 1,
    );
    expect(LESSONS.map((lesson) => lesson.path)).toContain('/simulation/tcp-flow-control');
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
  // Changed by REQ-198: the test is kept, but no stage passes without its exercises.
  it('keeps that test as its stage’s checkpoint, and passes no stage by it', () => {
    const statuses = stageStatuses(facts({ examsPassed: [2] }));
    expect(statuses.map((stage) => stage.passed)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    const stage5 = statuses[4]!;
    expect(stage5.checkpoints.find((entry) => entry.checkpoint.kind === 'exam')?.passed).toBe(true);
    expect(statuses[1]).toMatchObject({ unlocked: false });
  });
});

// TC-1426
describe('a stage passes only with its test and its exercises (TC-1426)', () => {
  it('stage 2 with its test passed and its exercises not is not passed; with them it is', () => {
    const before = passedThrough(1);
    const testOnly: StageFacts = { ...before, examsPassed: [...before.examsPassed, 6] };
    expect(stageStatuses(testOnly)[1]).toMatchObject({ passed: false });
    expect(stageStatuses(testOnly)[2]).toMatchObject({ unlocked: false });
    expect(stageStatuses(passedThrough(2))[1]).toMatchObject({ passed: true });
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

  // Changed by REQ-198: an earlier pass is kept as that stage's test, and no stage
  // passes without its exercises.
  const examKept = (levels: number[], stage: number) =>
    stageStatuses(facts({ examsPassed: levels }))[stage - 1]!.checkpoints.find(
      (entry) => entry.checkpoint.kind === 'exam',
    )?.passed;

  it('a pass of level 1 is kept as stage 4’s test, its only checkpoint, and passes that stage only', () => {
    expect(passed([1])).toEqual([false, false, false, true, false, false, false]);
    expect(examKept([1], 4)).toBe(true);
  });

  it('a pass of level 4 is kept as one of stage 6’s tests', () => {
    expect(passed([4]).some(Boolean)).toBe(false);
    expect(
      stageStatuses(facts({ examsPassed: [4] }))[5]!.checkpoints.some(
        (entry) => entry.checkpoint.kind === 'exam' && entry.passed,
      ),
    ).toBe(true);
  });

  it('a stage test with the rest of its stage passes that stage only', () => {
    expect(passed([5])).toEqual([false, false, false, false, false, false, false]);
    expect(stageStatuses(facts({ courseDone: true, examsPassed: [5] }))[0]!.passed).toBe(true);
    // Stage 7 has its test as its only checkpoint; it covers no earlier stage.
    expect(passed([8])).toEqual([false, false, false, false, false, false, true]);
  });
});

// TC-1109
describe('the routing depth on the path', () => {
  const stage = (number: number) => STAGES.find((entry) => entry.number === number);

  it('lists the OSPF areas lesson in stage 5, no longer coming soon', () => {
    expect(stage(5)?.lessons).toContain('/routing/ospf-areas');
    expect(stage(5)?.comingSoon.map((topic) => topic.en)).not.toContain('OSPF areas');
  });

  it('no longer lists BGP in depth as coming soon', () => {
    expect(stage(6)?.comingSoon.map((topic) => topic.en)).not.toContain('BGP in depth');
  });
});
