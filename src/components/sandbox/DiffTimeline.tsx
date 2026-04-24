import { useRef } from 'react';
import { useSandbox } from '../../sandbox/useSandbox';
import type { PacketHop, PacketTrace } from '../../types/simulation';

function currentTrace(traces: PacketTrace[], currentTraceId: string | null): PacketTrace | null {
  if (currentTraceId) {
    return traces.find((trace) => trace.packetId === currentTraceId) ?? null;
  }

  return traces[0] ?? null;
}

function comparableHop(hop: PacketHop | undefined): string {
  if (!hop) return '__missing__';
  return JSON.stringify({
    event: hop.event,
    nodeId: hop.nodeId,
    toNodeId: hop.toNodeId ?? null,
    reason: hop.reason ?? null,
  });
}

function firstDivergence(
  baselineTrace: PacketTrace | null,
  whatIfTrace: PacketTrace | null,
): number {
  const baselineHops = baselineTrace?.hops ?? [];
  const whatIfHops = whatIfTrace?.hops ?? [];
  const length = Math.max(baselineHops.length, whatIfHops.length);

  for (let index = 0; index < length; index += 1) {
    if (comparableHop(baselineHops[index]) !== comparableHop(whatIfHops[index])) {
      return index;
    }
  }

  return -1;
}

function HopPill({
  hop,
  divergent,
}: {
  readonly hop: PacketHop | undefined;
  readonly divergent: boolean;
}) {
  return (
    <span
      data-divergent={divergent ? 'true' : 'false'}
      style={{
        display: 'inline-flex',
        minWidth: 88,
        padding: '5px 8px',
        marginRight: 6,
        borderRadius: 6,
        border: divergent
          ? '1px solid var(--netlab-accent-orange, orange)'
          : '1px solid var(--netlab-border)',
        background: divergent ? 'rgba(251, 191, 36, 0.12)' : 'var(--netlab-bg-surface)',
        color: divergent ? 'var(--netlab-accent-orange, orange)' : 'var(--netlab-text-secondary)',
        fontFamily: 'monospace',
        fontSize: 11,
      }}
    >
      {hop ? `${hop.step}: ${hop.event}` : 'missing'}
    </span>
  );
}

export function DiffTimeline() {
  const sandbox = useSandbox();
  const baseline = sandbox.engine.baseline;
  const baselineState = baseline?.getState() ?? null;
  const whatIfState = sandbox.engine.whatIf.getState();
  const baselineTrace = baselineState
    ? currentTrace(baselineState.traces, baselineState.currentTraceId)
    : null;
  const whatIfTrace = currentTrace(whatIfState.traces, whatIfState.currentTraceId);
  const divergence = firstDivergence(baselineTrace, whatIfTrace);
  const baselineRowRef = useRef<HTMLDivElement | null>(null);
  const whatIfRowRef = useRef<HTMLDivElement | null>(null);

  if (sandbox.mode !== 'beta' || !baseline) {
    return null;
  }

  const syncScroll = (source: 'baseline' | 'what-if') => {
    const from = source === 'baseline' ? baselineRowRef.current : whatIfRowRef.current;
    const to = source === 'baseline' ? whatIfRowRef.current : baselineRowRef.current;
    if (!from || !to) return;
    to.scrollLeft = from.scrollLeft;
  };

  const maxLength = Math.max(baselineTrace?.hops.length ?? 0, whatIfTrace?.hops.length ?? 0);

  return (
    <section
      role="region"
      aria-label="Sandbox diff timeline"
      style={{
        borderTop: '1px solid var(--netlab-border)',
        background: 'var(--netlab-bg-primary)',
        color: 'var(--netlab-text-primary)',
        fontFamily: 'monospace',
      }}
    >
      <div style={{ padding: '6px 10px', fontSize: 11, color: 'var(--netlab-text-muted)' }}>
        DIFF TIMELINE
      </div>
      {(['baseline', 'what-if'] as const).map((branch) => {
        const trace = branch === 'baseline' ? baselineTrace : whatIfTrace;
        return (
          <div
            key={branch}
            ref={branch === 'baseline' ? baselineRowRef : whatIfRowRef}
            data-testid="diff-row"
            data-branch={branch}
            onScroll={() => syncScroll(branch)}
            style={{
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              padding: '6px 10px',
              borderTop: '1px solid var(--netlab-border)',
            }}
          >
            <strong
              style={{
                display: 'inline-block',
                width: 72,
                color: 'var(--netlab-text-muted)',
                fontSize: 11,
                textTransform: 'uppercase',
              }}
            >
              {branch}
            </strong>
            {Array.from({ length: maxLength }, (_, index) => (
              <HopPill
                key={`${branch}-${index}`}
                hop={trace?.hops[index]}
                divergent={index === divergence}
              />
            ))}
          </div>
        );
      })}
    </section>
  );
}
