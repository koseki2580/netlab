import { useCallback, useMemo, useState } from 'react';
import DemoShell from '../DemoShell';
import { generateProblem, grade } from '../../src/learning/subnetting';
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
 * Active-recall subnetting drill. Pure-logic `generateProblem`/`grade` drive a
 * learning-surface practice loop: read a question, answer, get immediate
 * feedback with the canonical answer and a one-line "why", then advance.
 */
export function SubnetDrillPanel({ seed = Date.now() }: { seed?: number }) {
  const [seq, setSeq] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<GradeResult | null>(null);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);

  const problem = useMemo(() => generateProblem(seed, seq), [seed, seq]);

  const check = useCallback(() => {
    if (result || answer.trim() === '') return;
    const graded = grade(problem, answer);
    setResult(graded);
    setTotal((value) => value + 1);
    if (graded.correct) setCorrect((value) => value + 1);
  }, [answer, problem, result]);

  const next = useCallback(() => {
    setSeq((value) => value + 1);
    setAnswer('');
    setResult(null);
  }, []);

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
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0, color: 'var(--netlab-text-primary)', fontSize: 18 }}>
            Subnetting Practice
          </h2>
          <span
            data-testid="subnet-drill-score"
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 13,
              color: 'var(--netlab-text-secondary)',
            }}
          >
            Score: {correct} / {total}
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
              if (result) next();
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
            data-testid="subnet-drill-next"
            onClick={next}
            style={buttonStyle('var(--netlab-accent-green)')}
          >
            Next question
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
