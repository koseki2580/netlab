import { useCallback, useMemo, useState } from 'react';
import DemoShell from '../DemoShell';
import {
  currentIndex,
  grade,
  isComplete,
  recordAnswer,
  sessionProblem,
  sessionSummary,
  startSession,
} from '../../src/learning/subnetting';
import type { GradeResult, SubnetProblem } from '../../src/learning/subnetting';
import { readDemoEmbedParams } from '../embedParams';

function placeholderFor(problem: SubnetProblem): string {
  switch (problem.kind) {
    case 'contains-host':
      return 'yes / no';
    case 'prefix-from-mask':
      return 'e.g. /24';
    case 'usable-host-count':
      return 'e.g. 254';
    default:
      return 'e.g. 192.168.1.0';
  }
}

const KIND_LABEL: Record<SubnetProblem['kind'], string> = {
  'network-address': 'Network address',
  'broadcast-address': 'Broadcast address',
  'subnet-mask': 'Subnet mask',
  'prefix-from-mask': 'Prefix from mask',
  'usable-host-count': 'Usable host count',
  'first-usable-host': 'First usable host',
  'last-usable-host': 'Last usable host',
  'contains-host': 'Host membership',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--netlab-bg-surface)',
  border: '1px solid var(--netlab-learning-surface-border)',
  borderRadius: 'var(--netlab-radius-lg)',
  boxShadow: 'var(--netlab-learning-surface-shadow)',
  padding: 24,
  maxWidth: 560,
  margin: '0 auto',
  display: 'grid',
  gap: 16,
};

const buttonStyle = (accent: string): React.CSSProperties => ({
  padding: '10px 16px',
  borderRadius: 'var(--netlab-radius-pill)',
  border: `1px solid color-mix(in srgb, ${accent} 40%, var(--netlab-learning-surface-border))`,
  background: `color-mix(in srgb, ${accent} 14%, var(--netlab-bg-surface))`,
  color: 'var(--netlab-text-primary)',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
});

/**
 * Active-recall subnetting drill, run as a measurable session: a fixed number
 * of generated questions, immediate explained feedback per answer, and an
 * end-of-session mastery summary that tells the learner which subnet skills to
 * drill next. `generateProblem`/`grade`/session helpers are pure logic.
 */
export function SubnetDrillPanel({ seed = Date.now() }: { seed?: number }) {
  const [session, setSession] = useState(() => startSession(seed));
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<GradeResult | null>(null);

  const problem = useMemo(() => sessionProblem(session), [session]);
  const done = isComplete(session);
  const index = currentIndex(session);
  const isLast = index === session.length - 1;

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

  if (done) {
    const summary = sessionSummary(session);
    return (
      <DrillFrame>
        <div data-testid="subnet-drill-summary" style={cardStyle}>
          <h2 style={{ margin: 0, color: 'var(--netlab-text-primary)', fontSize: 18 }}>
            Session complete
          </h2>
          <div
            data-testid="subnet-drill-score"
            style={{ fontSize: 28, fontWeight: 800, color: 'var(--netlab-text-primary)' }}
          >
            {summary.correct} / {summary.total}
          </div>

          <SkillList
            testid="subnet-drill-mastered"
            label="Mastered"
            accent="var(--netlab-accent-green)"
            kinds={summary.mastered}
          />
          <SkillList
            testid="subnet-drill-review"
            label="Review these next"
            accent="var(--netlab-accent-yellow)"
            kinds={summary.review}
          />

          <button
            type="button"
            data-testid="subnet-drill-restart"
            onClick={restart}
            style={buttonStyle('var(--netlab-accent-blue)')}
          >
            Practice again
          </button>
        </div>
      </DrillFrame>
    );
  }

  return (
    <DrillFrame>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0, color: 'var(--netlab-text-primary)', fontSize: 18 }}>
            Subnetting Practice
          </h2>
          <span
            data-testid="subnet-drill-progress"
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 13,
              color: 'var(--netlab-text-secondary)',
            }}
          >
            Question {index + 1} / {session.length}
          </span>
        </div>

        <label
          htmlFor="subnet-drill-answer"
          data-testid="subnet-drill-prompt"
          style={{ color: 'var(--netlab-text-primary)', fontSize: 16, lineHeight: 1.5 }}
        >
          {problem.prompt}
        </label>

        <input
          id="subnet-drill-answer"
          data-testid="subnet-drill-input"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (result) advance();
              else check();
            }
          }}
          placeholder={placeholderFor(problem)}
          aria-label="Your answer"
          autoComplete="off"
          spellCheck={false}
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--netlab-radius-sm)',
            border: '1px solid var(--netlab-learning-surface-border)',
            background: 'var(--netlab-bg-primary)',
            color: 'var(--netlab-text-primary)',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 15,
          }}
        />

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            data-testid="subnet-drill-check"
            onClick={check}
            disabled={result !== null || answer.trim() === ''}
            style={{
              ...buttonStyle('var(--netlab-accent-blue)'),
              opacity: result !== null || answer.trim() === '' ? 0.5 : 1,
            }}
          >
            Check
          </button>
          <button
            type="button"
            data-testid="subnet-drill-advance"
            onClick={advance}
            disabled={result === null}
            style={{ ...buttonStyle('var(--netlab-accent-green)'), opacity: result ? 1 : 0.5 }}
          >
            {isLast ? 'See results' : 'Next question'}
          </button>
        </div>

        <div
          data-testid="subnet-drill-feedback"
          role="status"
          aria-live="polite"
          style={{ minHeight: 44 }}
        >
          {result && (
            <div
              data-testid={result.correct ? 'subnet-drill-correct' : 'subnet-drill-incorrect'}
              style={{
                borderRadius: 'var(--netlab-radius-md)',
                padding: '10px 12px',
                background: `color-mix(in srgb, ${
                  result.correct ? 'var(--netlab-accent-green)' : 'var(--netlab-accent-red)'
                } 12%, var(--netlab-bg-surface))`,
                color: 'var(--netlab-text-primary)',
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              <strong>
                {result.correct ? '✓ Correct' : `✗ Not quite — answer: ${result.expected}`}
              </strong>
              <div style={{ marginTop: 4, color: 'var(--netlab-text-secondary)' }}>
                {result.explanation}
              </div>
            </div>
          )}
        </div>
      </div>
    </DrillFrame>
  );
}

function DrillFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-testid="subnet-drill"
      style={{
        background: 'var(--netlab-learning-surface-bg)',
        minHeight: '100%',
        padding: '32px 16px',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
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
            {KIND_LABEL[kind]}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SubnetDrillDemo() {
  const { embedded } = readDemoEmbedParams();
  return (
    <DemoShell
      title="Subnetting Practice"
      desc="Drill IPv4 subnet math with instant, explained feedback"
      embedded={embedded}
    >
      <SubnetDrillPanel />
    </DemoShell>
  );
}
