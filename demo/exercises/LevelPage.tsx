import { Link, useNavigate, useParams } from 'react-router-dom';
import { useGalleryLocale, useT } from '../localeContext';
import { exerciseById, levelTemplates, nextExerciseId, type TemplateInfo } from './exerciseSource';
import type { ExerciseLevel } from './model/types';
import type { AttemptStore } from './store/attemptStore';
import { explain, isSolved, levelSummary } from './store/estimate';
import { CYCLE_SET_SIZE, cycleReport, recordLessonOpened, startCycle } from './store/studyCycle';
import type { AttemptRecord, StudyCycle } from './store/types';
import { cycleStage, latestCycle } from './ui/cycleFlow';
import { LessonLinks } from './ui/ExerciseParts';
import { ExerciseShell, LEVEL_NAMES, exercisePath, outcomeWords, parseLevel } from './ui/pageParts';
import { CARD, COLUMN, LINK, MUTED, PAGE, PRIMARY, SECONDARY } from './ui/styles';
import { StorageNotice, useExerciseStore } from './ui/useExerciseStore';

const RECENT = 8;

/** The before/after card: what to do next in the cycle, or the offer to start one. */
function CycleCard({
  level,
  templates,
  cycle,
  attempts,
  store,
  now,
}: {
  level: ExerciseLevel;
  templates: readonly TemplateInfo[];
  cycle: StudyCycle | undefined;
  attempts: readonly AttemptRecord[];
  store: AttemptStore;
  now: () => number;
}) {
  const t = useT();
  const navigate = useNavigate();
  const stage = cycle ? cycleStage(cycle, attempts) : null;

  const begin = () => {
    // A new cycle starts one template further on, so repeated cycles cover the level.
    const turn = store.getState().cycles.filter((entry) => entry.level === level).length;
    const ids = templates.map((template) => template.id);
    const rotated = [...ids.slice(turn % ids.length), ...ids.slice(0, turn % ids.length)];
    const created = startCycle(level, rotated.slice(0, CYCLE_SET_SIZE), now());
    store.saveCycle(created);
    const first = created.preExerciseIds[0];
    if (first) void navigate(exercisePath(first, { context: 'pre', cycleId: created.id }));
  };

  const startButton = (label: string) => (
    <div>
      <button type="button" data-testid="exercises-cycle-start" onClick={begin} style={SECONDARY}>
        {label}
      </button>
    </div>
  );

  const body = (() => {
    if (!cycle || !stage) {
      return (
        <>
          <p style={{ margin: 0 }}>
            {t(
              `Want to see whether studying helps? Do ${CYCLE_SET_SIZE} exercises now, study the lessons, then do ${CYCLE_SET_SIZE} similar ones and compare.`,
              `学ぶ前と学んだあとを比べられます。いま ${CYCLE_SET_SIZE} 問解き、レッスンで学び、そのあと似た ${CYCLE_SET_SIZE} 問を解いて比べます。`,
            )}
          </p>
          {startButton(t('Measure before studying', '学ぶ前に測る'))}
        </>
      );
    }
    if (stage.stage === 'pre') {
      return (
        <>
          <p style={{ margin: 0 }}>
            {t(
              `Before studying: ${stage.done} of ${stage.total} done.`,
              `学ぶ前の確認：${stage.total} 問中 ${stage.done} 問まで進みました。`,
            )}
          </p>
          <div>
            <Link
              to={exercisePath(stage.nextId, { context: 'pre', cycleId: cycle.id })}
              data-testid="exercises-cycle-continue"
              style={PRIMARY}
            >
              {t('Continue the “before” set', '学ぶ前の確認をつづける')}
            </Link>
          </div>
        </>
      );
    }
    if (stage.stage === 'study') {
      const report = cycleReport(cycle, attempts);
      const lessons = [
        ...new Set(
          report.templates
            .filter((entry) => entry.before.solved < entry.before.total)
            .flatMap(
              (entry) =>
                templates.find((template) => template.id === entry.templateId)?.lessons ?? [],
            ),
        ),
      ];
      return (
        <>
          <p data-testid="exercises-cycle-before" style={{ margin: 0 }}>
            {t(
              `Before studying you solved ${report.before.solved} of ${report.before.total} without help.`,
              `学ぶ前は、${report.before.total} 問中 ${report.before.solved} 問をヒントなしで解けました。`,
            )}{' '}
            {lessons.length > 0
              ? t(
                  'These lessons teach what you did not solve. Read them, then measure again.',
                  '解けなかった問題の内容は、下のレッスンで学べます。読んでから、もう一度測ってください。',
                )
              : t(
                  'You solved them all. You can still measure again.',
                  'すべて解けました。もう一度測ることもできます。',
                )}
          </p>
          <LessonLinks
            lessons={lessons}
            onOpen={(path) => store.saveCycle(recordLessonOpened(cycle, path))}
          />
          {stage.nextId ? (
            <div>
              <Link
                to={exercisePath(stage.nextId, { context: 'post', cycleId: cycle.id })}
                data-testid="exercises-cycle-again"
                style={PRIMARY}
              >
                {t('Measure again', 'もう一度測る')}
              </Link>
            </div>
          ) : null}
        </>
      );
    }
    if (stage.stage === 'post') {
      return (
        <>
          <p style={{ margin: 0 }}>
            {t(
              `After studying: ${stage.done} of ${stage.total} done.`,
              `学んだあとの確認：${stage.total} 問中 ${stage.done} 問まで進みました。`,
            )}
          </p>
          <div>
            <Link
              to={exercisePath(stage.nextId, { context: 'post', cycleId: cycle.id })}
              data-testid="exercises-cycle-continue"
              style={PRIMARY}
            >
              {t('Continue the “after” set', '学んだあとの確認をつづける')}
            </Link>
          </div>
        </>
      );
    }
    const report = cycleReport(cycle, attempts);
    return (
      <>
        <p data-testid="exercises-cycle-result" style={{ margin: 0 }}>
          {t(
            `Before studying: ${report.before.solved} of ${report.before.total} solved without help. After: ${report.after.solved} of ${report.after.total}.`,
            `学ぶ前：${report.before.total} 問中 ${report.before.solved} 問。学んだあと：${report.after.total} 問中 ${report.after.solved} 問（どちらもヒントなしで解けた数）。`,
          )}{' '}
          <Link to="/exercises/report" style={LINK}>
            {t('See it per kind of task', '問題の種類ごとに見る')}
          </Link>
        </p>
        {startButton(t('Measure again from the start', 'はじめからもう一度測る'))}
      </>
    );
  })();

  return (
    <section data-testid="exercises-cycle" style={{ ...CARD, display: 'grid', gap: 10 }}>
      <h3 style={{ margin: 0, fontSize: 16 }}>
        {t('Before and after studying', '学ぶ前と、学んだあと')}
      </h3>
      {body}
    </section>
  );
}

