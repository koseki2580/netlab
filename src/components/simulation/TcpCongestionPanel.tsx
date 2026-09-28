import { memo, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import type { TcpCongestionEvent, TcpCongestionPhase } from '../../types/tcp-congestion';

/** The slow-start threshold in effect from `stepIndex` on. */
export interface TcpSsthreshSample {
  readonly stepIndex: number;
  readonly ssthresh: number;
}

interface TcpCongestionPanelProps {
  readonly events: readonly TcpCongestionEvent[];
  /**
   * ssthresh as the sender changed it. The events carry no ssthresh, so the
   * chart only draws and reads it out when the caller supplies it.
   */
  readonly ssthreshByStep?: readonly TcpSsthreshSample[];
}

/** The sender's state once every event of one step has happened. */
interface StepSample {
  readonly stepIndex: number;
  readonly cwnd: number;
  readonly inflight: number;
  readonly ssthresh: number | null;
  readonly phase: TcpCongestionPhase;
}

const NO_SSTHRESH: readonly TcpSsthreshSample[] = [];

// Drawn narrow and scaled up, so the labels stay legible on a phone.
const WIDTH = 440;
const HEIGHT = 220;
const DISPLAY_MAX_WIDTH = 560;
const PAD_LEFT = 44;
const PAD_RIGHT = 16;
const PAD_TOP = 26;
const PAD_BOTTOM = 36;
const PLOT_WIDTH = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = HEIGHT - PAD_TOP - PAD_BOTTOM;

const PHASE_LABEL_KEYS: Record<TcpCongestionPhase, string> = {
  'slow-start': 'simulation.tcp.phase.slowStart',
  'congestion-avoidance': 'simulation.tcp.phase.congestionAvoidance',
  'fast-recovery': 'simulation.tcp.phase.fastRecovery',
  rto: 'simulation.tcp.phase.rto',
};

const PHASE_COLORS: Record<TcpCongestionPhase, string> = {
  'slow-start': '#16a34a',
  'congestion-avoidance': 'var(--netlab-accent-blue)',
  'fast-recovery': '#ca8a04',
  rto: 'var(--netlab-accent-red)',
};

/**
 * One sample per step, in step order, starting from the state before the
 * first step. The trace is logged in the order the sender acted, which is not
 * always step order — a burst labelled step 6 is logged between the step-7 and
 * step-8 duplicate ACKs — so drawing it event by event ran the lines backwards.
 */
function buildSamples(
  events: readonly TcpCongestionEvent[],
  ssthreshByStep: readonly TcpSsthreshSample[],
): StepSample[] {
  if (events.length === 0) return [];

  const ordered = [...events].sort((a, b) => a.stepIndex - b.stepIndex);
  const ssthreshOrdered = [...ssthreshByStep].sort((a, b) => a.stepIndex - b.stepIndex);
  const firstUpdate = events.find((event) => event.type === 'cwnd-update');
  const firstPhaseChange = events.find((event) => event.type === 'phase-change');

  // The first update's `prev` is the initial window: plotting 0 there drew a
  // sender that starts with nothing it may send.
  let cwnd = firstUpdate?.type === 'cwnd-update' ? firstUpdate.prev : 0;
  let phase: TcpCongestionPhase =
    firstPhaseChange?.type === 'phase-change' ? firstPhaseChange.from : 'slow-start';
  let outstanding: { seq: number; bytes: number }[] = [];

  const ssthreshAt = (step: number): number | null => {
    let value: number | null = null;
    for (const sample of ssthreshOrdered) {
      if (sample.stepIndex <= step) value = sample.ssthresh;
    }
    return value;
  };
  const snapshot = (stepIndex: number): StepSample => ({
    stepIndex,
    cwnd,
    inflight: outstanding.reduce((sum, segment) => sum + segment.bytes, 0),
    ssthresh: ssthreshAt(stepIndex),
    phase,
  });

  const samples: StepSample[] = [];
  if ((ordered[0]?.stepIndex ?? 0) > 0) samples.push(snapshot(0));

  for (let index = 0; index < ordered.length; index += 1) {
    const event = ordered[index];
    if (!event) continue;
    if (event.type === 'phase-change') phase = event.to;
    if (event.type === 'cwnd-update') cwnd = event.next;
    if (event.type === 'segment-sent') outstanding.push({ seq: event.seq, bytes: event.bytes });
    if (event.type === 'ack-received') {
      outstanding = outstanding.filter((segment) => segment.seq + segment.bytes > event.ackNo);
    }
    // The timer fired: nothing sent before it is still counted as out.
    if (event.type === 'rto-fire') outstanding = [];

    if (ordered[index + 1]?.stepIndex !== event.stepIndex) samples.push(snapshot(event.stepIndex));
  }

  return samples;
}

/** 1, 2 or 5 times a power of ten, at least `raw`. */
function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  for (const multiple of [1, 2, 5, 10]) {
    if (multiple * power >= raw) return multiple * power;
  }
  return 10 * power;
}

