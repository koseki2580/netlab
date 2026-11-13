import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useOptionalProgress } from '../../src/progress';
import { PACKET_LEVEL_NAMES } from '../exercises/packet/PacketPages';
import type { AttemptStore } from '../exercises/store/attemptStore';
import { ExerciseShell, LEVEL_NAMES } from '../exercises/ui/pageParts';
import { CARD, COLUMN, LINK, MUTED, PAGE, PRIMARY } from '../exercises/ui/styles';
import { useExerciseStore } from '../exercises/ui/useExerciseStore';
import { LESSONS, type Lesson } from '../lessonManifest';
import { useGalleryLocale, useT } from '../localeContext';
import { COURSE_STEPS, courseProgressId } from './courseSteps';
import { EXAM_LEVELS } from './examLevels';
import {
  STAGES,
  checkpointPath,
  examStageName,
  nextThing,
  stageFacts,
  stageStatuses,
  type Checkpoint,
  type Localised,
  type Stage,
  type StageStatus,
} from './stages';

/**
 * The learning path: seven stages, the next thing to do first. Every lesson
 * and checkpoint can be opened in any stage; only passing is gated.
 */

const TAP: CSSProperties = { ...LINK, display: 'inline-flex', alignItems: 'center', minHeight: 44 };

function checkpointWords(checkpoint: Checkpoint): Localised {
  switch (checkpoint.kind) {
    case 'course':
      return {
        en: `The getting-started course (${COURSE_STEPS.length} steps)`,
        ja: `入門コース（${COURSE_STEPS.length} ステップ）`,
      };
    case 'config':
      return {
        en: `Exercises, level ${checkpoint.level}: ${LEVEL_NAMES[checkpoint.level].en}`,
        ja: `実習問題 レベル ${checkpoint.level}：${LEVEL_NAMES[checkpoint.level].ja}`,
      };
    case 'packet':
      return {
        en: `Packet exercises, level ${checkpoint.level}: ${PACKET_LEVEL_NAMES[checkpoint.level].en}`,
        ja: `パケットの問題 レベル ${checkpoint.level}：${PACKET_LEVEL_NAMES[checkpoint.level].ja}`,
      };
    case 'exam':
      // Named by its stage, never by the old level names (REQ-198).
      return examStageName(checkpoint.level);
  }
}

const lessonFor = (path: string): Lesson | undefined =>
  (LESSONS as readonly Lesson[]).find((lesson) => lesson.path === path);

