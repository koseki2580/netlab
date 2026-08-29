import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { traceEventId } from '../../sandbox/annotations/anchors';
import { useSandboxOrNull } from '../../sandbox/useSandbox';
import { useSimulation } from '../../simulation/SimulationContext';
import type { PacketHop, PacketTrace } from '../../types/simulation';
import { TraceAnnotationAnchor } from '../sandbox/annotations/TraceAnnotationAnchor';
import { useNetlabContext } from '../NetlabContext';
import { TraceSelector } from './TraceSelector';
import { TraceFilterInput } from './traceFilter/TraceFilterInput';
import type { TraceFilterPredicate, TraceFilterResult } from './traceFilter/parser';

const EVENT_COLORS: Record<string, string> = {
  create: 'var(--netlab-accent-cyan)',
  forward: 'var(--netlab-accent-green)',
  deliver: 'var(--netlab-accent-green)',
  drop: 'var(--netlab-accent-red)',
  'arp-request': 'var(--netlab-accent-orange)',
  'arp-reply': 'var(--netlab-accent-orange)',
};

const EVENT_LABELS: Record<string, string> = {
  create: 'CREATE',
  forward: 'FWD',
  deliver: 'DELIVER',
  drop: 'DROP',
  'arp-request': 'ARP-REQ',
  'arp-reply': 'ARP-REP',
};

function formatDropReason(reason: string | undefined): string | null {
  if (!reason) return null;
  if (reason === 'acl-deny') return 'ACL Deny';
  return reason;
}

