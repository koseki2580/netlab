import { memo, useMemo } from 'react';
import type { TcpCongestionEvent, TcpCongestionPhase } from '../../types/tcp-congestion';

interface TcpCongestionPanelProps {
  readonly events: readonly TcpCongestionEvent[];
}

interface TimelineSample {
  readonly stepIndex: number;
  readonly cwnd: number;
  readonly inflight: number;
  readonly phase: TcpCongestionPhase;
  readonly eventType: TcpCongestionEvent['type'];
}

const WIDTH = 520;
const HEIGHT = 180;
const PADDING = 28;

const PHASE_LABELS: Record<TcpCongestionPhase, string> = {
  'slow-start': 'Slow Start',
  'congestion-avoidance': 'Congestion Avoidance',
  'fast-recovery': 'Fast Recovery',
  rto: 'RTO',
};

const PHASE_COLORS: Record<TcpCongestionPhase, string> = {
  'slow-start': '#16a34a',
  'congestion-avoidance': '#2563eb',
  'fast-recovery': '#ca8a04',
  rto: '#f87171',
};

function buildSamples(events: readonly TcpCongestionEvent[]): TimelineSample[] {
  let cwnd = 0;
  let inflight = 0;
  let phase: TcpCongestionPhase = 'slow-start';

  return events.map((event) => {
    if (event.type === 'phase-change') {
      phase = event.to;
    }
    if (event.type === 'cwnd-update') {
      cwnd = event.next;
    }
    if (event.type === 'segment-sent') {
      inflight += event.bytes;
    }
    if (event.type === 'ack-received') {
      inflight = 0;
    }
    if (event.type === 'rto-fire') {
      inflight = 0;
    }

    return {
      stepIndex: event.stepIndex,
      cwnd,
      inflight,
      phase,
      eventType: event.type,
    };
  });
}

function polyline(
  points: readonly TimelineSample[],
  getValue: (sample: TimelineSample) => number,
): string {
  if (points.length === 0) {
    return '';
  }

  const maxStep = Math.max(1, ...points.map((sample) => sample.stepIndex));
  const maxValue = Math.max(1, ...points.map((sample) => getValue(sample)));
  const plotWidth = WIDTH - PADDING * 2;
  const plotHeight = HEIGHT - PADDING * 2;

  return points
    .map((sample) => {
      const x = PADDING + (sample.stepIndex / maxStep) * plotWidth;
      const y = HEIGHT - PADDING - (getValue(sample) / maxValue) * plotHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function latestSample(samples: readonly TimelineSample[]): TimelineSample | null {
  return samples[samples.length - 1] ?? null;
}

export const TcpCongestionPanel = memo(function TcpCongestionPanel({
  events,
}: TcpCongestionPanelProps) {
  const samples = useMemo(() => buildSamples(events), [events]);
  const latest = latestSample(samples);
  const phase = latest?.phase ?? 'slow-start';
  const markerEvents = events.filter(
    (event) =>
      event.type === 'phase-change' ||
      event.type === 'fast-retransmit' ||
      event.type === 'rto-fire',
  );

  return (
    <section
      aria-label="TCP congestion"
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
        TCP CONGESTION
      </div>

      {events.length === 0 ? (
        <p
          data-testid="tcp-congestion-empty"
          style={{ margin: 0, color: 'var(--netlab-text-secondary)', fontSize: 12 }}
        >
          No congestion events
        </p>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              alignItems: 'center',
              marginBottom: 10,
              fontSize: 12,
            }}
          >
            <span style={{ color: PHASE_COLORS[phase], fontWeight: 'bold' }}>
              {PHASE_LABELS[phase]}
            </span>
            <span style={{ color: 'var(--netlab-text-secondary)' }}>
              cwnd{' '}
              <strong style={{ color: 'var(--netlab-text-primary)' }}>{latest?.cwnd ?? 0} B</strong>
            </span>
            <span style={{ color: 'var(--netlab-text-secondary)' }}>
              inflight{' '}
              <strong style={{ color: 'var(--netlab-text-primary)' }}>
                {latest?.inflight ?? 0} B
              </strong>
            </span>
          </div>

          <svg
            role="img"
            aria-label="TCP congestion window timeline"
            data-testid="tcp-congestion-chart"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            style={{
              width: '100%',
              maxWidth: WIDTH,
              display: 'block',
              background: 'var(--netlab-bg-surface)',
              border: '1px solid var(--netlab-border-subtle)',
              borderRadius: 6,
            }}
          >
            <title>TCP congestion window timeline</title>
            <line
              x1={PADDING}
              y1={HEIGHT - PADDING}
              x2={WIDTH - PADDING}
              y2={HEIGHT - PADDING}
              stroke="var(--netlab-border-strong)"
            />
            <line
              x1={PADDING}
              y1={PADDING}
              x2={PADDING}
              y2={HEIGHT - PADDING}
              stroke="var(--netlab-border-strong)"
            />
            <polyline
              points={polyline(samples, (sample) => sample.cwnd)}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={3}
            />
            <polyline
              points={polyline(samples, (sample) => sample.inflight)}
              fill="none"
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="5 4"
            />
            {samples.map((sample) => (
              <circle
                key={`${sample.stepIndex}-${sample.eventType}-${sample.cwnd}-${sample.inflight}`}
                cx={
                  PADDING +
                  (sample.stepIndex / Math.max(1, latest?.stepIndex ?? 1)) * (WIDTH - PADDING * 2)
                }
                cy={HEIGHT - PADDING}
                r={3}
                fill={PHASE_COLORS[sample.phase]}
              >
                <title>{`${PHASE_LABELS[sample.phase]} step ${sample.stepIndex}: ${sample.eventType}`}</title>
              </circle>
            ))}
          </svg>

          <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11 }}>
            <span style={{ color: '#38bdf8' }}>cwnd</span>
            <span style={{ color: '#f97316' }}>inflight</span>
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
                  step {event.stepIndex}: {event.type}
                </li>
              ))}
            </ol>
          ) : null}
        </>
      )}
    </section>
  );
});
