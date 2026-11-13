import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useGalleryLocale, useT } from '../../localeContext';
import { judgePacketExercise } from '../../packet-lab/judge';
import type {
  FieldId,
  PacketExercise,
  PacketGrade,
  PacketGoalResult,
} from '../../packet-lab/model';
import type { AttemptStore } from '../store/attemptStore';
import { attemptOrder } from '../ui/attemptOrder';
import { ExerciseDiagram, type DiagramReplay } from '../ui/ExerciseDiagram';
import { LessonLinks } from '../ui/ExerciseParts';
import { CARD, MUTED, PRIMARY, SECONDARY } from '../ui/styles';
import {
  answerFor,
  changedCount,
  draftFields,
  draftRows,
  initialDraft,
  referenceDraft,
  type Draft,
} from './answers';
import { diagramFacts, needsMacs } from './diagramFacts';
import { packetPaths } from './hops';
import { FragmentTable, PacketLayers, Questions } from './PacketForm';
import { answeredByPicks, packetMeta } from './packetSource';

const LAYOUT_CSS = `
.packet-page { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); height: 100%; }
.packet-diagram { position: relative; min-height: 320px; }
.packet-panel { overflow: auto; padding: 16px; display: grid; gap: 14px; align-content: start; }
@media (max-width: 900px) {
  .packet-page { display: block; height: auto; }
  .packet-diagram { height: 320px; }
}`;

/** Why Check did not judge: nothing entered yet, or a box that does not hold a value. */
type Refused = 'nothing' | 'draft';

/**
 * One packet exercise: the task, the diagram with what it needs said beside
 * it, the packet (or the fragment table, or the questions) to fill in, Check,
 * and what the judge found, goal by goal and part by part, with the replay.
 */
