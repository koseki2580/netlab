import { useCallback, useEffect, useMemo, useState } from 'react';
import { HookEngine } from '../../hooks/HookEngine';
import { useI18n } from '../../i18n/useI18n';
import {
  JOURNEY_FLOWS,
  buildJourney,
  buildJourneyTopology,
  journeyProbe,
  journeyTopologyView,
} from '../../learning/packet-journey';
import type { PacketJourney } from '../../learning/packet-journey';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { NetlabCanvas } from '../NetlabCanvas';
import { NetlabProvider } from '../NetlabProvider';
import {
  ConceptCallout,
  DrillFeedback,
  DrillFrame,
  drillCardStyle,
  pillButton,
  useDrillCompletion,
  useFocusWhen,
} from './drillKit';
import type { DrillResult } from './drillKit';

/**
 * Predict-then-observe: a real packet, simulated by the actual netlab engine,
 * crosses the network step by step. At each router the learner predicts the
 * next hop (clicking the node on the canvas or a button); the engine's
 * precomputed trace grades the prediction and its own routing decision is
 * surfaced as the explanation. The simulator itself is the teacher.
 *
 * Requires the l2/l3 layer plugins to be registered (the demo entry and the
 * README quick start both do this).
 */
export function PacketJourneyPanel() {
  const { t } = useI18n();
  const topology = useMemo(() => buildJourneyTopology(), []);
  const labels = useMemo(
    () => new Map(topology.nodes.map((node) => [node.id, String(node.data.label ?? node.id)])),
    [topology],
  );

  const [flowIdx, setFlowIdx] = useState(0);
  const [journey, setJourney] = useState<PacketJourney | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [result, setResult] = useState<DrillResult | null>(null);
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [done, setDone] = useState(false);

  const flow = JOURNEY_FLOWS[flowIdx % JOURNEY_FLOWS.length] ?? JOURNEY_FLOWS[0]!;
  const summaryRef = useFocusWhen<HTMLHeadingElement>(done);
  useDrillCompletion('packet-journey-drill', 'Packet Journey', done, correctCount, totalCount);

  // The real engine precomputes the truth for the current journey.
  useEffect(() => {
    let cancelled = false;
    const engine = new SimulationEngine(buildJourneyTopology(), new HookEngine());
    void engine.precompute(journeyProbe(flow)).then((trace) => {
      if (!cancelled) setJourney(buildJourney(flow, trace, topology));
    });
    return () => {
      cancelled = true;
    };
  }, [flow, topology]);

  const step = journey?.steps[stepIdx] ?? null;
  const journeyComplete = journey !== null && stepIdx >= journey.steps.length;

  const viewTopology = useMemo(() => {
    if (!journey) return topology;
    const revealed = stepIdx + (result ? 1 : 0);
    return journeyTopologyView(
      topology,
      journey,
      revealed,
      wrongPick && step ? { fromNodeId: step.nodeId, toNodeId: wrongPick } : undefined,
    );
  }, [journey, topology, stepIdx, result, wrongPick, step]);

  const predict = useCallback(
    (nodeId: string) => {
      if (!step || result) return;
      const correct = nodeId === step.correctNodeId;
      const engineLine = step.hop.routingDecision?.explanation;
      setResult({
        correct,
        expected: labels.get(step.correctNodeId) ?? step.correctNodeId,
        explanation: engineLine
          ? t('learning.journey.engineSays', { explanation: engineLine })
          : '',
      });
      setWrongPick(correct ? null : nodeId);
      setTotalCount((value) => value + 1);
      if (correct) setCorrectCount((value) => value + 1);
    },
    [labels, result, step, t],
  );

  const handleNodeSelect = useCallback(
    (nodeId: string | null) => {
      if (nodeId && step?.options.includes(nodeId)) predict(nodeId);
    },
    [predict, step],
  );

  const advance = useCallback(() => {
    if (!result) return;
    setResult(null);
    setWrongPick(null);
    setStepIdx((value) => value + 1);
  }, [result]);

  const nextJourney = useCallback(() => {
    if (flowIdx + 1 >= JOURNEY_FLOWS.length) {
      setDone(true);
      return;
    }
    setFlowIdx((value) => value + 1);
    setJourney(null);
    setStepIdx(0);
    setResult(null);
    setWrongPick(null);
  }, [flowIdx]);

  const restart = useCallback(() => {
    setFlowIdx(0);
    setJourney(null);
    setStepIdx(0);
    setResult(null);
    setWrongPick(null);
    setCorrectCount(0);
    setTotalCount(0);
    setDone(false);
  }, []);

  if (done) {
    return (
      <DrillFrame idPrefix="packet-journey">
        <div data-testid="packet-journey-summary" style={drillCardStyle}>
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
            data-testid="packet-journey-score"
            style={{ fontSize: 28, fontWeight: 800, color: 'var(--netlab-text-primary)' }}
          >
            {correctCount} / {totalCount}
          </div>
          <p style={{ margin: 0, color: 'var(--netlab-text-secondary)', fontSize: 14 }}>
            {t('learning.journey.summary.lesson')}
          </p>
          <button
            type="button"
            data-testid="packet-journey-restart"
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
    <DrillFrame idPrefix="packet-journey">
      <div style={{ ...drillCardStyle, maxWidth: 760 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0, color: 'var(--netlab-text-primary)', fontSize: 18 }}>
            {t('learning.journey.title')}
          </h2>
          <span
            data-testid="packet-journey-progress"
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 13,
              color: 'var(--netlab-text-secondary)',
            }}
          >
            {t('learning.journey.label', {
              current: flowIdx + 1,
              total: JOURNEY_FLOWS.length,
              dst: flow.dstIp,
            })}
          </span>
        </div>

        <ConceptCallout idPrefix="packet-journey" title={t('learning.journey.primer.title')}>
          {t('learning.journey.primer.body')}
        </ConceptCallout>

        <div
          data-testid="packet-journey-canvas"
          style={{
            height: 380,
            border: '1px solid var(--netlab-learning-surface-border)',
            borderRadius: 'var(--netlab-radius-md)',
            overflow: 'hidden',
          }}
        >
          <NetlabProvider key={flow.id} topology={viewTopology}>
            <NetlabCanvas onNodeSelect={handleNodeSelect} />
          </NetlabProvider>
        </div>

        {step && !journeyComplete && (
          <>
            <p
              data-testid="packet-journey-prompt"
              style={{
                margin: 0,
                color: 'var(--netlab-text-primary)',
                fontSize: 16,
                lineHeight: 1.5,
              }}
            >
              {t('learning.journey.prompt', { node: labels.get(step.nodeId) ?? step.nodeId })}
            </p>

            <div
              role="group"
              aria-label={t('learning.route.answerGroup')}
              style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
            >
              {step.options.map((nodeId) => {
                const isWinner = result !== null && nodeId === step.correctNodeId;
                const isWrong = result !== null && wrongPick === nodeId;
                const accent = isWinner
                  ? 'var(--netlab-accent-green)'
                  : isWrong
                    ? 'var(--netlab-accent-red)'
                    : 'var(--netlab-accent-blue)';
                const label = labels.get(nodeId) ?? nodeId;
                return (
                  <button
                    key={nodeId}
                    type="button"
                    data-testid={`packet-journey-answer-${nodeId}`}
                    onClick={() => predict(nodeId)}
                    disabled={result !== null}
                    style={{
                      ...pillButton(accent),
                      opacity: result !== null && !isWinner && !isWrong ? 0.4 : 1,
                    }}
                  >
                    {isWinner ? `✓ ${label}` : isWrong ? `✗ ${label}` : label}
                  </button>
                );
              })}
              <button
                type="button"
                data-testid="packet-journey-advance"
                onClick={advance}
                disabled={result === null}
                style={{ ...pillButton('var(--netlab-accent-green)'), opacity: result ? 1 : 0.5 }}
              >
                {t('learning.drill.next')}
              </button>
            </div>

            <DrillFeedback idPrefix="packet-journey" result={result} />
          </>
        )}

        {journeyComplete && journey && (
          <div
            data-testid="packet-journey-outcome"
            role="status"
            style={{
              borderRadius: 'var(--netlab-radius-md)',
              padding: '12px 14px',
              background: `color-mix(in srgb, ${
                journey.outcome === 'delivered'
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
              {journey.outcome === 'delivered'
                ? t('learning.journey.outcome.delivered', { dst: flow.dstIp })
                : t('learning.journey.outcome.dropped', {
                    reason: journey.dropReason ?? 'unknown',
                  })}
            </span>
            <button
              type="button"
              data-testid="packet-journey-next"
              onClick={nextJourney}
              style={{ ...pillButton('var(--netlab-accent-blue)'), justifySelf: 'start' }}
            >
              {flowIdx + 1 >= JOURNEY_FLOWS.length
                ? t('learning.drill.seeResults')
                : t('learning.journey.nextJourney')}
            </button>
          </div>
        )}
      </div>
    </DrillFrame>
  );
}
