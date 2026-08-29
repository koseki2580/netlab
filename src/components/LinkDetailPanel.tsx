import { useContext, useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { LinkQosConfig, LinkShaperConfig } from '../types/link';
import type { NetlabEdge } from '../types/topology';
import { SimulationContext, type SimulationContextValue } from '../simulation/SimulationContext';
import { SandboxContext } from '../sandbox/SandboxContext';

const FIELD_STYLE: CSSProperties = {
  display: 'grid',
  gap: 4,
  marginTop: 8,
};

const INPUT_STYLE: CSSProperties = {
  background: 'var(--netlab-bg-panel)',
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 6,
  color: 'var(--netlab-text-primary)',
  padding: '5px 6px',
};

const BUTTON_STYLE: CSSProperties = {
  marginTop: 10,
  background: 'var(--netlab-accent-cyan)',
  border: '1px solid var(--netlab-accent-cyan)',
  borderRadius: 6,
  color: 'var(--netlab-bg-primary)',
  cursor: 'pointer',
  fontWeight: 700,
  padding: '6px 10px',
};

function numberInputValue(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? '' : String(value);
}

function optionalNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function traceCounters(edgeId: string, simulation: SimulationContextValue | null) {
  const counters = {
    queued: 0,
    dequeued: 0,
    dropped: 0,
    queueFull: 0,
    loss: 0,
    linkFailed: 0,
  };

  for (const trace of simulation?.state.traces ?? []) {
    for (const hop of trace.hops) {
      if (hop.linkQos?.edgeId !== edgeId) continue;
      if (hop.action === 'link:enqueued') counters.queued = hop.linkQos.queueDepth;
      if (hop.action === 'link:dequeued') counters.dequeued += 1;
      if (hop.action === 'link:dropped') {
        counters.dropped += 1;
        if (hop.linkQos.reason === 'queue-full') counters.queueFull += 1;
        if (hop.linkQos.reason === 'loss') counters.loss += 1;
        if (hop.linkQos.reason === 'link-failed') counters.linkFailed += 1;
      }
      if (hop.action === 'link:arrived') counters.queued = hop.linkQos.queueDepth;
    }
  }

  return counters;
}

function shaperCounters(edgeId: string, simulation: SimulationContextValue | null) {
  const counters = new Map<string, { queued: number; dequeued: number; dropped: number }>();
  for (const trace of simulation?.state.traces ?? []) {
    for (const hop of trace.hops) {
      if (hop.shaperTrace?.edgeId !== edgeId) continue;
      const current = counters.get(hop.shaperTrace.classId) ?? {
        queued: 0,
        dequeued: 0,
        dropped: 0,
      };
      if (hop.action === 'shaper:classified') {
        current.queued = hop.shaperTrace.queueDepth;
      } else if (hop.action === 'shaper:dequeued') {
        current.dequeued += 1;
        current.queued = hop.shaperTrace.queueDepth;
      } else if (hop.action === 'shaper:dropped') {
        current.dropped += 1;
      }
      counters.set(hop.shaperTrace.classId, current);
    }
  }
  return counters;
}

const DEFAULT_SHAPER: LinkShaperConfig = {
  classes: [
    { id: 'ef', dscp: [46], weightPct: 80, queueDepthSegments: 8 },
    { id: 'be', dscp: [], weightPct: 20, queueDepthSegments: 8, default: true },
  ],
};

function parseDscpList(value: string): number[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map(Number)
    .filter((entry) => Number.isInteger(entry));
}

function shaperText(config: LinkShaperConfig | undefined): string {
  return (config ?? DEFAULT_SHAPER).classes
    .map((klass) =>
      [
        klass.id,
        klass.weightPct,
        klass.queueDepthSegments,
        klass.default === true ? 'default' : 'class',
        klass.dscp.join(','),
      ].join(':'),
    )
    .join('\n');
}

function parseShaperText(value: string): LinkShaperConfig | null {
  const classes = value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [id, weight, depth, defaultMarker, dscpList = ''] = line.split(':');
      const weightPct = Number(weight);
      const queueDepthSegments = Number(depth);
      if (!id || !Number.isFinite(weightPct) || !Number.isFinite(queueDepthSegments)) {
        return null;
      }
      return {
        id,
        weightPct,
        queueDepthSegments,
        dscp: parseDscpList(dscpList),
        ...(defaultMarker === 'default' ? { default: true } : {}),
      };
    });

  if (classes.some((klass) => klass === null)) return null;
  return { classes: classes as LinkShaperConfig['classes'] };
}