export function PacketRunner({
  exercise,
  store,
  onNext,
}: {
  exercise: PacketExercise;
  store: AttemptStore;
  onNext: () => void;
}) {
  const t = useT();
  const locale = useGalleryLocale();
  const [draft, setDraft] = useState<Draft>(() => initialDraft(exercise));
  const [grade, setGrade] = useState<PacketGrade | null>(null);
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<Refused | null>(null);
  const [shownDrafts, setShownDrafts] = useState(false);
  const [hintTier, setHintTier] = useState<0 | 1 | 2 | 3>(0);
  const [revealed, setRevealed] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [replay, setReplay] = useState<DiagramReplay | null>(null);
  const attemptId = useRef<string | null>(null);
  const [slot, setSlot] = useState(0);
  const resultRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const id = store.open(packetMeta(exercise, locale), 'practice');
    attemptId.current = id;
    setSlot(
      attemptOrder(
        store.getState().attempts.map((entry) => entry.id),
        id,
      ).slot,
    );
    // One attempt per visit; the locale of its opening is the one recorded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id, store]);

  const facts = useMemo(() => diagramFacts(exercise), [exercise]);
  const showFrame = needsMacs(exercise);
  const fieldDrafts = useMemo(() => {
    if (exercise.kind === 'build-packet') return draftFields(exercise.fields, draft.values);
    if (exercise.kind === 'read-packet' && exercise.fix)
      return draftFields(exercise.fix.fields, draft.values);
    return [];
  }, [exercise, draft.values]);
  const rowDrafts = useMemo(() => draftRows(exercise, draft.rows), [exercise, draft.rows]);
  const passed = grade?.passed === true && !stale;
  const settled = passed || revealed;

  const change = (next: Draft) => {
    setDraft(next);
    setRefused(null);
    if (grade) setStale(true);
  };
  const onEnter = (id: FieldId, value: string | boolean) =>
    change({ ...draft, values: { ...draft.values, [id]: value } });

  const check = async () => {
    const nothing =
      exercise.kind === 'fragment' ? draft.rows.length === 0 : changedCount(exercise, draft) === 0;
    if (nothing) {
      setRefused('nothing');
      return;
    }
    if (fieldDrafts.length > 0 || rowDrafts.length > 0) {
      setShownDrafts(true);
      setRefused('draft');
      return;
    }
    setBusy(true);
    setRefused(null);
    const result = await judgePacketExercise(exercise, answerFor(exercise, draft));
    setGrade(result);
    setStale(false);
    setBusy(false);
    if (result.trace)
      setReplay((before) => ({ trace: result.trace!, run: (before?.run ?? 0) + 1 }));
    if (attemptId.current) {
      store.recordCheck(attemptId.current, {
        passed: result.passed,
        failedCheckIds: result.results
          .filter((entry) => !entry.passed)
          .map((entry) => entry.goalId),
        changedSettings: changedCount(exercise, draft),
      });
    }
    requestAnimationFrame(() => resultRef.current?.focus());
  };

  const reveal = () => {
    if (attemptId.current) store.recordReveal(attemptId.current);
    setRevealed(true);
    setDraft(referenceDraft(exercise));
    setRefused(null);
  };

  const hint = () => {
    const tier = Math.min(3, hintTier + 1) as 1 | 2 | 3;
    setHintTier(tier);
    if (attemptId.current) store.recordHint(attemptId.current, tier);
  };

  const paths = grade ? packetPaths(exercise, grade) : [];
  const labelOf = (id: string) => exercise.nodeLabels[id]?.[locale] ?? id;

  const goalLabel = (entry: PacketGoalResult): string => {
    if (exercise.kind === 'build-packet') {
      return exercise.goals.find((goal) => goal.id === entry.goalId)?.label[locale] ?? entry.goalId;
    }
    if (exercise.kind === 'fragment') {
      return exercise.goals.find((goal) => goal.id === entry.goalId)?.label[locale] ?? entry.goalId;
    }
    const question = exercise.questions.find((q) => q.id === entry.goalId);
    if (question) return question.prompt[locale];
    return (
      exercise.fix?.goals.find((goal) => goal.id === entry.goalId)?.label[locale] ?? entry.goalId
    );
  };
  const isQuestion = (entry: PacketGoalResult) =>
    exercise.kind === 'read-packet' && exercise.questions.some((q) => q.id === entry.goalId);

  const resultRows = (entries: readonly PacketGoalResult[]) => (
    <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
      {entries.map((entry) => (
        <li
          key={entry.goalId}
          data-testid="packet-result-row"
          data-goal={entry.goalId}
          data-code={entry.code}
          data-passed={String(entry.passed)}
          style={{ display: 'grid', gap: 2 }}
        >
          <span style={{ fontWeight: 700 }}>
            <span aria-hidden="true">{entry.passed ? '✓ ' : '✗ '}</span>
            {goalLabel(entry)}
            <span style={{ position: 'absolute', left: -9999 }}>
              {entry.passed ? t('(met)', '（できている）') : t('(not met)', '（まだ）')}
            </span>
          </span>
          {entry.passed ? null : (
            <span data-testid="packet-result-message">{entry.message[locale]}</span>
          )}
        </li>
      ))}
    </ul>
  );

  const box: CSSProperties = { ...CARD, display: 'grid', gap: 10 };

  return (
    <div
      className="packet-page"
      data-testid="packet-exercise"
      data-exercise-id={exercise.id}
      data-kind={exercise.kind}
    >
      <style>{LAYOUT_CSS}</style>
      <div className="packet-diagram">
        <ExerciseDiagram
          topology={exercise.topology}
          replay={replay}
          highlightNodeId={null}
          label={t('The network of this exercise', 'この問題のネットワーク')}
          locale={locale}
        />
      </div>
      <div className="packet-panel">
        <section style={box} aria-label={t('The task', '課題')}>
          <h2 style={{ margin: 0, fontSize: 20 }} data-testid="packet-title">
            {exercise.title[locale]}
          </h2>
          <p data-testid="packet-task" style={{ margin: 0, fontWeight: 700 }}>
            {exercise.task[locale]}
          </p>
          <p data-testid="packet-rule" style={{ margin: 0 }}>
            {exercise.rule[locale]}
          </p>
          <div>
            <button
              type="button"
              data-testid="packet-brief-toggle"
              aria-expanded={briefOpen}
              onClick={() => setBriefOpen(!briefOpen)}
              style={{
                ...SECONDARY,
                border: 'none',
                padding: 0,
                background: 'none',
                color: 'var(--netlab-accent-cyan)',
              }}
            >
              {briefOpen
                ? t('Hide the story', '説明をとじる')
                : t('Read more', 'くわしい説明を読む')}
            </button>
          </div>
          {briefOpen ? (
            <p data-testid="packet-brief" style={{ margin: 0 }}>
              {exercise.brief[locale]}
            </p>
          ) : null}
        </section>

        {facts.macs.length + facts.mtus.length + facts.lists.length > 0 ? (
          <section
            data-testid="packet-facts"
            style={box}
            aria-label={t('On the diagram', '図の補足')}
          >
            {facts.mtus.length > 0 ? (
              <div data-testid="packet-facts-mtus">
                <strong>{t('Cable limits (MTU)', '回線の上限（MTU）')}</strong>
                <ul style={{ margin: 0 }}>
                  {facts.mtus.map((fact) => (
                    <li key={fact.id}>{fact.text[locale]}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {facts.lists.length > 0 ? (
              <div data-testid="packet-facts-lists">
                <strong>{t('Router lists (ACL)', 'ルータの一覧（ACL）')}</strong>
                <ul style={{ margin: 0 }}>
                  {facts.lists.map((fact) => (
                    <li key={fact.id}>{fact.text[locale]}</li>
                  ))}
                </ul>
                <p style={{ ...MUTED, margin: 0, fontSize: 14 }}>
                  {t(
                    'Traffic that fits no "allow" line is refused.',
                    'どの「通す」行にも当てはまらない通信は止められます。',
                  )}
                </p>
              </div>
            ) : null}
            {facts.macs.length > 0 ? (
              <div data-testid="packet-facts-macs">
                <strong>{t('MAC addresses', 'MAC アドレス')}</strong>
                <ul style={{ margin: 0, fontFamily: 'ui-monospace, monospace', fontSize: 14 }}>
                  {facts.macs.map((fact) => (
                    <li key={fact.id}>{fact.text[locale]}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        <section
          style={box}
          aria-label={t('Your answer', 'あなたの答え')}
          data-testid="packet-answer"
        >
          {exercise.kind === 'read-packet' ? (
            <>
              {exercise.packets.map((packet, index) => (
                <PacketLayers
                  key={index}
                  packet={packet}
                  fields={[]}
                  entered={{}}
                  onEnter={() => undefined}
                  slot={slot}
                  disabled
                  showFrame={showFrame}
                  drafts={[]}
                  testId={`packet-captured-${index + 1}`}
                  title={
                    exercise.packets.length > 1
                      ? t(
                          `Packet ${index === 0 ? 'A' : 'B'}`,
                          `パケット ${index === 0 ? 'A' : 'B'}`,
                        )
                      : t('The packet, as it left the sender', '送り主から出たときのパケット')
                  }
                />
              ))}
              <Questions
                questions={exercise.questions}
                picks={draft.picks}
                onPick={(id, value) => change({ ...draft, picks: { ...draft.picks, [id]: value } })}
                slot={slot}
                disabled={busy || settled}
              />
              {exercise.fix && exercise.packets[0] ? (
                <PacketLayers
                  packet={exercise.packets[0]}
                  fields={exercise.fix.fields}
                  entered={draft.values}
                  onEnter={onEnter}
                  slot={slot}
                  disabled={busy || settled}
                  showFrame={showFrame}
                  drafts={shownDrafts ? fieldDrafts : []}
                  testId="packet-fix"
                  title={t('Then correct it so that it gets through', 'そのあと、届くように直す')}
                />
              ) : null}
            </>
          ) : exercise.kind === 'fragment' ? (
            <>
              <p style={{ margin: 0 }} data-testid="fragment-given">
                {t(
                  `The packet: ${exercise.payloadBytes} bytes of data, ${exercise.packet.carries.toUpperCase()}. The narrow cable: MTU ${exercise.mtu} bytes.`,
                  `パケット：データ ${exercise.payloadBytes} バイト（${exercise.packet.carries.toUpperCase()}）。細い回線：MTU ${exercise.mtu} バイト。`,
                )}
              </p>
              <FragmentTable
                exercise={exercise}
                rows={draft.rows}
                onRows={(rows) => change({ ...draft, rows })}
                disabled={busy || settled}
                drafts={shownDrafts ? rowDrafts : []}
              />
            </>
          ) : (
            <PacketLayers
              packet={exercise.packet}
              fields={exercise.fields}
              entered={draft.values}
              onEnter={onEnter}
              slot={slot}
              disabled={busy || settled}
              showFrame={showFrame}
              drafts={shownDrafts ? fieldDrafts : []}
              testId="packet-build"
              title={t('The packet', 'パケット')}
            />
          )}
          {refused ? (
            <p
              data-testid="packet-refused"
              data-reason={refused}
              style={{ margin: 0, color: 'var(--netlab-accent-orange)' }}
            >
              {refused === 'nothing'
                ? t(
                    'Nothing is filled in yet: there is nothing to check.',
                    'まだ何も入れていないので、たしかめられません。',
                  )
                : t(
                    'A box does not hold a whole number yet; it is marked.',
                    '整数になっていない欄があります。印の付いた欄を直してください。',
                  )}
            </p>
          ) : null}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {settled ? (
              <button type="button" data-testid="packet-next" onClick={onNext} style={PRIMARY}>
                {t('Next exercise →', 'つぎの問題へ →')}
              </button>
            ) : (
              <button
                type="button"
                data-testid="packet-check"
                disabled={busy}
                onClick={() => void check()}
                style={PRIMARY}
              >
                {busy ? t('Sending…', '送っています…') : t('Check', 'たしかめる')}
              </button>
            )}
            {!settled ? (
              <>
                <button
                  type="button"
                  data-testid="packet-hint"
                  disabled={hintTier >= 3}
                  onClick={hint}
                  style={SECONDARY}
                >
                  {hintTier === 0 ? t('Hint', 'ヒント') : t('Another hint', 'つぎのヒント')}
                </button>
                <button
                  type="button"
                  data-testid="packet-reveal"
                  onClick={reveal}
                  style={SECONDARY}
                >
                  {t('Show the answer', '答えを見る')}
                </button>
              </>
            ) : null}
          </div>
          {answeredByPicks(exercise) ? (
            <p style={{ ...MUTED, margin: 0, fontSize: 14 }} data-testid="packet-first-check">
              {t(
                'You choose among a few answers here, so only a solve on the first Check counts.',
                'この問題は選ぶ問題なので、1 回目の「たしかめる」で解けたときだけ数えます。',
              )}
            </p>
          ) : null}
        </section>

        {hintTier > 0 ? (
          <section data-testid="packet-hints" style={box} aria-label={t('Hints', 'ヒント')}>
            {exercise.hints
              .filter((entry) => entry.tier <= hintTier)
              .map((entry) => (
                <p key={entry.tier} data-testid={`packet-hint-${entry.tier}`} style={{ margin: 0 }}>
                  {t(`Hint ${entry.tier}: `, `ヒント ${entry.tier}：`)}
                  {entry.text[locale]}
                </p>
              ))}
          </section>
        ) : null}

        {revealed ? (
          <p data-testid="packet-revealed" style={{ ...box, margin: 0 }}>
            {t(
              'The answer is filled in. This exercise is not counted as solved.',
              '答えを入れました。この問題は「解けた」には数えません。',
            )}
          </p>
        ) : null}

        {grade ? (
          <section
            ref={resultRef}
            tabIndex={-1}
            role="status"
            data-testid="packet-result"
            data-passed={String(grade.passed)}
            {...(stale ? { 'data-stale': '' } : {})}
            style={{
              ...box,
              borderColor: grade.passed ? '#0f766e' : 'var(--netlab-accent-orange)',
            }}
          >
            <strong data-testid="packet-result-summary">
              {stale
                ? t('You changed something since this Check.', 'このあと答えを変えました。')
                : grade.passed
                  ? t('Every goal is met.', 'すべてできています。')
                  : t(
                      'Not yet. What the simulator found:',
                      'まだです。シミュレータが見つけたこと：',
                    )}
            </strong>
            {exercise.kind === 'read-packet' && exercise.fix ? (
              <>
                <div data-testid="packet-result-questions">
                  <strong>{t('Your reading', '読み取り')}</strong>
                  {resultRows(grade.results.filter(isQuestion))}
                </div>
                <div data-testid="packet-result-fix">
                  <strong>{t('Your correction', '直したパケット')}</strong>
                  {resultRows(grade.results.filter((entry) => !isQuestion(entry)))}
                </div>
              </>
            ) : (
              resultRows(grade.results)
            )}
            {paths.some((path) => path.lines.length > 0) ? (
              <div>
                <strong>
                  {paths.length > 1
                    ? t('Where each packet went', 'それぞれのパケットの通った道')
                    : t('Where the packet went', 'パケットの通った道')}
                </strong>
                {paths.map((path, index) => (
                  <div key={index} data-testid={`packet-path-${index + 1}`}>
                    {path.name ? <div style={{ marginTop: 6 }}>{path.name[locale]}</div> : null}
                    <ol data-testid="packet-hops" style={{ margin: 0, paddingLeft: 24 }}>
                      {path.lines.map((hop) => (
                        <li key={hop.step} data-testid="packet-hop" data-note={String(hop.note)}>
                          {hop.note ? t('(note sent back) ', '（返ってきた知らせ）') : ''}
                          {labelOf(hop.nodeId)}：{hop.what[locale]}
                          {hop.start
                            ? t(
                                ` — leaves with TTL ${hop.ttl}`,
                                `（送り出したときの TTL ${hop.ttl}）`,
                              )
                            : t(` — TTL on arrival ${hop.ttl}`, `（着いたときの TTL ${hop.ttl}）`)}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <LessonLinks lessons={exercise.lessons} />
      </div>
    </div>
  );
}
