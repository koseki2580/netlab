import { useCallback, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import {
  currentIndex,
  grade,
  isComplete,
  recordAnswer,
  sessionProblem,
  sessionSummary,
  startSession,
  subnetFacts,
} from '../../learning/subnetting';
import type { GradeResult, SubnetProblem } from '../../learning/subnetting';
import { parseCidr } from '../../utils/cidr';
import { subnetExplanation, subnetKindLabelKey, subnetPrompt } from './drillI18n';
import { SubnetVisual } from './SubnetVisual';
import {
  ConceptCallout,
  DrillFeedback,
  DrillFrame,
  drillCardStyle,
  drillInputStyle,
  pillButton,
  useDrillCompletion,
  useFocusWhen,
  useQuestionFocus,
} from './drillKit';

function placeholderKeyFor(problem: SubnetProblem): string {
  switch (problem.kind) {
    case 'contains-host':
      return 'learning.subnet.placeholder.yesNo';
    case 'prefix-from-mask':
      return 'learning.subnet.placeholder.prefix';
    case 'usable-host-count':
      return 'learning.subnet.placeholder.count';
    default:
      return 'learning.subnet.placeholder.address';
  }
}

/**
 * Active-recall subnetting drill, run as a measurable session: a fixed number
 * of generated questions, immediate explained feedback per answer, and an
 * end-of-session mastery summary that tells the learner which subnet skills to
 * drill next. `generateProblem`/`grade`/session helpers are pure logic; every
 * learner-facing string routes through the i18n catalog (en/ja).
 */
export function SubnetDrillPanel({ seed = Date.now() }: { seed?: number }) {
  const { t } = useI18n();
  const [session, setSession] = useState(() => startSession(seed));
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<GradeResult | null>(null);

  const problem = useMemo(() => sessionProblem(session), [session]);
  const facts = useMemo(() => {
    const { length } = parseCidr(problem.givenCidr);
    return subnetFacts(problem.givenCidr.split('/')[0] ?? '0.0.0.0', length);
  }, [problem]);
  const done = isComplete(session);
  const index = currentIndex(session);
  const isLast = index === session.length - 1;
  const inputRef = useQuestionFocus<HTMLInputElement>(done ? 'done' : index);
  const summaryRef = useFocusWhen<HTMLHeadingElement>(done);
  useDrillCompletion(
    'subnet-drill',
    'Subnetting Practice',
    done,
    session.answers.filter((entry) => entry.correct).length,
    session.length,
  );

  const check = useCallback(() => {
    if (result || answer.trim() === '') return;
    setResult(grade(problem, answer));
  }, [answer, problem, result]);

  const advance = useCallback(() => {
    if (!result) return;
    setSession((current) => recordAnswer(current, problem, result.correct));
    setAnswer('');
    setResult(null);
  }, [problem, result]);

  const restart = useCallback(() => {
    setSession(startSession(seed + session.length));
    setAnswer('');
    setResult(null);
  }, [seed, session.length]);

  // Localized prompt and explanation, built from the same problem data the
  // logic layer uses (drillI18n tests pin the en output to the grader text).
  const promptText = useMemo(() => {
    const { key, params } = subnetPrompt(problem);
    return t(key, params);
  }, [problem, t]);
  const localizedResult = useMemo(() => {
    if (!result) return null;
    const { key, params } = subnetExplanation(problem, facts, result.expected);
    return { ...result, explanation: t(key, params) };
  }, [facts, problem, result, t]);

  if (done) {
    const summary = sessionSummary(session);
    return (
      <DrillFrame idPrefix="subnet-drill">
        <div data-testid="subnet-drill-summary" style={drillCardStyle}>
          <h2
            ref={summaryRef}
            tabIndex={-1}
            style={{
              margin: 0,
              color: 'var(--netlab-text-primary)',
              fontSize: 18,
              outline: 'none',
            }}
          >
            {t('learning.drill.sessionComplete')}
          </h2>
          <div
            data-testid="subnet-drill-score"
            style={{ fontSize: 28, fontWeight: 800, color: 'var(--netlab-text-primary)' }}
          >
            {summary.correct} / {summary.total}
          </div>

          <SkillList
            testid="subnet-drill-mastered"
            label={t('learning.subnet.mastered')}
            accent="var(--netlab-accent-green)"
            kinds={summary.mastered}
          />
          <SkillList
            testid="subnet-drill-review"
            label={t('learning.subnet.review')}
            accent="var(--netlab-accent-yellow)"
            kinds={summary.review}
          />

          <button
            type="button"
            data-testid="subnet-drill-restart"
            onClick={restart}
            style={pillButton('var(--netlab-accent-blue)')}
          >
            {t('learning.drill.practiceAgain')}
          </button>
        </div>
      </DrillFrame>
    );
  }

  return (
    <DrillFrame idPrefix="subnet-drill">
      <div style={drillCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0, color: 'var(--netlab-text-primary)', fontSize: 18 }}>
            {t('learning.subnet.title')}
          </h2>
          <span
            data-testid="subnet-drill-progress"
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 13,
              color: 'var(--netlab-text-secondary)',
            }}
          >
            {t('learning.drill.progress', { current: index + 1, total: session.length })}
          </span>
        </div>

        <ConceptCallout idPrefix="subnet-drill" title={t('learning.subnet.primer.title')}>
          {t('learning.subnet.primer.body')}
        </ConceptCallout>

        <label
          htmlFor="subnet-drill-answer"
          data-testid="subnet-drill-prompt"
          style={{ color: 'var(--netlab-text-primary)', fontSize: 16, lineHeight: 1.5 }}
        >
          {promptText}
        </label>

        <input
          id="subnet-drill-answer"
          data-testid="subnet-drill-input"
          ref={inputRef}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (result) advance();
              else check();
            }
          }}
          placeholder={t(placeholderKeyFor(problem))}
          aria-label={t('learning.subnet.answerLabel')}
          autoComplete="off"
          spellCheck={false}
          style={drillInputStyle}
        />

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            data-testid="subnet-drill-check"
            onClick={check}
            disabled={result !== null || answer.trim() === ''}
            style={{
              ...pillButton('var(--netlab-accent-blue)'),
              opacity: result !== null || answer.trim() === '' ? 0.5 : 1,
            }}
          >
            {t('learning.drill.check')}
          </button>
          <button
            type="button"
            data-testid="subnet-drill-advance"
            onClick={advance}
            disabled={result === null}
            style={{ ...pillButton('var(--netlab-accent-green)'), opacity: result ? 1 : 0.5 }}
          >
            {isLast ? t('learning.drill.seeResults') : t('learning.drill.next')}
          </button>
        </div>

        <DrillFeedback idPrefix="subnet-drill" result={localizedResult} />

        {/* Every answer ends as a visual lesson: the block, its usable range,
            and (for membership questions) where the asked address falls. */}
        {result && (
          <SubnetVisual
            facts={facts}
            {...(problem.probeHost ? { probeIp: problem.probeHost } : {})}
          />
        )}
      </div>
    </DrillFrame>
  );
}

function SkillList({
  testid,
  label,
  accent,
  kinds,
}: {
  testid: string;
  label: string;
  accent: string;
  kinds: readonly SubnetProblem['kind'][];
}) {
  const { t } = useI18n();
  if (kinds.length === 0) return null;
  return (
    <div data-testid={testid}>
      <div style={{ color: accent, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {kinds.map((kind) => (
          <span
            key={kind}
            style={{
              padding: '3px 10px',
              borderRadius: 'var(--netlab-radius-pill)',
              border: `1px solid color-mix(in srgb, ${accent} 40%, var(--netlab-learning-surface-border))`,
              color: 'var(--netlab-text-primary)',
              fontSize: 12,
            }}
          >
            {t(subnetKindLabelKey(kind))}
          </span>
        ))}
      </div>
    </div>
  );
}