function validateShaper(config: LinkShaperConfig | null): string[] {
  if (!config) return ['Use id:weight:queueDepth:class|default:dscp,dscp per line.'];
  const defaultCount = config.classes.filter((klass) => klass.default === true).length;
  const weightSum = config.classes.reduce((sum, klass) => sum + klass.weightPct, 0);
  const classIds = new Set<string>();
  const dscps = new Set<number>();
  const errors: string[] = [];

  if (defaultCount !== 1) errors.push('Mark exactly one class as the default.');
  if (weightSum < 99 || weightSum > 101) errors.push('Weights must sum to 100 +/- 1.');

  for (const klass of config.classes) {
    if (classIds.has(klass.id)) errors.push(`Class id ${klass.id} is duplicated.`);
    classIds.add(klass.id);
    if (klass.weightPct < 1 || klass.weightPct > 100) {
      errors.push(`${klass.id} weight must be 1..100.`);
    }
    if (klass.queueDepthSegments < 1) {
      errors.push(`${klass.id} queue depth must be at least 1.`);
    }
    for (const dscp of klass.dscp) {
      if (dscp < 0 || dscp > 63) errors.push(`DSCP ${dscp} must be in 0..63.`);
      if (dscps.has(dscp)) errors.push(`DSCP ${dscp} is in multiple classes.`);
      dscps.add(dscp);
    }
  }

  return errors;
}

export interface LinkDetailPanelProps {
  readonly edge: NetlabEdge;
  readonly onQosChange?: (config: LinkQosConfig) => void;
}