function formatHopAnnotation(hop: PacketHop): string | null {
  const parts: string[] = [];

  if (hop.action === 'fragment') {
    if (hop.fragmentIndex !== undefined && hop.fragmentCount !== undefined) {
      parts.push(`fragment ${hop.fragmentIndex + 1}/${hop.fragmentCount}`);
    } else {
      parts.push('fragment');
    }
  }

  if (hop.action === 'reassembly-pending') {
    parts.push('reassembly pending');
  }

  if (hop.action === 'reassembly-complete') {
    if (hop.fragmentCount !== undefined) {
      parts.push(`reassembled (${hop.fragmentCount} frags)`);
    } else {
      parts.push('reassembly complete');
    }
  }

  if (hop.nextHopMtu !== undefined) {
    parts.push(`mtu ${hop.nextHopMtu}`);
  }

  if (hop.action?.startsWith('link:')) {
    const label = hop.action.slice('link:'.length);
    const qos = hop.linkQos;
    if (qos?.totalLatencySteps !== undefined) {
      parts.push(`${label} ${qos.totalLatencySteps}ms`);
    } else if (qos?.reason !== undefined) {
      parts.push(`${label} ${qos.reason}`);
    } else if (qos?.queueDepth !== undefined) {
      parts.push(`${label} q=${qos.queueDepth}`);
    } else {
      parts.push(label);
    }
  }

  if (hop.action?.startsWith('shaper:')) {
    const label = hop.action.slice('shaper:'.length);
    const shaper = hop.shaperTrace;
    if (shaper?.reason) {
      parts.push(`${label} ${shaper.classId} ${shaper.reason}`);
    } else if (shaper) {
      parts.push(`${label} ${shaper.classId} q=${shaper.queueDepth}`);
    } else {
      parts.push(label);
    }
  }

  if (hop.action === 'ecmp:bucketed' && hop.ecmpTrace) {
    parts.push(
      `ecmp bucket ${hop.ecmpTrace.bucket + 1}/${hop.ecmpTrace.candidateCount} via ${
        hop.ecmpTrace.chosen.nextHop
      }`,
    );
  }

  if (hop.action?.startsWith('netflow:') && hop.observabilityTrace) {
    if (hop.observabilityTrace.kind === 'netflow:flow-update') {
      parts.push(
        `netflow update ${hop.observabilityTrace.packets} packets ${hop.observabilityTrace.bytes} bytes`,
      );
    } else if (hop.observabilityTrace.kind === 'netflow:flow-export') {
      parts.push(`netflow export ${hop.observabilityTrace.reason}`);
    }
  }

  if (hop.action?.startsWith('sflow:') && hop.observabilityTrace) {
    if (hop.observabilityTrace.kind === 'sflow:sampled') {
      parts.push(`sflow sample #${hop.observabilityTrace.sequence}`);
    } else if (hop.observabilityTrace.kind === 'sflow:dropped') {
      parts.push(`sflow dropped ${hop.observabilityTrace.reason}`);
    }
  }

  if (hop.action?.startsWith('tls:') && hop.tlsTrace) {
    if (hop.tlsTrace.kind === 'tls:client-hello') {
      parts.push(`tls client hello alpn=${hop.tlsTrace.alpnList.join(',')}`);
    } else if (hop.tlsTrace.kind === 'tls:server-hello') {
      parts.push(`tls server hello alpn=${hop.tlsTrace.selectedAlpn ?? '-'}`);
    } else if (hop.tlsTrace.kind === 'tls:certificate') {
      parts.push(`tls certificate ${hop.tlsTrace.certBytes} bytes`);
    } else if (hop.tlsTrace.kind === 'tls:certificate-verify') {
      parts.push(`tls certificate verify ${hop.tlsTrace.sigBytes} bytes`);
    } else if (hop.tlsTrace.kind === 'tls:finished') {
      parts.push(`tls finished ${hop.tlsTrace.who}`);
    } else if (hop.tlsTrace.kind === 'tls:application-data') {
      parts.push(`tls application data ${hop.tlsTrace.bytes} bytes`);
    } else {
      parts.push(`tls alert ${hop.tlsTrace.description}`);
    }
  }

  if (hop.event === 'drop') {
    const reason = formatDropReason(hop.reason);
    if (reason) {
      parts.push(reason);
    }
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

function HopRow({
  hop,
  trace,
  nextHopLabel,
  isActive,
  onClick,
  onEdit,
}: {
  hop: PacketHop;
  trace: PacketTrace;
  nextHopLabel: string | null;
  isActive: boolean;
  onClick: () => void;
  onEdit: (anchorElement: HTMLElement) => void;
}) {
  const color = EVENT_COLORS[hop.event] ?? 'var(--netlab-text-secondary)';
  const label = EVENT_LABELS[hop.event] ?? hop.event.toUpperCase();
  const dropReason = hop.event === 'drop' ? formatDropReason(hop.reason) : null;
  const annotation = formatHopAnnotation(hop);

  return (
    <div
      role="option"
      data-testid="trace-hop"
      aria-selected={isActive}
      tabIndex={0}
      onClick={onClick}
      onContextMenu={(event) => {
        event.preventDefault();
        onClick();
        onEdit(event.currentTarget);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
        if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
          e.preventDefault();
          onClick();
          onEdit(e.currentTarget);
        }
      }}
      title={dropReason ?? undefined}
      className="netlab-focus-ring"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '4px 8px',
        borderRadius: 4,
        cursor: 'pointer',
        background: isActive ? 'rgba(125, 211, 252, 0.08)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--netlab-accent-cyan)' : '2px solid transparent',
        paddingLeft: isActive ? 6 : 8,
        marginBottom: 2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span
          style={{
            color: 'var(--netlab-text-faint)',
            fontSize: 10,
            minWidth: 18,
            textAlign: 'right',
          }}
        >
          {hop.step}
        </span>
        <span
          aria-hidden="true"
          style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: EVENT_COLORS[hop.event] ?? 'var(--netlab-text-muted)',
            display: 'inline-block',
            flexShrink: 0,
            marginTop: 4,
          }}
        />
        <span
          style={{
            fontSize: 9,
            fontWeight: 'bold',
            padding: '1px 5px',
            borderRadius: 3,
            background: `${color}22`,
            color,
            minWidth: 46,
            textAlign: 'center',
          }}
        >
          {label}
        </span>
        <TraceAnnotationAnchor traceEventId={traceEventId(trace, hop)} />
        <span
          style={{
            color: 'var(--netlab-text-primary)',
            fontSize: 11,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {hop.nodeLabel}
        </span>
        {hop.toNodeId && (
          <span style={{ color: 'var(--netlab-text-faint)', fontSize: 10 }}>
            → {nextHopLabel ?? hop.toNodeId}
          </span>
        )}
      </div>
      {(hop.event === 'arp-request' || hop.event === 'arp-reply') && hop.arpFrame && (
        <span
          style={{
            color: 'var(--netlab-accent-orange)',
            fontSize: 9,
            // No opacity: the accent is already chosen to clear AA against the
            // theme's backgrounds, and fading it took this line to 4.49:1.
            paddingLeft: 28,
          }}
        >
          {hop.event === 'arp-request'
            ? `who has ${hop.dstIp}?`
            : `${hop.srcIp} is at ${hop.arpFrame.srcMac}`}
        </span>
      )}
      {annotation && (
        <span style={{ color: 'var(--netlab-text-secondary)', fontSize: 9, paddingLeft: 28 }}>
          {annotation}
        </span>
      )}
    </div>
  );
}

const identityFilter: TraceFilterPredicate = () => true;

export interface PacketTimelineProps {
  readonly filter?: TraceFilterPredicate;
}

export const PacketTimeline = memo(function PacketTimeline({ filter }: PacketTimelineProps = {}) {
  const { topology } = useNetlabContext();
  const { engine, state, exportPcap } = useSimulation();
  const sandbox = useSandboxOrNull();
  const { traces, currentTraceId, currentStep, selectedHop } = state;
  const trace = traces.find((t) => t.packetId === currentTraceId);
  const [inputFilter, setInputFilter] = useState<TraceFilterPredicate>(() => identityFilter);
  const activeFilter = filter ?? inputFilter;
  const visibleHops = trace ? trace.hops.filter(activeFilter) : [];
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeStep = selectedHop?.step ?? currentStep;
  const handleParseFilter = useCallback((result: TraceFilterResult) => {
    if (result.ok) {
      setInputFilter(() => result.predicate);
    }
  }, []);

  // Auto-scroll to active row
  useEffect(() => {
    if (!scrollRef.current || activeStep < 0) return;
    const activeRow = scrollRef.current.querySelector<HTMLElement>(`[data-step="${activeStep}"]`);
    activeRow?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeStep]);

  function handleDownloadPcap() {
    const bytes = exportPcap(currentTraceId ?? undefined);
    const blob = new Blob([Uint8Array.from(bytes)], { type: 'application/vnd.tcpdump.pcap' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `netlab-trace-${currentTraceId ?? 'export'}.pcap`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      data-testid="demo-trace-log"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: 'monospace',
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 28,
          padding: '0 8px',
          borderBottom: '1px solid var(--netlab-border-subtle)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1,
            color: 'var(--netlab-text-secondary)',
            textTransform: 'uppercase',
          }}
        >
          PACKET TIMELINE
        </span>
        {trace && (
          <span
            style={{
              background: 'var(--netlab-bg-elevated)',
              color: 'var(--netlab-text-muted)',
              fontSize: 10,
              borderRadius: 10,
              padding: '1px 6px',
            }}
          >
            {trace.hops.length}
          </span>
        )}
        <button
          type="button"
          aria-label="Clear timeline"
          onClick={() => engine.reset()}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--netlab-text-muted)',
            fontFamily: 'monospace',
            fontSize: 11,
            padding: '0 4px',
          }}
          className="netlab-focus-ring"
        >
          ✕
        </button>
      </div>

      {filter === undefined && <TraceFilterInput onParse={handleParseFilter} />}
      {trace && (
        <div
          aria-live="polite"
          data-testid="trace-filter-status"
          style={{
            padding: '2px 10px 0',
            fontSize: 10,
            color: 'var(--netlab-text-muted)',
            fontFamily: 'monospace',
          }}
        >
          {visibleHops.length} of {trace.hops.length} hops shown
        </div>
      )}

      <div
        style={{
          padding: '8px 10px 0',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <TraceSelector />
        <button
          type="button"
          onClick={handleDownloadPcap}
          disabled={!currentTraceId}
          style={{
            padding: '2px 8px',
            fontSize: 11,
            borderRadius: 4,
            border: '1px solid var(--netlab-border)',
            background: 'var(--netlab-bg-surface)',
            color: currentTraceId ? 'var(--netlab-text-primary)' : 'var(--netlab-text-muted)',
            cursor: currentTraceId ? 'pointer' : 'default',
            flexShrink: 0,
            fontFamily: 'monospace',
          }}
        >
          Download PCAP
        </button>
      </div>

      <div
        ref={scrollRef}
        role={trace ? 'listbox' : 'region'}
        aria-label="Packet hops"
        tabIndex={0}
        style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}
      >
        {!trace ? (
          <div style={{ color: 'var(--netlab-text-muted)', fontSize: 11, padding: '8px 8px' }}>
            No trace yet — click "Send Packet" to start.
          </div>
        ) : (
          visibleHops.map((hop) => (
            <div key={hop.step} data-step={hop.step}>
              <HopRow
                hop={hop}
                trace={trace}
                nextHopLabel={
                  hop.toNodeId
                    ? (topology.nodes.find((node) => node.id === hop.toNodeId)?.data.label ??
                      hop.toNodeId)
                    : null
                }
                isActive={hop.step === activeStep}
                onClick={() => engine.selectHop(hop.step)}
                onEdit={(anchorElement) => {
                  sandbox?.openEditPopover({
                    target: { kind: 'packet', traceId: trace.packetId, hopIndex: hop.step },
                    anchorElement,
                  });
                }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
});
