import { useCallback, useEffect, useMemo, useState } from 'react';
import { HookEngine } from '../../hooks/HookEngine';
import { useI18n } from '../../i18n/useI18n';
import { journeyProbe } from '../../learning/packet-journey';
import {
  RESILIENCE_SCENARIOS,
  buildResilienceTopology,
  resilienceOutcome,
  resilienceTopologyView,
} from '../../learning/resilience';
import type { ResilienceOutcome } from '../../learning/resilience';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { NetlabCanvas } from '../NetlabCanvas';
import { NetlabProvider } from '../NetlabProvider';
import {
  ConceptCallout,
  DrillFeedback,
  DrillFrame,
  drillCardStyle,
  pillButton,
  useDecorativeCanvasRef,
  useDrillCompletion,
  useFocusWhen,
  useQuestionFocus,
} from './drillKit';
import type { DrillResult } from './drillKit';

type Prediction = 'survived' | 'dropped';

/**
 * Predict-then-observe for failures: each scenario breaks one element of a
 * network with a redundant link, the learner predicts whether the packet still
 * arrives, and the real engine reveals the rerouted (or doomed) path on the
 * canvas with the engine's own drop reason. The simulator teaches resilience.
 *
 * Requires the l2/l3 layer plugins to be registered (the demo entry does this).
 */