export function LinkDetailPanel({ edge, onQosChange }: LinkDetailPanelProps) {
  const sandbox = useContext(SandboxContext);
  const simulation = useContext(SimulationContext);
  const current = edge.data?.link ?? {};
  const [bandwidthBps, setBandwidthBps] = useState(numberInputValue(current.bandwidthBps));
  const [propagationDelayMs, setPropagationDelayMs] = useState(
    numberInputValue(current.propagationDelayMs),
  );
  const [lossPct, setLossPct] = useState(numberInputValue(current.lossPct));
  const [queueDepthSegments, setQueueDepthSegments] = useState(
    numberInputValue(current.queueDepthSegments),
  );
  const [lossSeed, setLossSeed] = useState(numberInputValue(current.lossSeed));
  const [infiniteQueue, setInfiniteQueue] = useState(current.queueDepthSegments === undefined);
  const [shaperDraft, setShaperDraft] = useState(shaperText(current.shaper));

  useEffect(() => {
    setBandwidthBps(numberInputValue(current.bandwidthBps));
    setPropagationDelayMs(numberInputValue(current.propagationDelayMs));
    setLossPct(numberInputValue(current.lossPct));
    setQueueDepthSegments(numberInputValue(current.queueDepthSegments));
    setLossSeed(numberInputValue(current.lossSeed));
    setInfiniteQueue(current.queueDepthSegments === undefined);
    setShaperDraft(shaperText(current.shaper));
  }, [
    current.bandwidthBps,
    current.lossPct,
    current.lossSeed,
    current.propagationDelayMs,
    current.queueDepthSegments,
    current.shaper,
  ]);

  const nextConfig = useMemo<LinkQosConfig>(() => {
    const config: {
      bandwidthBps?: number;
      propagationDelayMs?: number;
      lossPct?: number;
      queueDepthSegments?: number;
      lossSeed?: number;
    } = {};
    const bandwidth = optionalNumber(bandwidthBps);
    const delay = optionalNumber(propagationDelayMs);
    const loss = optionalNumber(lossPct);
    const queueDepth = optionalNumber(queueDepthSegments);
    const seed = optionalNumber(lossSeed);

    if (bandwidth !== undefined) config.bandwidthBps = bandwidth;
    if (delay !== undefined) config.propagationDelayMs = delay;
    if (loss !== undefined) config.lossPct = loss;
    if (!infiniteQueue && queueDepth !== undefined) config.queueDepthSegments = queueDepth;
    if (seed !== undefined) config.lossSeed = seed;
    return config;
  }, [bandwidthBps, infiniteQueue, lossPct, lossSeed, propagationDelayMs, queueDepthSegments]);
  const lossValue = nextConfig.lossPct ?? 0;
  const errors = [
    lossValue > 0 && nextConfig.lossSeed === undefined
      ? 'Set a loss seed; it makes drops reproducible.'
      : null,
    nextConfig.bandwidthBps !== undefined && nextConfig.bandwidthBps <= 0
      ? 'Bandwidth must be greater than 0.'
      : null,
    nextConfig.queueDepthSegments !== undefined && nextConfig.queueDepthSegments < 1
      ? 'Queue depth must be at least 1.'
      : null,
  ].filter((entry): entry is string => entry !== null);
  const counters = traceCounters(edge.id, simulation);
  const shaperConfig = useMemo(() => parseShaperText(shaperDraft), [shaperDraft]);
  const shaperErrors = validateShaper(shaperConfig);
  const classCounters = shaperCounters(edge.id, simulation);

  const apply = () => {
    if (errors.length > 0) return;
    sandbox?.pushEdit({
      kind: 'link.qos',
      target: { kind: 'edge', edgeId: edge.id },
      before: edge.data?.link ?? null,
      after: nextConfig,
    });
    onQosChange?.(nextConfig);
  };

  const applyShaper = () => {
    if (shaperErrors.length > 0 || shaperConfig === null) return;
    sandbox?.pushEdit({
      kind: 'link.shaper',
      target: { kind: 'edge', edgeId: edge.id },
      before: edge.data?.link?.shaper ?? null,
      after: shaperConfig,
    });
    onQosChange?.({ ...nextConfig, shaper: shaperConfig });
  };

  const clearShaper = () => {
    sandbox?.pushEdit({
      kind: 'link.shaper',
      target: { kind: 'edge', edgeId: edge.id },
      before: edge.data?.link?.shaper ?? null,
      after: null,
    });
    setShaperDraft(shaperText(undefined));
    onQosChange?.(nextConfig);
  };

  return (
    <section aria-label="Link QoS" data-testid="link-qos-section" style={{ marginTop: 10 }}>
      <div style={{ color: 'var(--netlab-text-secondary)', fontSize: 10, fontWeight: 700 }}>
        LINK QOS
      </div>
      <label style={FIELD_STYLE}>
        <span>Bandwidth</span>
        <input
          aria-label="Bandwidth bps"
          style={INPUT_STYLE}
          type="number"
          min={1}
          value={bandwidthBps}
          onChange={(event) => setBandwidthBps(event.currentTarget.value)}
        />
      </label>
      <label style={FIELD_STYLE}>
        <span>Propagation delay</span>
        <input
          aria-label="Propagation delay ms"
          style={INPUT_STYLE}
          type="number"
          min={0}
          max={1000}
          value={propagationDelayMs}
          onChange={(event) => setPropagationDelayMs(event.currentTarget.value)}
        />
      </label>
      <label style={FIELD_STYLE}>
        <span>Loss percent</span>
        <input
          aria-label="Loss percent"
          data-testid="sandbox-link-loss-percent"
          type="range"
          min={0}
          max={50}
          value={optionalNumber(lossPct) ?? 0}
          aria-valuetext={`${optionalNumber(lossPct) ?? 0}%`}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setLossPct(value);
            if (Number(value) > 0 && lossSeed.trim() === '') {
              setLossSeed(String(Date.now() % 2_147_483_647));
            }
          }}
        />
      </label>
      <label style={FIELD_STYLE}>
        <span>Loss seed</span>
        <input
          aria-label="Loss seed"
          style={INPUT_STYLE}
          type="number"
          value={lossSeed}
          onChange={(event) => setLossSeed(event.currentTarget.value)}
        />
      </label>
      <label style={{ ...FIELD_STYLE, gridTemplateColumns: 'auto 1fr', alignItems: 'center' }}>
        <input
          aria-label="Infinite queue"
          type="checkbox"
          checked={infiniteQueue}
          onChange={(event) => setInfiniteQueue(event.currentTarget.checked)}
        />
        <span>Infinite queue</span>
      </label>
      {!infiniteQueue && (
        <label style={FIELD_STYLE}>
          <span>Queue depth</span>
          <input
            aria-label="Queue depth segments"
            style={INPUT_STYLE}
            type="number"
            min={1}
            max={10000}
            value={queueDepthSegments}
            onChange={(event) => setQueueDepthSegments(event.currentTarget.value)}
          />
        </label>
      )}
      {errors.length > 0 && (
        <div role="alert" aria-live="polite" style={{ color: 'var(--netlab-accent-red)' }}>
          {errors[0]}
        </div>
      )}
      <dl style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 4, margin: '10px 0 0' }}>
        <dt>Currently queued</dt>
        <dd>{counters.queued}</dd>
        <dt>Total dequeued</dt>
        <dd>{counters.dequeued}</dd>
        <dt>Dropped</dt>
        <dd>
          {counters.dropped} ({counters.queueFull} / {counters.loss} / {counters.linkFailed})
        </dd>
      </dl>
      <button
        type="button"
        data-testid="sandbox-link-apply"
        disabled={errors.length > 0}
        onClick={apply}
        style={BUTTON_STYLE}
      >
        Apply
      </button>
      <section aria-label="Traffic Shaping" style={{ marginTop: 18 }}>
        <div style={{ color: 'var(--netlab-text-secondary)', fontSize: 10, fontWeight: 700 }}>
          TRAFFIC SHAPING
        </div>
        <label style={FIELD_STYLE}>
          <span>Classes</span>
          <textarea
            aria-label="Shaper classes"
            value={shaperDraft}
            onChange={(event) => setShaperDraft(event.currentTarget.value)}
            rows={4}
            style={{ ...INPUT_STYLE, fontFamily: 'monospace', resize: 'vertical' }}
          />
        </label>
        <div style={{ color: 'var(--netlab-text-secondary)', fontSize: 11, marginTop: 4 }}>
          id:weight:queueDepth:class|default:dscp,dscp
        </div>
        {shaperErrors.length > 0 && (
          <div role="alert" aria-live="polite" style={{ color: 'var(--netlab-accent-red)' }}>
            {shaperErrors[0]}
          </div>
        )}
        {shaperConfig && (
          <dl
            style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 4, margin: '10px 0 0' }}
          >
            {shaperConfig.classes.map((klass) => {
              const counts = classCounters.get(klass.id) ?? {
                queued: 0,
                dequeued: 0,
                dropped: 0,
              };
              return (
                <div key={klass.id} style={{ display: 'contents' }}>
                  <dt>
                    {klass.id} {klass.default ? '(default)' : `(DSCP ${klass.dscp.join(',')})`}
                  </dt>
                  <dd>
                    q {counts.queued} / dq {counts.dequeued} / drop {counts.dropped}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            disabled={shaperErrors.length > 0}
            onClick={applyShaper}
            style={BUTTON_STYLE}
          >
            Apply shaper
          </button>
          <button type="button" onClick={clearShaper} style={BUTTON_STYLE}>
            Clear shaper
          </button>
        </div>
      </section>
    </section>
  );
}
