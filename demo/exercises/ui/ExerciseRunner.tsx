import { useEffect, useMemo, useRef, useState } from 'react';
import { useViewport } from '../../../src/utils/useViewport';
import { LessonCanvas, LessonPanel, LessonSplit } from '../../components/LessonPanel';
import { useGalleryLocale, useT } from '../../localeContext';
import { gradeExercise } from '../grade/gradeExercise';
import { checksToCount } from '../model/closedSet';
import { applyChanges, diffSettings, readSetting } from '../model/settings';
import type {
  CheckResult,
  DesignOption,
  Exercise,
  GradeResult,
  SettingChange,
  SettingRef,
} from '../model/types';
import type { AttemptStore } from '../store/attemptStore';
import type { AttemptContext } from '../store/types';
import { attemptOrder, type AttemptOrder } from './attemptOrder';
import { orderedOptions } from './choices';
import {
  changeSentence,
  settingForResult,
  sameSetting,
  settingNodeId,
  settingTestId,
  withNodeLabels,
} from './describe';
import {
  DiagramLegend,
  ExerciseDiagram,
  type DiagramPick,
  type DiagramReplay,
} from './ExerciseDiagram';
import {
  DesignChooser,
  ExerciseBrief,
  GiveUp,
  HintButton,
  HintCost,
  HintTexts,
  LessonLinks,
  ResultPanel,
  nextHintTier,
  type Counted,
  type Predicted,
} from './ExerciseParts';
import { SettingsForm } from './SettingsForm';
import { CARD, PRIMARY, SECONDARY } from './styles';

export interface ExerciseRunnerProps {
  /** With its devices named in the learner's language (`exerciseSource.exerciseById`). */
  readonly exercise: Exercise;
  readonly store: AttemptStore;
  /** What the attempt is part of. Practice shows lesson links; the others offer "skip". */
  readonly context?: AttemptContext;
  readonly cycleId?: string;
  /** What "next" does; without it there is no next button. */
  readonly onNext?: () => void;
  readonly nextLabel?: string;
}

const NO_CHANGES: readonly SettingChange[] = [];

/** The least height the diagram keeps on a phone: below this its devices cannot be told apart. */
const NARROW_DIAGRAM_MIN_HEIGHT = 150;

/** What a design did, in the words the learner predicted with. */
function outcomeOf(grade: GradeResult): Predicted {
  if (grade.passed) return 'reach';
  const stopped = grade.results.some(
    (result) => result.code === 'not-delivered' || result.code === 'no-address',
  );
  return stopped ? 'no-reach' : 'detour';
}

interface DesignRun {
  readonly option: DesignOption;
  readonly predicted: Predicted;
  readonly actual: Predicted;
}

/**
 * One exercise from brief to pass: the diagram, the settings the exercise
 * allows (or its designs to choose from), Check, hints, and the way out.
 *
 * The parent gives it a `key` per exercise, so nothing carries over.
 */