export function LevelPageBody({
  store: injected,
  now = () => Date.now(),
}: {
  store?: AttemptStore;
  now?: () => number;
}) {
  const t = useT();
  const locale = useGalleryLocale();
  const level = parseLevel(useParams<{ level: string }>().level) ?? 1;
  const { store, state } = useExerciseStore(injected);

  const templates = levelTemplates(level);
  const mine = state.attempts.filter((attempt) => attempt.level === level);
  const summary = levelSummary(state.attempts, level);
  const weakest = templates.find((template) => template.id === summary.weakestTemplateId);
  const last = mine[mine.length - 1];
  const nextId = nextExerciseId(level, {
    // Never the template just done, twice in a row.
    ...(last ? { avoidTemplateIds: [last.templateId] } : {}),
    seenIds: state.attempts.map((attempt) => attempt.exerciseId),
  });
  /** Distinct exercises of a template solved without help. */
  const solvedOf = (templateId: string) =>
    new Set(
      mine
        .filter((attempt) => attempt.templateId === templateId && isSolved(attempt))
        .map((a) => a.exerciseId),
    ).size;

  return (
    <div style={PAGE}>
      <div style={COLUMN}>
        <Link
          to="/exercises"
          style={{ ...LINK, display: 'inline-flex', alignItems: 'center', minHeight: 44 }}
        >
          {t('← All levels', '← レベルの一覧へ')}
        </Link>

        <StorageNotice store={store} />

        <section
          data-testid={`exercises-level-${level}`}
          style={{ ...CARD, display: 'grid', gap: 10 }}
        >
          <h2 style={{ margin: 0, fontSize: 20 }}>
            {t(`Level ${level}`, `レベル ${level}`)}
            <span style={{ fontWeight: 400 }}> — {LEVEL_NAMES[level][locale]}</span>
          </h2>
          <p data-testid={`exercises-level-status-${level}`} style={{ margin: 0 }}>
            {explain(summary, locale)}
          </p>
          {nextId ? (
            <div>
              <Link
                to={exercisePath(nextId)}
                data-testid={`exercises-start-${level}`}
                style={PRIMARY}
              >
                {t('Next exercise →', '次の問題へ →')}
              </Link>
            </div>
          ) : (
            <p style={{ ...MUTED, margin: 0 }}>
              {t('No exercises at this level yet.', 'このレベルの問題は、まだありません。')}
            </p>
          )}
        </section>

        {weakest ? (
          <section data-testid="exercises-weakest" style={{ ...CARD, display: 'grid', gap: 6 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              {t('Worth another look', 'もう一度見ておきたいところ')}
            </h3>
            <p style={{ margin: 0 }}>
              {t(
                `The kind of task you have left unsolved most often lately: “${weakest.title.en}”.`,
                `最近いちばん解けていない種類は「${weakest.title.ja}」です。`,
              )}
            </p>
            <LessonLinks lessons={weakest.lessons} />
          </section>
        ) : null}

        {templates.length > 0 ? (
          <section data-testid="exercises-kinds" style={{ ...CARD, display: 'grid', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              {t('Kinds of task at this level', 'このレベルの問題の種類')}
            </h3>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4 }}>
              {templates.map((template) => {
                const solved = solvedOf(template.id);
                return (
                  <li
                    key={template.id}
                    data-testid={`exercises-kind-${template.id}`}
                    data-solved={solved}
                  >
                    {template.title[locale]}
                    <span style={MUTED}> — {t(`${solved} solved`, `${solved} 問 解けた`)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {templates.length > 0 ? (
          <CycleCard
            level={level}
            templates={templates}
            cycle={latestCycle(state.cycles, level)}
            attempts={state.attempts}
            store={store}
            now={now}
          />
        ) : null}

        {mine.length > 0 ? (
          <section data-testid="exercises-recent" style={{ ...CARD, display: 'grid', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              {t('What you did lately', '最近やった問題')}
            </h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 2 }}>
              {[...mine]
                .reverse()
                .slice(0, RECENT)
                .map((attempt) => (
                  <li key={attempt.id}>
                    <Link
                      to={exercisePath(attempt.exerciseId)}
                      style={{
                        ...LINK,
                        display: 'inline-flex',
                        alignItems: 'center',
                        minHeight: 44,
                      }}
                    >
                      {exerciseById(attempt.exerciseId, locale)?.title[locale] ??
                        attempt.exerciseId}
                    </Link>
                    <span> — {outcomeWords(attempt)[locale]}</span>
                  </li>
                ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default function LevelPage() {
  return (
    <ExerciseShell
      title={{ en: 'Hands-on exercises: a level', ja: '実習問題：レベルの内容' }}
      desc={{
        en: 'Where you stand at this level, and the next exercise.',
        ja: 'このレベルでの、いまの状況と次の問題。',
      }}
    >
      <LevelPageBody />
    </ExerciseShell>
  );
}