function eventLabel(event: TcpCongestionEvent, t: ReturnType<typeof useI18n>['t']): string {
  switch (event.type) {
    case 'phase-change':
      return t('simulation.tcp.event.phaseChange', { phase: t(PHASE_LABEL_KEYS[event.to]) });
    case 'fast-retransmit':
      return t('simulation.tcp.event.fastRetransmit', { seq: event.seq });
    case 'rto-fire':
      return t('simulation.tcp.event.rtoFire', { seq: event.seq });
    default:
      return event.type;
  }
}

export const TcpCongestionPanel = memo(function TcpCongestionPanel({
  events,
  ssthreshByStep = NO_SSTHRESH,
}: TcpCongestionPanelProps) {
  const { t } = useI18n();
  const samples = useMemo(() => buildSamples(events, ssthreshByStep), [events, ssthreshByStep]);
  // The chosen step belongs to one run: a new trace opens on its final step.
  const [selection, setSelection] = useState<{
    readonly events: readonly TcpCongestionEvent[];
    readonly index: number;
  } | null>(null);
  const lastIndex = samples.length - 1;
  const selectedIndex =
    selection && selection.events === events ? Math.min(selection.index, lastIndex) : lastIndex;
  const selected = samples[selectedIndex] ?? null;
  const markerEvents = events.filter(
    (event) =>
      event.type === 'phase-change' ||
      event.type === 'fast-retransmit' ||
      event.type === 'rto-fire',
  );

  const maxStep = Math.max(1, samples[lastIndex]?.stepIndex ?? 1);
  const maxValue = Math.max(
    1,
    ...samples.flatMap((sample) => [sample.cwnd, sample.inflight, sample.ssthresh ?? 0]),
  );
  const tickStep = niceStep(maxValue / 5);
  const top = Math.ceil(maxValue / tickStep) * tickStep;
  const yTicks = Array.from({ length: top / tickStep + 1 }, (_, index) => index * tickStep);
  const xLabelEvery = Math.max(1, Math.ceil(samples.length / 14));
  const xOf = (step: number) => PAD_LEFT + (step / maxStep) * PLOT_WIDTH;
  const yOf = (bytes: number) => PAD_TOP + PLOT_HEIGHT - (bytes / top) * PLOT_HEIGHT;
  const line = (value: (sample: StepSample) => number) =>
    samples
      .map((sample) => `${xOf(sample.stepIndex).toFixed(1)},${yOf(value(sample)).toFixed(1)}`)
      .join(' ');
  // ssthresh holds until the step that changes it, so it is drawn as steps.
  const ssthreshLine = samples
    .flatMap((sample, index) => {
      if (sample.ssthresh === null) return [];
      const x = xOf(sample.stepIndex).toFixed(1);
      const previous = samples[index - 1]?.ssthresh;
      const corner =
        previous !== undefined && previous !== null && previous !== sample.ssthresh
          ? [`${x},${yOf(previous).toFixed(1)}`]
          : [];
      return [...corner, `${x},${yOf(sample.ssthresh).toFixed(1)}`];
    })
    .join(' ');
  const describe = (sample: StepSample) =>
    [
      t('simulation.tcp.step', { step: sample.stepIndex }),
      t(PHASE_LABEL_KEYS[sample.phase]),
      `cwnd ${sample.cwnd} B`,
      ...(sample.ssthresh === null ? [] : [`ssthresh ${sample.ssthresh} B`]),
      `${t('simulation.tcp.inflight')} ${sample.inflight} B`,
    ].join(' · ');

  return (
    <section
      aria-label={t('simulation.tcp.aria')}
      style={{
        background: 'var(--netlab-bg-panel)',
        border: '1px solid var(--netlab-border-subtle)',
        borderRadius: 8,
        padding: 12,
        color: 'var(--netlab-text-primary)',
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{
          color: 'var(--netlab-text-muted)',
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 1,
          marginBottom: 10,
        }}
      >
        {t('simulation.tcp.heading')}
      </div>

      {events.length === 0 || !selected ? (
        <p
          data-testid="tcp-congestion-empty"
          style={{ margin: 0, color: 'var(--netlab-text-secondary)', fontSize: 12 }}
        >
          {t('simulation.tcp.empty')}
        </p>
      ) : (
        <>
          <div
            data-testid="tcp-congestion-readout"
            aria-live="polite"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              alignItems: 'center',
              marginBottom: 8,
              fontSize: 12,
            }}
          >
            <span style={{ color: 'var(--netlab-text-secondary)' }}>
              {t('simulation.tcp.stepOf', {
                step: selected.stepIndex,
                last: samples[lastIndex]?.stepIndex ?? 0,
              })}
            </span>
            <span style={{ color: PHASE_COLORS[selected.phase], fontWeight: 'bold' }}>
              {t(PHASE_LABEL_KEYS[selected.phase])}
            </span>
            <span style={{ color: 'var(--netlab-text-secondary)' }}>
              cwnd{' '}
              <strong style={{ color: 'var(--netlab-text-primary)' }}>{selected.cwnd} B</strong>
            </span>
            {selected.ssthresh === null ? null : (
              <span style={{ color: 'var(--netlab-text-secondary)' }}>
                ssthresh{' '}
                <strong style={{ color: 'var(--netlab-text-primary)' }}>
                  {selected.ssthresh} B
                </strong>
              </span>
            )}
            <span style={{ color: 'var(--netlab-text-secondary)' }}>
              {t('simulation.tcp.inflight')}{' '}
              <strong style={{ color: 'var(--netlab-text-primary)' }}>{selected.inflight} B</strong>
            </span>
          </div>

          <input
            type="range"
            data-testid="tcp-congestion-step"
            aria-label={t('simulation.tcp.stepSlider')}
            aria-valuetext={t('simulation.tcp.step', { step: selected.stepIndex })}
            min={0}
            max={lastIndex}
            step={1}
            value={selectedIndex}
            onChange={(event) => setSelection({ events, index: Number(event.currentTarget.value) })}
            style={{
              width: '100%',
              maxWidth: DISPLAY_MAX_WIDTH,
              display: 'block',
              marginBottom: 8,
            }}
          />

          <svg
            role="img"
            aria-label={t('simulation.tcp.chart')}
            data-testid="tcp-congestion-chart"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            style={{
              width: '100%',
              maxWidth: DISPLAY_MAX_WIDTH,
              display: 'block',
              background: 'var(--netlab-bg-surface)',
              border: '1px solid var(--netlab-border-subtle)',
              borderRadius: 6,
            }}
          >
            <title>{t('simulation.tcp.chart')}</title>
            {yTicks.map((bytes) => (
              <g key={`y-${bytes}`}>
                <line
                  x1={PAD_LEFT}
                  x2={WIDTH - PAD_RIGHT}
                  y1={yOf(bytes)}
                  y2={yOf(bytes)}
                  stroke="var(--netlab-border-subtle)"
                  strokeWidth={bytes === 0 ? 0 : 1}
                />
                <text
                  data-testid="tcp-congestion-ytick"
                  x={PAD_LEFT - 6}
                  y={yOf(bytes)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={12}
                  fill="var(--netlab-text-secondary)"
                >
                  {bytes}
                </text>
              </g>
            ))}
            {samples.map((sample, index) =>
              index % xLabelEvery === 0 || index === lastIndex ? (
                <text
                  key={`x-${sample.stepIndex}`}
                  x={xOf(sample.stepIndex)}
                  y={HEIGHT - PAD_BOTTOM + 14}
                  textAnchor="middle"
                  fontSize={12}
                  fill="var(--netlab-text-secondary)"
                >
                  {sample.stepIndex}
                </text>
              ) : null,
            )}
            <text
              x={PAD_LEFT - 6}
              y={12}
              textAnchor="end"
              fontSize={11}
              fill="var(--netlab-text-muted)"
            >
              {/* Above the top tick, so it names the axis without hiding a value. */}
              {t('simulation.tcp.axisBytes')}
            </text>
            <text
              x={PAD_LEFT + PLOT_WIDTH / 2}
              y={HEIGHT - 6}
              textAnchor="middle"
              fontSize={11}
              fill="var(--netlab-text-muted)"
            >
              {t('simulation.tcp.axisStep')}
            </text>
            <line
              x1={PAD_LEFT}
              y1={PAD_TOP + PLOT_HEIGHT}
              x2={WIDTH - PAD_RIGHT}
              y2={PAD_TOP + PLOT_HEIGHT}
              stroke="var(--netlab-border-strong)"
            />
            <line
              x1={PAD_LEFT}
              y1={PAD_TOP}
              x2={PAD_LEFT}
              y2={PAD_TOP + PLOT_HEIGHT}
              stroke="var(--netlab-border-strong)"
            />
            <line
              data-testid="tcp-congestion-marker"
              x1={xOf(selected.stepIndex)}
              x2={xOf(selected.stepIndex)}
              y1={PAD_TOP}
              y2={PAD_TOP + PLOT_HEIGHT}
              stroke="var(--netlab-text-muted)"
              strokeWidth={1.5}
            />
            {ssthreshLine ? (
              <polyline
                data-testid="tcp-congestion-ssthresh-line"
                points={ssthreshLine}
                fill="none"
                stroke="var(--netlab-text-muted)"
                strokeWidth={1.5}
                strokeDasharray="2 3"
              />
            ) : null}
            <polyline
              data-testid="tcp-congestion-inflight-line"
              points={line((sample) => sample.inflight)}
              fill="none"
              stroke="var(--netlab-accent-orange)"
              strokeWidth={2}
              strokeDasharray="5 4"
            />
            <polyline
              data-testid="tcp-congestion-cwnd-line"
              points={line((sample) => sample.cwnd)}
              fill="none"
              stroke="var(--netlab-accent-cyan)"
              strokeWidth={3}
            />
            {samples.map((sample, index) => (
              <circle
                key={sample.stepIndex}
                data-testid={`tcp-congestion-point-${sample.stepIndex}`}
                cx={xOf(sample.stepIndex)}
                cy={yOf(sample.cwnd)}
                r={index === selectedIndex ? 6 : 3.5}
                fill={PHASE_COLORS[sample.phase]}
                stroke={index === selectedIndex ? 'var(--netlab-text-primary)' : 'none'}
                strokeWidth={1.5}
              >
                <title>{describe(sample)}</title>
              </circle>
            ))}
          </svg>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              marginTop: 8,
              fontSize: 11,
            }}
          >
            <span style={{ color: 'var(--netlab-accent-cyan)' }}>━ cwnd</span>
            {ssthreshLine ? (
              <span style={{ color: 'var(--netlab-text-secondary)' }}>┄ ssthresh</span>
            ) : null}
            <span style={{ color: 'var(--netlab-accent-orange)' }}>
              ╌ {t('simulation.tcp.inflight')}
            </span>
          </div>

          {markerEvents.length > 0 ? (
            <ol
              style={{
                margin: '8px 0 0',
                paddingLeft: 18,
                color: 'var(--netlab-text-secondary)',
                fontSize: 11,
              }}
            >
              {markerEvents.map((event, index) => (
                <li
                  key={`${event.type}-${event.stepIndex}-${index}`}
                  // Keyed by step AND type: one step can carry more than one
                  // event, and a step-only id makes two elements share a name.
                  data-testid={`tcp-congestion-event-${event.stepIndex}-${event.type}`}
                >
                  {t('simulation.tcp.marker', {
                    step: event.stepIndex,
                    event: eventLabel(event, t),
                  })}
                </li>
              ))}
            </ol>
          ) : null}
        </>
      )}
    </section>
  );
});
