import { useCallback, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { generateRouteProblem, gradeRoute } from '../../learning/routing-decision';
import type { RouteGradeResult } from '../../learning/routing-decision';
import { nextHopFromNodeId, routeProblemTopology } from '../../learning/routing-decision/topology';
import { NetlabCanvas } from '../NetlabCanvas';
import { NetlabProvider } from '../NetlabProvider';
import { routeExplanation, routePrompt } from './drillI18n';
import {
  ConceptCallout,
  DrillFeedback,
  DrillFrame,
  drillCardStyle,
  pillButton,
  useDrillCompletion,
  useFocusWhen,
} from './drillKit';

const SESSION_LENGTH = 8;

/**
 * The routing drill ON the visualization: the deciding router and its
 * neighbors are rendered on the NetlabCanvas, and the learner answers by
 * clicking the neighbor the router will forward to. The same answers are
 * mirrored as buttons so keyboard and screen-reader users drill the identical
 * question. Graded by the longest-prefix match the engine uses.
 */
export function VisualRoutingDrillPanel({ seed = Date.now() }: { seed?: number }) {
  const { t } = useI18n();
  const [baseSeed, setBaseSeed] = useState(seed);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [result, setResult] = useState<RouteGradeResult | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  const problem = useMemo(() => generateRouteProblem(baseSeed, index), [baseSeed, index]);
  // After grading, rebuild with the winner (and a wrong pick) highlighted so
  // the feedback shows on the network itself; the provider syncs the update.
  const topology = useMemo(
    () =>
      routeProblemTopology(
        problem,
        result
          ? {
              winner: result.expected,
              ...(chosen && !result.correct ? { wrongChoice: chosen } : {}),
            }
          : undefined,
      ),
    [problem, result, chosen],
  );
  const nextHops = useMemo(
    () => [...new Set(problem.routes.map((route) => route.nextHop))],
    [problem],
  );
  const done = index >= SESSION_LENGTH;
  const isLast = index === SESSION_LENGTH - 1;
  const summaryRef = useFocusWhen<HTMLHeadingElement>(done);
  useDrillCompletion(
    'visual-routing-drill',
    'Visual Routing Decision',
    done,
    correct,
    SESSION_LENGTH,
  );

  const answer = useCallback(
    (nextHop: string) => {
      if (result) return; // one answer per question
      setChosen(nextHop);
      setResult(gradeRoute(problem, nextHop));
    },
    [problem, result],
  );

  const handleNodeSelect = useCallback(
    (nodeId: string | null) => {
      if (!nodeId) return;
      const nextHop = nextHopFromNodeId(nodeId);
      if (nextHop) answer(nextHop);
    },
    [answer],
  );

  const advance = useCallback(() => {
    if (!result) return;
    if (result.correct) setCorrect((value) => value + 1);
    setIndex((value) => value + 1);
    setResult(null);
    setChosen(null);
  }, [result]);

  const restart = useCallback(() => {
    setBaseSeed((value) => value + SESSION_LENGTH);
    setIndex(0);
    setCorrect(0);
    setResult(null);
    setChosen(null);
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
      <DrillFrame idPrefix="visual-routing-drill">
        <div data-testid="visual-routing-drill-summary" style={drillCardStyle}>
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
            data-testid="visual-routing-drill-score"
            style={{ fontSize: 28, fontWeight: 800, color: 'var(--netlab-text-primary)' }}
          >
            {correct} / {SESSION_LENGTH}
          </div>
          <p style={{ margin: 0, color: 'var(--netlab-text-secondary)', fontSize: 14 }}>
            {t('learning.route.summary.lesson')}
          </p>
          <button
            type="button"
            data-testid="visual-routing-drill-restart"
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
    <DrillFrame idPrefix="visual-routing-drill">
      <div style={{ ...drillCardStyle, maxWidth: 760 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0, color: 'var(--netlab-text-primary)', fontSize: 18 }}>
            {t('learning.route.visualTitle')}
          </h2>
          <span
            data-testid="visual-routing-drill-progress"
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 13,
              color: 'var(--netlab-text-secondary)',
            }}
          >
            {t('learning.drill.progress', { current: index + 1, total: SESSION_LENGTH })}
          </span>
        </div>

        <ConceptCallout
          idPrefix="visual-routing-drill"
          title={t('learning.route.visualPrimer.title')}
        >
          {t('learning.route.visualPrimer.body')}
        </ConceptCallout>

        <p
          data-testid="visual-routing-drill-prompt"
          style={{ margin: 0, color: 'var(--netlab-text-primary)', fontSize: 16, lineHeight: 1.5 }}
        >
          {promptText}
        </p>

        <table
          data-testid="visual-routing-drill-table"
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

        <div
          data-testid="visual-routing-drill-canvas"
          style={{
            height: 380,
            border: '1px solid var(--netlab-learning-surface-border)',
            borderRadius: 'var(--netlab-radius-md)',
            overflow: 'hidden',
          }}
        >
          {/* Remount per question so canvas selection state starts fresh. */}
          <NetlabProvider key={problem.id} topology={topology}>
            <NetlabCanvas
              followTopology
              minimap={false}
              controls={false}
              interactiveGraph={false}
              fitViewPadding={0.3}
              onNodeSelect={handleNodeSelect}
            />
          </NetlabProvider>
        </div>

        <div
          role="group"
          aria-label={t('learning.route.answerGroup')}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
        >
          {nextHops.map((nextHop) => {
            // After grading: highlight the LPM winner, mark a wrongly chosen hop.
            const isWinner = result !== null && nextHop === result.expected;
            const isWrongChoice = result !== null && !result.correct && nextHop === chosen;
            const accent = isWinner
              ? 'var(--netlab-accent-green)'
              : isWrongChoice
                ? 'var(--netlab-accent-red)'
                : 'var(--netlab-accent-blue)';
            return (
              <button
                key={nextHop}
                type="button"
                data-testid={`visual-routing-drill-answer-${nextHop}`}
                {...(isWinner ? { 'data-answer-state': 'winner' } : {})}
                {...(isWrongChoice ? { 'data-answer-state': 'wrong-choice' } : {})}
                onClick={() => answer(nextHop)}
                disabled={result !== null}
                style={{
                  ...pillButton(accent),
                  fontFamily: 'ui-monospace, monospace',
                  opacity: result !== null && !isWinner && !isWrongChoice ? 0.4 : 1,
                }}
              >
                {isWinner ? `✓ ${nextHop}` : isWrongChoice ? `✗ ${nextHop}` : nextHop}
              </button>
            );
          })}
        </div>

        <DrillFeedback idPrefix="visual-routing-drill" result={localizedResult} />

        {result && (
          <button
            type="button"
            data-testid="visual-routing-drill-advance"
            onClick={advance}
            style={{ ...pillButton('var(--netlab-accent-green)'), justifySelf: 'start' }}
          >
            {isLast ? t('learning.drill.seeResults') : t('learning.drill.next')}
          </button>
        )}
      </div>
    </DrillFrame>
  );
}
