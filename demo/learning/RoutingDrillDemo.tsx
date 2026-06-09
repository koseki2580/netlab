import { useCallback, useMemo, useState } from 'react';
import DemoShell from '../DemoShell';
import { generateRouteProblem, gradeRoute } from '../../src/learning/routing-decision';
import type { RouteGradeResult } from '../../src/learning/routing-decision';
import { readDemoEmbedParams } from '../embedParams';

const SESSION_LENGTH = 8;

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
 * Active-recall drill for the router's core decision: longest-prefix match.
 * Read a destination and a routing table, pick the next-hop, get immediate
 * feedback naming the winning route. Graded by the same LPM the engine uses.
 */
export function RoutingDrillPanel({ seed = Date.now() }: { seed?: number }) {
  const [baseSeed, setBaseSeed] = useState(seed);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<RouteGradeResult | null>(null);

  const problem = useMemo(() => generateRouteProblem(baseSeed, index), [baseSeed, index]);
  const done = index >= SESSION_LENGTH;
  const isLast = index === SESSION_LENGTH - 1;

  const check = useCallback(() => {
    if (result || answer.trim() === '') return;
    setResult(gradeRoute(problem, answer));
  }, [answer, problem, result]);

  const advance = useCallback(() => {
    if (!result) return;
    if (result.correct) setCorrect((value) => value + 1);
    setIndex((value) => value + 1);
    setAnswer('');
    setResult(null);
  }, [result]);

  const restart = useCallback(() => {
    setBaseSeed((value) => value + SESSION_LENGTH);
    setIndex(0);
    setCorrect(0);
    setAnswer('');
    setResult(null);
  }, []);

  if (done) {
    return (
      <DrillFrame>
        <div data-testid="routing-drill-summary" style={cardStyle}>
          <h2 style={{ margin: 0, color: 'var(--netlab-text-primary)', fontSize: 18 }}>
            Session complete
          </h2>
          <div
            data-testid="routing-drill-score"
            style={{ fontSize: 28, fontWeight: 800, color: 'var(--netlab-text-primary)' }}
          >
            {correct} / {SESSION_LENGTH}
          </div>
          <p style={{ margin: 0, color: 'var(--netlab-text-secondary)', fontSize: 14 }}>
            Routers always pick the <strong>most specific</strong> matching route — the longest
            prefix — regardless of how the table is ordered.
          </p>
          <button
            type="button"
            data-testid="routing-drill-restart"
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
            Routing Decision
          </h2>
          <span
            data-testid="routing-drill-progress"
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 13,
              color: 'var(--netlab-text-secondary)',
            }}
          >
            Question {index + 1} / {SESSION_LENGTH}
          </span>
        </div>

        <label
          htmlFor="routing-drill-answer"
          data-testid="routing-drill-prompt"
          style={{ color: 'var(--netlab-text-primary)', fontSize: 16, lineHeight: 1.5 }}
        >
          {problem.prompt}
        </label>

        <table
          data-testid="routing-drill-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 13,
            color: 'var(--netlab-text-primary)',
          }}
        >
          <thead>
            <tr style={{ color: 'var(--netlab-text-secondary)', textAlign: 'left' }}>
              <th style={{ padding: '4px 8px' }}>Destination</th>
              <th style={{ padding: '4px 8px' }}>Next-hop</th>
            </tr>
          </thead>
          <tbody>
            {problem.routes.map((entry) => (
              <tr key={entry.destination} style={{ borderTop: '1px solid var(--netlab-border)' }}>
                <td style={{ padding: '4px 8px' }}>{entry.destination}</td>
                <td style={{ padding: '4px 8px' }}>{entry.nextHop}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <input
          id="routing-drill-answer"
          data-testid="routing-drill-input"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (result) advance();
              else check();
            }
          }}
          placeholder="next-hop, e.g. 192.0.2.3"
          aria-label="Chosen next-hop"
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
            data-testid="routing-drill-check"
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
            data-testid="routing-drill-advance"
            onClick={advance}
            disabled={result === null}
            style={{ ...buttonStyle('var(--netlab-accent-green)'), opacity: result ? 1 : 0.5 }}
          >
            {isLast ? 'See results' : 'Next question'}
          </button>
        </div>

        <div
          data-testid="routing-drill-feedback"
          role="status"
          aria-live="polite"
          style={{ minHeight: 44 }}
        >
          {result && (
            <div
              data-testid={result.correct ? 'routing-drill-correct' : 'routing-drill-incorrect'}
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
      data-testid="routing-drill"
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

export default function RoutingDrillDemo() {
  const { embedded } = readDemoEmbedParams();
  return (
    <DemoShell
      title="Routing Decision"
      desc="Drill longest-prefix match: which next-hop does the router choose?"
      embedded={embedded}
    >
      <RoutingDrillPanel />
    </DemoShell>
  );
}