function StageCard({ stage, status }: { stage: Stage; status: StageStatus }) {
  const t = useT();
  const locale = useGalleryLocale();
  const state = status.passed ? 'passed' : status.unlocked ? 'open' : 'locked';
  const badge = {
    passed: t('Passed', '合格'),
    open: t('Open', '挑戦できます'),
    locked: t('Locked', 'まだ開いていません'),
  }[state];
  const accent =
    state === 'passed'
      ? 'var(--netlab-accent-green)'
      : state === 'open'
        ? 'var(--netlab-accent-blue)'
        : 'var(--netlab-border)';

  return (
    <section
      data-testid={`path-stage-${stage.number}`}
      data-state={state}
      style={{ ...CARD, borderColor: accent, display: 'grid', gap: 8 }}
    >
      <h2 style={{ margin: 0, fontSize: 18 }}>
        <span data-testid={`path-stage-${stage.number}-title`}>
          {t(
            `Stage ${stage.number} · ${stage.title.en}`,
            `段階 ${stage.number}・${stage.title.ja}`,
          )}
        </span>{' '}
        <span
          data-testid={`path-stage-${stage.number}-badge`}
          style={{ fontSize: 13, fontWeight: 700, color: accent }}
        >
          {state === 'passed' ? '✓ ' : state === 'locked' ? '🔒 ' : ''}
          {badge}
        </span>
      </h2>
      <p style={{ ...MUTED, margin: 0 }}>{stage.topics[locale]}</p>
      {state === 'locked' ? (
        <p data-testid={`path-stage-${stage.number}-lock`} style={{ margin: 0 }}>
          {t(
            `Pass stage ${stage.number - 1} to open this stage. You can still read and try everything here.`,
            `段階 ${stage.number - 1} に合格すると開きます。ここにあるものは、いまでも読んで試せます。`,
          )}
        </p>
      ) : null}

      <div>
        <h3 style={{ margin: '4px 0', fontSize: 14 }}>{t('Lessons', 'レッスン')}</h3>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {stage.withCourse ? (
            <li>
              <Link to="/course" data-testid={`path-stage-${stage.number}-lesson`} style={TAP}>
                {t('The getting-started course', '入門コース')}
              </Link>
            </li>
          ) : null}
          {stage.lessons.map((path) => (
            <li key={path}>
              <Link to={path} data-testid={`path-stage-${stage.number}-lesson`} style={TAP}>
                {lessonFor(path)?.title[locale] ?? path}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 style={{ margin: '4px 0', fontSize: 14 }}>
          {t('To pass this stage', 'この段階の合格に必要なもの')}
        </h3>
        <ol style={{ margin: 0, paddingLeft: 22 }}>
          {status.checkpoints.map(({ checkpoint, passed }) => (
            <li key={`${checkpoint.kind}-${'level' in checkpoint ? checkpoint.level : 0}`}>
              <Link
                to={checkpointPath(checkpoint)}
                data-testid={`path-stage-${stage.number}-checkpoint`}
                data-passed={passed ? 'yes' : 'no'}
                style={TAP}
              >
                {passed ? '✓ ' : ''}
                {checkpointWords(checkpoint)[locale]}
              </Link>
            </li>
          ))}
        </ol>
        <p style={{ ...MUTED, margin: '4px 0 0', fontSize: 13 }}>
          {t(
            'The stage is passed when every item above is done, not by its test alone.',
            'この段階は、上のものがすべて済んだときに合格です。テストだけでは合格になりません。',
          )}
        </p>
        {!status.passed &&
        status.checkpoints.some(
          ({ checkpoint, passed }) => checkpoint.kind === 'exam' && passed,
        ) ? (
          // A test passed earlier is kept, but the stage now also needs its exercises (REQ-114).
          <p
            data-testid={`path-stage-${stage.number}-test-kept`}
            style={{ margin: '4px 0 0', fontSize: 13 }}
          >
            {t(
              'Your pass of this stage’s test is kept. The exercises above still remain before the stage is passed.',
              'この段階のテストの合格は残っています。段階の合格には、上の問題がまだ残っています。',
            )}
          </p>
        ) : null}
      </div>

      {stage.comingSoon.length > 0 ? (
        <div data-testid={`path-stage-${stage.number}-coming`}>
          <h3 style={{ margin: '4px 0', fontSize: 14 }}>{t('Coming soon', '準備中')}</h3>
          <p style={{ ...MUTED, margin: 0 }}>
            {stage.comingSoon.map((topic) => topic[locale]).join(t(', ', '、'))}
          </p>
        </div>
      ) : null}
    </section>
  );
}

export function PathBody({ store }: { store?: AttemptStore }) {
  const t = useT();
  const locale = useGalleryLocale();
  const { isCompleted } = useOptionalProgress();
  const device = useExerciseStore(store, 'device');
  const packet = useExerciseStore(store, 'packet');
  const facts = stageFacts({
    isCompleted: (id) => isCompleted(id),
    courseStepIds: COURSE_STEPS.map((step) => courseProgressId(step.id)),
    deviceAttempts: device.state.attempts,
    packetAttempts: packet.state.attempts,
    examLevels: EXAM_LEVELS.map((level) => level.level),
  });
  const statuses = stageStatuses(facts);
  const next = nextThing(facts);

  return (
    <div style={PAGE} data-testid="path-page">
      <div style={COLUMN}>
        <section data-testid="path-next" style={{ ...CARD, display: 'grid', gap: 10 }}>
          {next ? (
            <>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                {t(`Next, in stage ${next.stage}:`, `次は、段階 ${next.stage} の：`)}
              </p>
              <div>
                <Link
                  to={checkpointPath(next.checkpoint)}
                  data-testid="path-next-link"
                  data-stage={next.stage}
                  data-kind={next.checkpoint.kind}
                  style={PRIMARY}
                >
                  {checkpointWords(next.checkpoint)[locale]} →
                </Link>
              </div>
            </>
          ) : (
            <p data-testid="path-all-passed" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
              {t(
                'Every stage is passed. More topics are coming to stages 6 and 7.',
                'すべての段階に合格しました。段階 6 と 7 には、これからも項目が増えます。',
              )}
            </p>
          )}
          <p style={{ ...MUTED, margin: 0, fontSize: 14 }}>
            {t(
              'Seven stages, each with lessons, exercises and a test. Passing a stage opens the next. Every lesson can be read at any time.',
              '7 つの段階があり、それぞれにレッスン・問題・テストがあります。段階に合格すると次が開きます。レッスンはいつでも読めます。',
            )}
          </p>
        </section>
        {STAGES.map((stage, index) => (
          <StageCard key={stage.number} stage={stage} status={statuses[index]!} />
        ))}
      </div>
    </div>
  );
}

export default function PathPage() {
  return (
    <ExerciseShell
      title={{ en: 'Learning path', ja: '学習の道すじ' }}
      desc={{
        en: 'Seven stages from the basics to the latest: lessons, exercises and a test in each.',
        ja: '基本から最新まで 7 つの段階。それぞれにレッスン・問題・テストがあります。',
      }}
    >
      <PathBody />
    </ExerciseShell>
  );
}
