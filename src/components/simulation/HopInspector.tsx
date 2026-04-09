import { useNetlabContext } from '../NetlabContext';
import { useSimulation } from '../../simulation/SimulationContext';
import type { NatTranslation, PacketHop, RoutingDecision } from '../../types/simulation';

const EVENT_COLORS: Record<PacketHop['event'], string> = {
  create: '#7dd3fc',
  forward: '#4ade80',
  deliver: '#34d399',
  drop: '#f87171',
  'arp-request': '#f59e0b',
  'arp-reply': '#f59e0b',
};

function resolveNodeLabel(
  nodeId: string | undefined,
  nodes: Array<{ id: string; data: { label: string; role: string } }>,
): string {
  if (!nodeId) return '-';
  return nodes.find((node) => node.id === nodeId)?.data.label ?? nodeId;
}

function isRouterNode(
  nodeId: string,
  nodes: Array<{ id: string; data: { label: string; role: string } }>,
): boolean {
  return nodes.find((node) => node.id === nodeId)?.data.role === 'router';
}

function getTtlOut(
  hop: PacketHop,
  nodes: Array<{ id: string; data: { label: string; role: string } }>,
): number {
  if (hop.event === 'arp-request' || hop.event === 'arp-reply') {
    return 0;
  }
  if (hop.event === 'forward' && isRouterNode(hop.nodeId, nodes)) {
    return hop.ttl - 1;
  }
  return hop.ttl;
}

function EventBadge({ event }: { event: PacketHop['event'] }) {
  const color = EVENT_COLORS[event] ?? '#94a3b8';

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 'bold',
        background: `${color}22`,
        border: `1px solid ${color}44`,
        color,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {event}
    </span>
  );
}

function FieldRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '84px minmax(0, 1fr)',
        gap: 10,
        alignItems: 'start',
      }}
    >
      <span style={{ color: 'var(--netlab-text-secondary)' }}>{label}</span>
      <span style={{ color: valueColor ?? 'var(--netlab-text-primary)', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

function formatEndpoint(ip: string, port: number): string {
  return `${ip}:${port}`;
}

function NatTranslationSection({ translation }: { translation: NatTranslation }) {
  const srcChanged =
    translation.preSrcIp !== translation.postSrcIp ||
    translation.preSrcPort !== translation.postSrcPort;
  const dstChanged =
    translation.preDstIp !== translation.postDstIp ||
    translation.preDstPort !== translation.postDstPort;

  return (
    <section
      style={{
        background: 'var(--netlab-bg-panel)',
        border: '1px solid var(--netlab-border-subtle)',
        borderRadius: 8,
        padding: 12,
      }}
    >
      <div
        style={{
          color: 'var(--netlab-text-secondary)',
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 1,
          marginBottom: 10,
        }}
      >
        NAT TRANSLATION
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
        <FieldRow label="Type" value={translation.type.toUpperCase()} />
        <FieldRow
          label="Pre Src"
          value={formatEndpoint(translation.preSrcIp, translation.preSrcPort)}
        />
        <FieldRow
          label="Post Src"
          value={formatEndpoint(translation.postSrcIp, translation.postSrcPort)}
          valueColor={srcChanged ? 'var(--netlab-accent-green)' : 'var(--netlab-text-muted)'}
        />
        <FieldRow
          label="Pre Dst"
          value={formatEndpoint(translation.preDstIp, translation.preDstPort)}
        />
        <FieldRow
          label="Post Dst"
          value={formatEndpoint(translation.postDstIp, translation.postDstPort)}
          valueColor={dstChanged ? 'var(--netlab-accent-green)' : 'var(--netlab-text-muted)'}
        />
      </div>
    </section>
  );
}

function HopFields({
  hop,
  nodes,
}: {
  hop: PacketHop;
  nodes: Array<{ id: string; data: { label: string; role: string } }>;
}) {
  const fields = [
    { label: 'Node', value: resolveNodeLabel(hop.nodeId, nodes) },
    { label: 'Next Hop', value: resolveNodeLabel(hop.toNodeId, nodes) },
    { label: 'Src IP', value: hop.srcIp },
    { label: 'Dst IP', value: hop.dstIp },
    { label: 'TTL In', value: String(hop.ttl) },
    { label: 'TTL Out', value: String(getTtlOut(hop, nodes)) },
    { label: 'Protocol', value: hop.protocol },
  ];

  if (hop.ingressInterfaceName || hop.egressInterfaceName) {
    fields.push(
      { label: 'Ingress If', value: hop.ingressInterfaceName ?? '—' },
      { label: 'Egress If', value: hop.egressInterfaceName ?? '—' },
    );
  }

  return (
    <section
      style={{
        background: 'var(--netlab-bg-panel)',
        border: '1px solid var(--netlab-border-subtle)',
        borderRadius: 8,
        padding: 12,
      }}
    >
      <div
        style={{
          color: 'var(--netlab-text-secondary)',
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 1,
          marginBottom: 10,
        }}
      >
        HOP FIELDS
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
        {fields.map((field) => (
          <FieldRow key={field.label} label={field.label} value={field.value} />
        ))}
      </div>
    </section>
  );
}

function ArpHopDetails({ hop }: { hop: PacketHop }) {
  const frame = hop.arpFrame;
  if (!frame) return null;

  const rows: Array<[string, string]> = [
    ['Operation', frame.payload.operation === 'request' ? 'REQUEST (1)' : 'REPLY (2)'],
    ['Sender MAC', frame.payload.senderMac],
    ['Sender IP', frame.payload.senderIp],
    ['Target MAC', frame.payload.operation === 'request' ? '(unknown)' : frame.payload.targetMac],
    ['Target IP', frame.payload.targetIp],
    ['Eth Dst', frame.dstMac],
    ['Eth Src', frame.srcMac],
    ['EtherType', '0x0806 (ARP)'],
  ];

  return (
    <section
      style={{
        background: 'var(--netlab-bg-panel)',
        border: '1px solid #78350f',
        borderRadius: 8,
        padding: 12,
      }}
    >
      <div
        style={{
          color: '#f59e0b',
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 1,
          marginBottom: 10,
        }}
      >
        ARP FIELDS
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
        {rows.map(([label, value]) => (
          <FieldRow key={label} label={label} value={value} />
        ))}
      </div>
    </section>
  );
}

function RoutingSection({ decision }: { decision: RoutingDecision }) {
  return (
    <section
      style={{
        background: 'var(--netlab-bg-panel)',
        border: '1px solid var(--netlab-border-subtle)',
        borderRadius: 8,
        padding: 12,
      }}
    >
      <div
        style={{
          color: 'var(--netlab-text-secondary)',
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 1,
          marginBottom: 10,
        }}
      >
        ROUTING DECISION
      </div>

      <div
        style={{
          fontSize: 12,
          color: decision.winner ? '#4ade80' : '#fbbf24',
          padding: '8px 10px',
          background: decision.winner ? '#052e1644' : '#45190344',
          borderRadius: 6,
          border: `1px solid ${decision.winner ? '#14532d' : '#78350f'}`,
          marginBottom: 10,
        }}
      >
        {decision.explanation}
      </div>

      <div
        style={{
          border: '1px solid var(--netlab-border-subtle)',
          borderRadius: 6,
          overflow: 'hidden',
          fontSize: 11,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(120px, 1.5fr) minmax(84px, 1fr) 72px 40px 56px 68px',
            gap: 8,
            padding: '6px 8px',
            background: 'var(--netlab-bg-surface)',
            color: 'var(--netlab-text-secondary)',
            fontWeight: 'bold',
            letterSpacing: 0.4,
            fontSize: 10,
            alignItems: 'center',
          }}
        >
          <span>DESTINATION</span>
          <span>NEXT HOP</span>
          <span>PROTO</span>
          <span>AD</span>
          <span>METRIC</span>
          <span></span>
        </div>

        {decision.candidates.length === 0 ? (
          <div style={{ padding: '10px 8px', color: 'var(--netlab-text-secondary)' }}>
            No routing candidates.
          </div>
        ) : (
          decision.candidates.map((candidate, index) => {
            let background = 'transparent';
            let badgeBackground = 'transparent';
            let badgeColor = 'transparent';
            let badgeText = '';

            if (candidate.selectedByLpm) {
              background = '#052e16';
              badgeBackground = '#14532d';
              badgeColor = '#4ade80';
              badgeText = 'MATCH';
            } else if (candidate.matched) {
              background = '#451a03';
              badgeBackground = '#78350f';
              badgeColor = '#fbbf24';
              badgeText = 'MATCHED';
            }

            return (
              <div
                key={`${candidate.destination}-${candidate.nextHop}-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(120px, 1.5fr) minmax(84px, 1fr) 72px 40px 56px 68px',
                  gap: 8,
                  padding: '7px 8px',
                  borderTop: '1px solid var(--netlab-border-subtle)',
                  background,
                  color: candidate.matched ? 'var(--netlab-text-primary)' : 'var(--netlab-text-secondary)',
                  alignItems: 'center',
                }}
              >
                <span style={{ wordBreak: 'break-word' }}>{candidate.destination}</span>
                <span style={{ wordBreak: 'break-word' }}>{candidate.nextHop}</span>
                <span>{candidate.protocol}</span>
                <span>{candidate.adminDistance}</span>
                <span>{candidate.metric}</span>
                <span>
                  {badgeText && (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: badgeBackground,
                        color: badgeColor,
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}
                    >
                      {badgeText}
                    </span>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function DropReasonBlock({ reason }: { reason: string }) {
  return (
    <section
      style={{
        background: '#450a0a44',
        border: '1px solid #991b1b',
        borderRadius: 8,
        padding: 12,
      }}
    >
      <div
        style={{
          color: '#fca5a5',
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        DROP REASON
      </div>
      <div style={{ color: '#fecaca', fontSize: 12 }}>{reason}</div>
    </section>
  );
}

function ChangedFieldsBlock({ fields }: { fields: string[] }) {
  return (
    <section
      style={{
        background: 'var(--netlab-bg-panel)',
        border: '1px solid #78350f',
        borderRadius: 8,
        padding: 12,
      }}
    >
      <div
        style={{
          color: '#fbbf24',
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        MUTATED FIELDS
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {fields.map((field) => (
          <span
            key={field}
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 'bold',
              background: '#451a03',
              border: '1px solid #92400e',
              color: '#fbbf24',
              letterSpacing: 0.4,
            }}
          >
            {field}
          </span>
        ))}
      </div>
    </section>
  );
}

export function HopInspector() {
  const { topology } = useNetlabContext();
  const { state } = useSimulation();
  const { selectedHop, traces, currentTraceId } = state;
  const trace = traces.find((item) => item.packetId === currentTraceId);
  const totalHops = trace?.hops.length ?? 0;

  if (!selectedHop) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          background: 'var(--netlab-bg-panel)',
          border: '1px solid var(--netlab-border-subtle)',
          borderRadius: 8,
          overflow: 'hidden',
          color: 'var(--netlab-text-primary)',
          fontFamily: 'monospace',
        }}
      >
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid var(--netlab-border-subtle)',
            color: 'var(--netlab-text-secondary)',
            fontSize: 10,
            fontWeight: 'bold',
            letterSpacing: 1,
            position: 'sticky',
            top: 0,
            background: 'var(--netlab-bg-panel)',
            zIndex: 1,
          }}
        >
          HOP INSPECTOR
        </div>
        <div
          style={{
            padding: '16px 14px',
            color: 'var(--netlab-text-secondary)',
            fontSize: 12,
          }}
        >
          No hop selected. Click a timeline row to inspect packet details.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        background: 'var(--netlab-bg-panel)',
        border: '1px solid var(--netlab-border-subtle)',
        borderRadius: 8,
        overflow: 'hidden',
        color: 'var(--netlab-text-primary)',
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--netlab-border-subtle)',
          position: 'sticky',
          top: 0,
          background: 'var(--netlab-bg-panel)',
          zIndex: 1,
        }}
      >
        <div
          style={{
            color: 'var(--netlab-text-secondary)',
            fontSize: 10,
            fontWeight: 'bold',
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          HOP INSPECTOR
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--netlab-text-secondary)' }}>
            Hop {selectedHop.step + 1} / {totalHops || selectedHop.step + 1}
          </span>
          <EventBadge event={selectedHop.event} />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {selectedHop.arpFrame ? (
          <ArpHopDetails hop={selectedHop} />
        ) : (
          <HopFields hop={selectedHop} nodes={topology.nodes} />
        )}
        {selectedHop.natTranslation && !selectedHop.arpFrame && (
          <NatTranslationSection translation={selectedHop.natTranslation} />
        )}
        {selectedHop.routingDecision && !selectedHop.arpFrame && <RoutingSection decision={selectedHop.routingDecision} />}
        {selectedHop.changedFields && selectedHop.changedFields.length > 0 && (
          <ChangedFieldsBlock fields={selectedHop.changedFields} />
        )}
        {selectedHop.event === 'drop' && selectedHop.reason && (
          <DropReasonBlock reason={selectedHop.reason} />
        )}
      </div>
    </div>
  );
}
