import { useEffect, useRef } from 'react';
import { useNetlabContext } from '../NetlabContext';
import { useSimulation } from '../../simulation/SimulationContext';
import type { PacketHop } from '../../types/simulation';
import { TraceSelector } from './TraceSelector';

const EVENT_COLORS: Record<string, string> = {
  create:        '#7dd3fc',
  forward:       '#4ade80',
  deliver:       '#34d399',
  drop:          '#f87171',
  'arp-request': '#f59e0b',
  'arp-reply':   '#f59e0b',
};

const EVENT_LABELS: Record<string, string> = {
  create:        'CREATE',
  forward:       'FWD',
  deliver:       'DELIVER',
  drop:          'DROP',
  'arp-request': 'ARP-REQ',
  'arp-reply':   'ARP-REP',
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
  nextHopLabel,
  isActive,
  onClick,
}: {
  hop: PacketHop;
  nextHopLabel: string | null;
  isActive: boolean;
  onClick: () => void;
}) {
  const color = EVENT_COLORS[hop.event] ?? '#94a3b8';
  const label = EVENT_LABELS[hop.event] ?? hop.event.toUpperCase();
  const dropReason = hop.event === 'drop' ? formatDropReason(hop.reason) : null;
  const annotation = formatHopAnnotation(hop);

  return (
    <div
      onClick={onClick}
      title={dropReason ?? undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '4px 8px',
        borderRadius: 4,
        cursor: 'pointer',
        background: isActive ? 'rgba(125, 211, 252, 0.08)' : 'transparent',
        borderLeft: isActive ? `2px solid ${color}` : '2px solid transparent',
        marginBottom: 2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span style={{ color: 'var(--netlab-text-faint)', fontSize: 10, minWidth: 18, textAlign: 'right' }}>
          {hop.step}
        </span>
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
        <span style={{ color: 'var(--netlab-text-primary)', fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {hop.nodeLabel}
        </span>
        {hop.toNodeId && (
          <span style={{ color: 'var(--netlab-text-faint)', fontSize: 10 }}>→ {nextHopLabel ?? hop.toNodeId}</span>
        )}
      </div>
      {(hop.event === 'arp-request' || hop.event === 'arp-reply') && hop.arpFrame && (
        <span style={{ color: '#f59e0b', fontSize: 9, opacity: 0.8, paddingLeft: 28 }}>
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

export function PacketTimeline() {
  const { topology } = useNetlabContext();
  const { engine, state, exportPcap } = useSimulation();
  const { traces, currentTraceId, currentStep, selectedHop } = state;
  const trace = traces.find((t) => t.packetId === currentTraceId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeStep = selectedHop?.step ?? currentStep;

  // Auto-scroll to active row
  useEffect(() => {
    if (!scrollRef.current || activeStep < 0) return;
    const rows = scrollRef.current.querySelectorAll('[data-step]');
    const activeRow = rows[activeStep] as HTMLElement | undefined;
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
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{
          padding: '6px 10px',
          borderBottom: '1px solid var(--netlab-bg-surface)',
          color: 'var(--netlab-text-muted)',
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 1,
          flexShrink: 0,
        }}
      >
        PACKET TIMELINE
        {trace && (
          <span style={{ marginLeft: 8, color: 'var(--netlab-border)', fontWeight: 'normal' }}>
            {trace.hops.length} hops · {trace.status}
          </span>
        )}
      </div>

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
            color: currentTraceId
              ? 'var(--netlab-text-primary)'
              : 'var(--netlab-text-muted)',
            cursor: currentTraceId ? 'pointer' : 'default',
            flexShrink: 0,
            fontFamily: 'monospace',
          }}
        >
          Download PCAP
        </button>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>
        {!trace ? (
          <div style={{ color: 'var(--netlab-border)', fontSize: 11, padding: '8px 8px' }}>
            No trace yet — click "Send Packet" to start.
          </div>
        ) : (
          trace.hops.map((hop) => (
            <div key={hop.step} data-step={hop.step}>
              <HopRow
                hop={hop}
                nextHopLabel={
                  hop.toNodeId
                    ? topology.nodes.find((node) => node.id === hop.toNodeId)?.data.label ?? hop.toNodeId
                    : null
                }
                isActive={hop.step === activeStep}
                onClick={() => engine.selectHop(hop.step)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
