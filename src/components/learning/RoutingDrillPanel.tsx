import { useCallback, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { generateRouteProblem, gradeRoute } from '../../learning/routing-decision';
import type { RouteGradeResult } from '../../learning/routing-decision';
import { routeExplanation, routePrompt } from './drillI18n';
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

const SESSION_LENGTH = 8;

/**
 * Active-recall drill for the router's core decision: longest-prefix match.
 * Read a destination and a routing table, pick the next-hop, get immediate
 * feedback naming the winning route. Graded by the same LPM the engine uses;
 * every learner-facing string routes through the i18n catalog (en/ja).
 */
export function RoutingDrillPanel({ seed = Date.now() }: { seed?: number }) {
  const { t } = useI18n();
  const [baseSeed, setBaseSeed] = useState(seed);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<RouteGradeResult | null>(null);

  const problem = useMemo(() => generateRouteProblem(baseSeed, index), [baseSeed, index]);
  const done = index >= SESSION_LENGTH;
  const isLast = index === SESSION_LENGTH - 1;
  const inputRef = useQuestionFocus<HTMLInputElement>(done ? 'done' : index);
  const summaryRef = useFocusWhen<HTMLHeadingElement>(done);
  useDrillCompletion('routing-drill', 'Routing Decision', done, correct, SESSION_LENGTH);

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

  // Localized prompt/explanation built from the same problem data the logic
  // layer uses (drillI18n tests pin the en output to the grader text).
  const promptText = useMemo(() => {
    const { key, params } = routePrompt(problem);
    return t(key, params);
  }, [problem, t]);
  const localizedResult = useMemo(() => {
    if (!result) return null;
    const { key, params } = routeExplanation(problem);
    return { ...result, explanation: t(key, params) };
  }, [problem, result, t]);

  if (done) {
    return (
      <DrillFrame idPrefix="routing-drill">
        <div data-testid="routing-drill-summary" style={drillCardStyle}>
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
            data-testid="routing-drill-score"
            style={{ fontSize: 28, fontWeight: 800, color: 'var(--netlab-text-primary)' }}
          >
            {correct} / {SESSION_LENGTH}
          </div>
          <p style={{ margin: 0, color: 'var(--netlab-text-secondary)', fontSize: 14 }}>
            {t('learning.route.summary.lesson')}
          </p>
          <button
            type="button"
            data-testid="routing-drill-restart"
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
    <DrillFrame idPrefix="routing-drill">
      <div style={drillCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0, color: 'var(--netlab-text-primary)', fontSize: 18 }}>
            {t('learning.route.title')}
          </h2>
          <span
            data-testid="routing-drill-progress"
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 13,
              color: 'var(--netlab-text-secondary)',
            }}
          >
            {t('learning.drill.progress', { current: index + 1, total: SESSION_LENGTH })}
          </span>
        </div>

        <ConceptCallout idPrefix="routing-drill" title={t('learning.route.primer.title')}>
          {t('learning.route.primer.body')}
        </ConceptCallout>

        <label
          htmlFor="routing-drill-answer"
          data-testid="routing-drill-prompt"
          style={{ color: 'var(--netlab-text-primary)', fontSize: 16, lineHeight: 1.5 }}
        >
          {promptText}
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
          <caption
            style={{
              textAlign: 'left',
              color: 'var(--netlab-text-secondary)',
              fontSize: 12,
              paddingBottom: 4,
            }}
          >
            {t('learning.route.table.caption')}
          </caption>
          <thead>
            <tr style={{ color: 'var(--netlab-text-secondary)', textAlign: 'left' }}>
              <th scope="col" style={{ padding: '4px 8px' }}>
                {t('learning.route.table.destination')}
              </th>
              <th scope="col" style={{ padding: '4px 8px' }}>
                {t('learning.route.table.nextHop')}
              </th>
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
          placeholder={t('learning.route.placeholder')}
          aria-label={t('learning.route.answerLabel')}
          autoComplete="off"
          spellCheck={false}
          style={drillInputStyle}
        />

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            data-testid="routing-drill-check"
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
            data-testid="routing-drill-advance"
            onClick={advance}
            disabled={result === null}
            style={{ ...pillButton('var(--netlab-accent-green)'), opacity: result ? 1 : 0.5 }}
          >
            {isLast ? t('learning.drill.seeResults') : t('learning.drill.next')}
          </button>
        </div>

        <DrillFeedback idPrefix="routing-drill" result={localizedResult} />
      </div>
    </DrillFrame>
  );
}