export function ExerciseRunner({
  exercise,
  store,
  context = 'practice',
  cycleId,
  onNext,
  nextLabel,
}: ExerciseRunnerProps) {
  const t = useT();
  const locale = useGalleryLocale();
  const { isNarrow } = useViewport();

  const [changes, setChanges] = useState<readonly SettingChange[]>(NO_CHANGES);
  /** Bumped when the settings change from outside the form, so its drafts are dropped. */
  const [formKey, setFormKey] = useState(0);
  const [graded, setGraded] = useState<{
    grade: GradeResult;
    changes: readonly SettingChange[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [hintTier, setHintTier] = useState<0 | 1 | 2 | 3>(0);
  const [revealed, setRevealed] = useState(false);
  /** How the first pass was recorded; null until there is one. */
  const [passedAs, setPassedAs] = useState<Counted | null>(null);
  /** Checks that ran, and how many of them missed: the third counts differently, and a miss brings the hint button. */
  const [presses, setPresses] = useState(0);
  const [misses, setMisses] = useState(0);
  /** The setting whose card a press on the diagram pointed at; it is outlined for a moment. */
  const [pointed, setPointed] = useState<SettingRef | null>(null);
  const [focused, setFocused] = useState<SettingRef | null>(null);
  const [replay, setReplay] = useState<DiagramReplay | null>(null);
  /** Where this attempt puts what it offers; null until the attempt is open. */
  const [order, setOrder] = useState<AttemptOrder | null>(null);
  const resets = useRef(0);
  // Find-the-fault in two steps: the device pointed at and found, and those pointed at wrongly.
  const [found, setFound] = useState<string | null>(null);
  const [cleared, setCleared] = useState<readonly string[]>([]);
  /** Check was pressed before a device was pointed at. */
  const [needsPick, setNeedsPick] = useState(false);
  /** A solve counts within this many Checks: 1 where the answer is pressed, 2 where it is typed. */
  const maxChecks = checksToCount(exercise);
  // Choose-a-design exercises: the option picked, the prediction, and the last run.
  const [option, setOption] = useState<DesignOption | null>(null);
  const [predicted, setPredicted] = useState<Predicted | null>(null);
  const [designRun, setDesignRun] = useState<DesignRun | null>(null);
  const [needs, setNeeds] = useState<'choice' | 'prediction' | null>(null);
  /** Counts the presses of Check that could not run, so each one brings the reason into view. */
  const [refusals, setRefusals] = useState(0);

  const resultRef = useRef<HTMLDivElement>(null);
  const needsChoiceRef = useRef<HTMLParagraphElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hintsRef = useRef<HTMLDivElement>(null);
  // A ref, not an effect's local: StrictMode runs the effect twice, and one
  // visit to an exercise must be one attempt.
  const attempt = useRef<{ key: string; id: string } | null>(null);

  useEffect(() => {
    const key = `${exercise.id}|${context}|${cycleId ?? ''}`;
    if (attempt.current?.key === key) return;
    const id = store.open({ ...exercise, locale, checksToCount: maxChecks }, context, cycleId);
    attempt.current = { key, id };
    resets.current = 0;
    setOrder(
      attemptOrder(
        store.getState().attempts.map((entry) => entry.id),
        id,
      ),
    );
    // The language is recorded as it was when the exercise was opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise, context, cycleId, store]);

  const isDesign = exercise.options !== undefined;
  // An option may bring a start of its own (another routing protocol, say):
  // then that is what is drawn and what the grade compares against.
  const base = useMemo(
    () =>
      option?.start ? withNodeLabels(option.start, exercise.nodeLabels, locale) : exercise.start,
    [exercise.nodeLabels, exercise.start, locale, option],
  );
  const topology = useMemo(() => applyChanges(base, changes), [base, changes]);
  const stale = graded !== null && graded.changes !== changes;
  const passed = passedAs !== null;

  // The result is what Check was pressed for: put it at the top of the panel,
  // so what to change next is on screen right under it, and move focus to it.
  useEffect(() => {
    if (!graded) return;
    (resultRef.current?.parentElement ?? resultRef.current)?.scrollIntoView?.({ block: 'start' });
    resultRef.current?.focus({ preventScroll: true });
  }, [graded]);

  // A hint just opened is what the learner asked for: bring it into view.
  useEffect(() => {
    if (hintTier === 0) return;
    hintsRef.current?.lastElementChild?.lastElementChild?.scrollIntoView?.({ block: 'nearest' });
  }, [hintTier]);

  // The outline a press on the diagram put on a card fades by itself.
  useEffect(() => {
    if (!pointed) return undefined;
    const timer = setTimeout(() => setPointed(null), 2500);
    return () => clearTimeout(timer);
  }, [pointed]);

  // Check was pressed with nothing to run: on a phone the reason is below the
  // first screen, and a button that seems to do nothing is the worst answer.
  useEffect(() => {
    if (refusals === 0) return;
    needsChoiceRef.current?.scrollIntoView?.({ block: 'nearest' });
    panelRef.current
      ?.querySelector('[data-testid="exercise-suspect-step"]')
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [refusals]);

  const check = async () => {
    // Find-the-fault in two steps: nothing can be changed, so nothing is
    // checked, until a device has been pointed at. (A Check here would also
    // say which device cannot reach the server, which is the question.)
    if (exercise.pickFirst && found === null) {
      setNeedsPick(true);
      setRefusals((count) => count + 1);
      return;
    }
    if (isDesign && (!option || !predicted)) {
      setNeeds(option ? 'prediction' : 'choice');
      setRefusals((count) => count + 1);
      return;
    }
    setNeeds(null);
    setBusy(true);
    setReplay(null);
    // Let "Checking…" be painted: a grade is tens of milliseconds of solid work.
    await new Promise((resolve) => setTimeout(resolve, 0));
    const grade = await gradeExercise({ ...exercise, start: base }, topology);
    const id = attempt.current?.id;
    const actual = outcomeOf(grade);
    if (id !== undefined) {
      // The prediction goes first: a pass settles the attempt, and nothing is recorded after that.
      if (option && predicted) {
        store.recordPrediction(id, {
          optionId: option.id,
          predicted,
          correct: actual === predicted,
        });
      }
      store.recordCheck(id, {
        passed: grade.passed,
        failedCheckIds: grade.results.filter((result) => !result.passed).map((r) => r.checkId),
        changedSettings: diffSettings(base, topology, exercise.allowed).length,
      });
    }
    if (option && predicted) setDesignRun({ option, predicted, actual });
    setGraded({ grade, changes });
    const pressed = presses + 1;
    setPresses(pressed);
    if (grade.passed) {
      setPassedAs(
        (already) =>
          already ??
          (revealed
            ? 'not-counted'
            : hintTier > 0
              ? 'helped'
              : pressed > maxChecks
                ? 'tries'
                : 'solved'),
      );
    } else {
      setMisses((count) => count + 1);
    }
    setBusy(false);
  };

  const change = (next: SettingChange) => {
    setChanges((current) => [...current.filter((entry) => !sameSetting(entry, next)), next]);
    setReplay(null);
  };
  const replaceChanges = (next: readonly SettingChange[]) => {
    setChanges(next);
    setFormKey((key) => key + 1);
    setReplay(null);
  };
  /** Back to the start: the same exercise, offered in a new order. */
  const reset = () => {
    replaceChanges(NO_CHANGES);
    const id = attempt.current?.id;
    if (id === undefined) return;
    resets.current += 1;
    setOrder(
      attemptOrder(
        store.getState().attempts.map((entry) => entry.id),
        id,
        resets.current,
      ),
    );
  };
  const options = useMemo(() => (order ? orderedOptions(exercise, order) : []), [exercise, order]);

  /** The learner points at a device as the one at fault. A wrong one costs the clean solve, as a Check would. */
  const pickSuspect = (nodeId: string) => {
    const faulty = exercise.pickFirst?.faulty;
    if (!faulty || found !== null || cleared.includes(nodeId) || passed || busy) return;
    setNeedsPick(false);
    if (faulty.includes(nodeId)) {
      setFound(nodeId);
      return;
    }
    setCleared((now) => [...now, nodeId]);
    setPresses((count) => count + 1);
    setMisses((count) => count + 1);
    if (attempt.current) {
      store.recordCheck(attempt.current.id, {
        passed: false,
        failedCheckIds: ['suspect'],
        changedSettings: 0,
      });
    }
  };

  /** A press on the diagram: no panel opens; the card of what was pressed is shown, and a cable is switched. */
  const pick = (picked: DiagramPick) => {
    if (isDesign) return;
    const ref = exercise.allowed.find((candidate) =>
      picked.kind === 'link'
        ? candidate.kind === 'link-state' && candidate.edgeId === picked.id
        : candidate.kind !== 'link-state' && candidate.nodeId === picked.id,
    );
    if (!ref) return;
    if (ref.kind === 'link-state' && !passed && !busy) {
      const now = readSetting(topology, ref);
      if (now?.kind === 'link-state') change({ ...now, state: now.state === 'up' ? 'down' : 'up' });
    }
    if (ref.kind !== 'link-state' && exercise.pickFirst) pickSuspect(ref.nodeId);
    setPointed(ref);
    setFocused(ref);
    panelRef.current
      ?.querySelector(`[data-testid="${settingTestId(ref)}"]`)
      ?.scrollIntoView?.({ block: 'nearest' });
  };

  // The setting the first unmet goal is about. With several cards the one on
  // screen under the result was often another one: the result offers the way
  // to it, and the card is outlined. Not in a find-the-fault exercise, where
  // which card it is IS the question.
  const missedSetting = useMemo(() => {
    if (!graded || graded.grade.passed || exercise.kind === 'diagnose-repair') return null;
    const missed = graded.grade.results.find((result) => !result.passed);
    return missed ? settingForResult(exercise, missed) : null;
  }, [exercise, graded]);
  const showSetting = () => {
    if (!missedSetting) return;
    setPointed(missedSetting);
    setFocused(missedSetting);
    panelRef.current
      ?.querySelector(`[data-testid="${settingTestId(missedSetting)}"]`)
      ?.scrollIntoView?.({ block: 'nearest' });
  };

  const showReplay = (result: CheckResult) => {
    const { trace } = result;
    if (!trace) return;
    setReplay((current) => ({ trace, run: (current?.run ?? 0) + 1 }));
    diagramRef.current?.scrollIntoView?.({ block: 'nearest' });
  };

  const doneSentence = designRun
    ? t(`You chose: ${designRun.option.label.en}.`, `選んだもの：${designRun.option.label.ja}`)
    : (() => {
        const sentences = diffSettings(base, topology, exercise.allowed).flatMap((ref) => {
          const value = readSetting(topology, ref);
          return value ? [changeSentence(value, base, true)[locale]] : [];
        });
        const more = sentences.length - 2;
        return (
          sentences.slice(0, 2).join(' ') +
          (more > 0 ? t(` And ${more} more.`, `ほか ${more} か所。`) : '')
        );
      })();

  const brief = (
    <ExerciseBrief
      exercise={exercise}
      results={graded && !stale ? graded.grade.results : null}
      compact={isNarrow}
      countRule={presses === 0 && !revealed ? maxChecks : null}
      pickFirst={exercise.pickFirst !== undefined}
    />
  );
  const diagram = (
    <ExerciseDiagram
      topology={topology}
      replay={replay}
      highlightNodeId={focused ? settingNodeId(focused) : null}
      label={t('The network of this exercise', 'この問題のネットワーク')}
      locale={locale}
      legend={isNarrow}
      onPick={pick}
    />
  );
  const showCheck = !passed;
  const showReset =
    !isDesign && !passed && diffSettings(base, topology, exercise.allowed).length > 0;
  const showSkip = onNext !== undefined && context !== 'practice' && !passed && !revealed;
  const showNext = onNext !== undefined && (passed || revealed);
  // The hint button joins Check once a Check has missed, and not before.
  const nextHint = passed || misses === 0 ? undefined : nextHintTier(exercise, hintTier);
  const revealHint = (tier: 1 | 2 | 3) => {
    setHintTier(tier);
    if (attempt.current) store.recordHint(attempt.current.id, tier);
  };

  const actions =
    showCheck || showSkip || showNext ? (
      <div
        data-testid="exercise-actions"
        style={{
          // Under the scrolling column, never over it: nothing the learner needs
          // is ever behind the bar, and the bar never leaves the screen.
          flexShrink: 0,
          display: 'flex',
          gap: 8,
          rowGap: 4,
          flexWrap: 'wrap',
          padding: '10px 16px',
          background: 'var(--netlab-bg-panel)',
          borderTop: '1px solid var(--netlab-border)',
        }}
      >
        {showCheck ? (
          <button
            type="button"
            data-testid="exercise-check"
            disabled={busy}
            aria-busy={busy}
            onClick={() => void check()}
            // On a phone Check has a row to itself: beside two more buttons its word broke in two.
            style={{ ...PRIMARY, flex: isNarrow ? '1 1 100%' : 1, opacity: busy ? 0.7 : 1 }}
          >
            {busy ? t('Checking…', 'たしかめています…') : t('Check', 'たしかめる')}
          </button>
        ) : null}
        {showNext ? (
          <button
            type="button"
            data-testid="exercise-next"
            onClick={onNext}
            style={passed ? { ...PRIMARY, flex: 1 } : SECONDARY}
          >
            {nextLabel ?? t('Next exercise →', '次の問題へ →')}
          </button>
        ) : null}
        {nextHint !== undefined ? (
          <HintButton shownTier={hintTier} next={nextHint} onReveal={revealHint} />
        ) : null}
        {showReset ? (
          <button type="button" data-testid="exercise-reset" onClick={reset} style={SECONDARY}>
            <span aria-hidden="true">↺ </span>
            {t('Start over', '最初に戻す')}
          </button>
        ) : null}
        {showSkip ? (
          <button type="button" data-testid="exercise-skip" onClick={onNext} style={SECONDARY}>
            {t('I cannot do this one: next', 'わからないので次へ')}
          </button>
        ) : null}
        {nextHint !== undefined && hintTier === 0 ? <HintCost /> : null}
      </div>
    ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <LessonSplit style={{ flex: 1, minHeight: 0 }}>
        {isNarrow ? (
          // On a phone the brief and the diagram share the first screen: the
          // diagram takes what the brief leaves above the Check bar, so a
          // learner sees the task, the network and the button without
          // scrolling. A brief too long for that pushes the diagram just
          // below itself, at its smallest height.
          <div
            data-testid="exercise-first-screen"
            style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, minHeight: '100%' }}
          >
            <div style={{ padding: '12px 16px', color: 'var(--netlab-text-primary)' }}>{brief}</div>
            <div
              ref={diagramRef}
              style={{
                flex: 1,
                minHeight: NARROW_DIAGRAM_MIN_HEIGHT,
                position: 'relative',
                scrollMarginTop: 8,
              }}
            >
              {diagram}
            </div>
            <DiagramLegend topology={topology} locale={locale} />
          </div>
        ) : (
          <LessonCanvas
            canvas={
              <div ref={diagramRef} style={{ position: 'absolute', inset: 0, scrollMarginTop: 8 }}>
                {diagram}
              </div>
            }
          />
        )}
        <LessonPanel
          defaultWidth={460}
          minWidth={340}
          maxWidth={720}
          style={{
            background: 'var(--netlab-bg-primary)',
            borderLeft: '1px solid var(--netlab-border)',
            color: 'var(--netlab-text-primary)',
          }}
        >
          <div style={isNarrow ? {} : { height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div
              ref={panelRef}
              data-testid="exercise-panel"
              data-exercise-id={exercise.id}
              style={{
                display: 'grid',
                gap: 16,
                padding: 16,
                alignContent: 'start',
                gridTemplateRows: 'auto',
                boxSizing: 'border-box',
                ...(isNarrow
                  ? { minHeight: '100%' }
                  : { flex: 1, minHeight: 0, overflowY: 'auto' }),
              }}
            >
              {isNarrow ? null : brief}

              {/* Above the form: after Check the learner reads the result, and what to change is right under it. */}
              <div style={{ display: 'grid', gap: 10, scrollMarginTop: 8 }}>
                {designRun && !stale && !busy ? (
                  <div
                    data-testid="exercise-prediction-outcome"
                    data-correct={String(designRun.predicted === designRun.actual)}
                    style={{ ...CARD, padding: 12 }}
                  >
                    <p style={{ margin: 0, fontWeight: 700 }}>
                      {designRun.predicted === designRun.actual
                        ? t('It went as you expected.', '予想どおりでした。')
                        : t(
                            'It went differently from what you expected.',
                            '予想とはちがう結果でした。',
                          )}
                    </p>
                    {designRun.option.explain ? (
                      <p data-testid="exercise-option-explain" style={{ margin: '4px 0 0' }}>
                        {designRun.option.explain[locale]}
                      </p>
                    ) : null}
                    {passed ? null : (
                      <p style={{ margin: '4px 0 0' }}>
                        {t(
                          'Pick another one and try again.',
                          'ほかのものを選んで、もう一度ためしてください。',
                        )}
                      </p>
                    )}
                  </div>
                ) : null}
                <ResultPanel
                  exercise={exercise}
                  grade={graded?.grade ?? null}
                  stale={stale}
                  busy={busy}
                  counted={passedAs ?? 'solved'}
                  checksToCount={maxChecks}
                  failedChecks={misses}
                  doneSentence={doneSentence}
                  onReplay={showReplay}
                  {...(missedSetting ? { onShowSetting: showSetting } : {})}
                  panelRef={resultRef}
                />
                <div ref={hintsRef}>
                  <HintTexts exercise={exercise} shownTier={hintTier} topology={topology} />
                </div>
              </div>

              {exercise.options ? (
                <DesignChooser
                  options={options}
                  chosenId={option?.id ?? null}
                  predicted={predicted}
                  disabled={busy || passed}
                  needs={needs}
                  needsRef={needsChoiceRef}
                  onChoose={(chosen) => {
                    setOption(chosen);
                    // The prediction stays: picking again is not a reason to ask it again.
                    setNeeds((now) => (now === 'choice' ? (predicted ? null : 'prediction') : now));
                    // The design is drawn at once, so the learner predicts from the picture.
                    replaceChanges(chosen.changes);
                  }}
                  onPredict={(value) => {
                    setPredicted(value);
                    setNeeds(null);
                  }}
                />
              ) : (
                <section style={{ display: 'grid', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>
                    {t('What you can change', '変えられるところ')}
                  </h3>
                  {exercise.allowed.some((ref) => ref.kind === 'link-state') ? (
                    <p data-testid="exercise-diagram-tip" style={{ margin: 0, fontSize: 14 }}>
                      <span aria-hidden="true">☞ </span>
                      {t(
                        'You can also press a cable on the diagram to plug it in or unplug it.',
                        '図のケーブルを押しても、そのケーブルをつないだり、はずしたりできます。',
                      )}
                    </p>
                  ) : null}
                  {order ? (
                    <SettingsForm
                      key={formKey}
                      exercise={exercise}
                      topology={topology}
                      order={order}
                      {...(exercise.pickFirst
                        ? { suspect: { found, cleared, needed: needsPick, onPick: pickSuspect } }
                        : {})}
                      onChange={change}
                      onFocusSetting={setFocused}
                      pointed={pointed}
                    />
                  ) : null}
                </section>
              )}

              {(passed || revealed) && context === 'practice' ? (
                <LessonLinks lessons={exercise.lessons} />
              ) : null}

              {passed ? null : (
                <section
                  aria-label={t('If you are stuck', '困ったとき')}
                  style={{ display: 'grid', gap: 10 }}
                >
                  <GiveUp
                    exercise={exercise}
                    revealed={revealed}
                    onReveal={() => {
                      setRevealed(true);
                      if (attempt.current) store.recordReveal(attempt.current.id);
                    }}
                    {...(isDesign ? {} : { onApply: () => replaceChanges(exercise.reference) })}
                  />
                </section>
              )}
            </div>
            {isNarrow ? null : actions}
          </div>
        </LessonPanel>
      </LessonSplit>
      {isNarrow ? actions : null}
    </div>
  );
}