export function ResilienceLabPanel() {
  const { t } = useI18n();
  const topology = useMemo(() => buildResilienceTopology(), []);
  const labels = useMemo(
    () => new Map(topology.nodes.map((node) => [node.id, String(node.data.label ?? node.id)])),
    [topology],
  );

  const [idx, setIdx] = useState(0);
  const [outcome, setOutcome] = useState<ResilienceOutcome | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<DrillResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [done, setDone] = useState(false);

  const scenario = RESILIENCE_SCENARIOS[idx % RESILIENCE_SCENARIOS.length]!;
  const summaryRef = useFocusWhen<HTMLHeadingElement>(done);
  // Announce each new scenario's prompt to keyboard/screen-reader users on advance.
  const promptRef = useQuestionFocus<HTMLParagraphElement>(idx);
  const canvasRef = useDecorativeCanvasRef<HTMLDivElement>();
  useDrillCompletion('resilience-lab-drill', 'Resilience Lab', done, correctCount, totalCount);

  // The real engine computes the failure outcome for the current scenario.
  useEffect(() => {
    let cancelled = false;
    setOutcome(null);
    const top = buildResilienceTopology();
    const engine = new SimulationEngine(top, new HookEngine());
    void engine.precompute(journeyProbe(scenario.flow), scenario.failure).then((trace) => {
      if (!cancelled) setOutcome(resilienceOutcome(trace, top));
    });
    return () => {
      cancelled = true;
    };
  }, [scenario]);

  const viewTopology = useMemo(
    () => resilienceTopologyView(topology, scenario, revealed ? outcome : null),
    [topology, scenario, revealed, outcome],
  );

  const predict = useCallback(
    (prediction: Prediction) => {
      if (!outcome || revealed) return;
      const correct = prediction === outcome.outcome;
      setRevealed(true);
      setResult({
        correct,
        expected: t(`learning.resilience.predict.${outcome.outcome}`),
        explanation: t(scenario.lessonKey),
      });
      setTotalCount((value) => value + 1);
      if (correct) setCorrectCount((value) => value + 1);
    },
    [outcome, revealed, scenario.lessonKey, t],
  );

  const next = useCallback(() => {
    if (idx + 1 >= RESILIENCE_SCENARIOS.length) {
      setDone(true);
      return;
    }
    setIdx((value) => value + 1);
    setRevealed(false);
    setResult(null);
  }, [idx]);

  const restart = useCallback(() => {
    setIdx(0);
    setRevealed(false);
    setResult(null);
    setCorrectCount(0);
    setTotalCount(0);
    setDone(false);
  }, []);

  if (done) {
    return (
      <DrillFrame idPrefix="resilience-lab">
        <div data-testid="resilience-lab-summary" style={drillCardStyle}>
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
            data-testid="resilience-lab-score"
            style={{ fontSize: 28, fontWeight: 800, color: 'var(--netlab-text-primary)' }}
          >
            {correctCount} / {totalCount}
          </div>
          <p style={{ margin: 0, color: 'var(--netlab-text-secondary)', fontSize: 14 }}>
            {t('learning.resilience.summary.lesson')}
          </p>
          <button
            type="button"
            data-testid="resilience-lab-restart"
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
    <DrillFrame idPrefix="resilience-lab">
      <div style={{ ...drillCardStyle, maxWidth: 760 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0, color: 'var(--netlab-text-primary)', fontSize: 18 }}>
            {t('learning.resilience.title')}
          </h2>
          <span
            data-testid="resilience-lab-progress"
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 13,
              color: 'var(--netlab-text-secondary)',
            }}
          >
            {t('learning.resilience.label', {
              current: idx + 1,
              total: RESILIENCE_SCENARIOS.length,
              dst: scenario.flow.dstIp,
            })}
          </span>
        </div>

        <ConceptCallout idPrefix="resilience-lab" title={t('learning.resilience.primer.title')}>
          {t('learning.resilience.primer.body')}
        </ConceptCallout>

        <p
          ref={promptRef}
          tabIndex={-1}
          data-testid="resilience-lab-prompt"
          style={{
            margin: 0,
            color: 'var(--netlab-text-primary)',
            fontSize: 16,
            lineHeight: 1.5,
            outline: 'none',
          }}
        >
          {t('learning.resilience.break', {
            what: t(scenario.failureKey),
            dst: scenario.flow.dstIp,
          })}
        </p>

        <div
          ref={canvasRef}
          data-testid="resilience-lab-canvas"
          // Visual aid only — the prompt, predictions and outcome describe it in
          // text; hide the node/edge jumble from assistive tech.
          aria-hidden="true"
          style={{
            height: 380,
            border: '1px solid var(--netlab-learning-surface-border)',
            borderRadius: 'var(--netlab-radius-md)',
            overflow: 'hidden',
          }}
        >
          <NetlabProvider key={scenario.id} topology={viewTopology}>
            <NetlabCanvas
              followTopology
              minimap={false}
              controls={false}
              interactiveGraph={false}
              fitViewPadding={0.3}
            />
          </NetlabProvider>
        </div>

        {!revealed && (
          <div
            role="group"
            aria-label={t('learning.resilience.title')}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
          >
            <button
              type="button"
              data-testid="resilience-lab-predict-survived"
              onClick={() => predict('survived')}
              disabled={outcome === null}
              style={{ ...pillButton('var(--netlab-accent-green)'), opacity: outcome ? 1 : 0.5 }}
            >
              {t('learning.resilience.predict.survived')}
            </button>
            <button
              type="button"
              data-testid="resilience-lab-predict-dropped"
              onClick={() => predict('dropped')}
              disabled={outcome === null}
              style={{ ...pillButton('var(--netlab-accent-red)'), opacity: outcome ? 1 : 0.5 }}
            >
              {t('learning.resilience.predict.dropped')}
            </button>
          </div>
        )}

        <DrillFeedback idPrefix="resilience-lab" result={result} />

        {revealed && outcome && (
          <div
            data-testid="resilience-lab-outcome"
            role="status"
            style={{
              borderRadius: 'var(--netlab-radius-md)',
              padding: '12px 14px',
              background: `color-mix(in srgb, ${
                outcome.outcome === 'survived'
                  ? 'var(--netlab-accent-green)'
                  : 'var(--netlab-accent-red)'
              } 12%, var(--netlab-bg-surface))`,
              color: 'var(--netlab-text-primary)',
              fontSize: 15,
              lineHeight: 1.5,
              display: 'grid',
              gap: 10,
            }}
          >
            <span>
              {outcome.outcome === 'survived'
                ? t('learning.resilience.outcome.survived', { dst: scenario.flow.dstIp })
                : t('learning.resilience.outcome.dropped', {
                    node: labels.get(outcome.endNodeId) ?? outcome.endNodeId,
                    reason: outcome.dropReason ?? 'unknown',
                  })}
            </span>
            <button
              type="button"
              data-testid="resilience-lab-next"
              onClick={next}
              style={{ ...pillButton('var(--netlab-accent-blue)'), justifySelf: 'start' }}
            >
              {idx + 1 >= RESILIENCE_SCENARIOS.length
                ? t('learning.drill.seeResults')
                : t('learning.resilience.next')}
            </button>
          </div>
        )}
      </div>
    </DrillFrame>
  );
}
