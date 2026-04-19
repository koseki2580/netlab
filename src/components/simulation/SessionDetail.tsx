import { memo, useState } from 'react';
import { useSession } from '../../simulation/SessionContext';
import type { PacketHop, PacketTrace } from '../../types/simulation';
import { useNetlabContext } from '../NetlabContext';

const STATUS_META = {
  pending: { icon: '◌', label: 'pending', color: '#94a3b8' },
  success: { icon: '✓', label: 'success', color: '#34d399' },
  failed: { icon: '✗', label: 'failed', color: '#f87171' },
} as const;

const EVENT_META: Record<PacketHop['event'], { label: string; color: string }> = {
  create: { label: 'CREATE', color: '#7dd3fc' },
  forward: { label: 'FORWARD', color: '#4ade80' },
  deliver: { label: 'DELIVER', color: '#34d399' },
  drop: { label: 'DROP', color: '#f87171' },
  'arp-request': { label: 'ARP-REQ', color: '#f59e0b' },
  'arp-reply': { label: 'ARP-REP', color: '#f59e0b' },
};

function shortSessionId(sessionId: string): string {
  return sessionId.length > 8 ? sessionId.slice(0, 8) : sessionId;
}

function formatElapsed(timestamp: number, start: number): string {
  return `${Math.max(0, timestamp - start)}ms`;
}

function formatPhase(phase: string): string {
  return phase.replace(':', ' · ');
}

function resolveNodeLabel(
  nodeId: string | undefined,
  nodes: { id: string; data: { label: string } }[],
): string {
  if (!nodeId) return '-';
  return nodes.find((node) => node.id === nodeId)?.data.label ?? nodeId;
}

function resolveNodeAddress(
  nodeId: string,
  nodes: {
    id: string;
    data: {
      ip?: string;
      interfaces?: { ipAddress: string }[];
    };
  }[],
): string | null {
  const node = nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return null;
  if (typeof node.data.ip === 'string') return node.data.ip;
  return node.data.interfaces?.[0]?.ipAddress ?? null;
}

function describeHop(hop: PacketHop, nodes: { id: string; data: { label: string } }[]): string {
  if (hop.event === 'drop') {
    return `drop: ${hop.reason ?? 'unknown'}`;
  }
  if (hop.event === 'deliver') {
    return 'delivered';
  }
  if (hop.event === 'arp-request') {
    return `who has ${hop.dstIp}?`;
  }
  if (hop.event === 'arp-reply') {
    return `${hop.srcIp} is at ${hop.arpFrame?.srcMac ?? 'unknown'}`;
  }

  const parts: string[] = [];
  if (hop.toNodeId) {
    parts.push(`to ${resolveNodeLabel(hop.toNodeId, nodes)}`);
  }

  if (hop.ingressInterfaceName || hop.egressInterfaceName) {
    parts.push(`${hop.ingressInterfaceName ?? '—'} → ${hop.egressInterfaceName ?? '—'}`);
  }

  return parts.join(' · ') || 'originated';
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: 'var(--netlab-bg-panel)',
        border: '1px solid var(--netlab-border-subtle)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--netlab-border-subtle)',
          color: 'var(--netlab-text-muted)',
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 1,
        }}
      >
        {title}
      </div>
      <div style={{ padding: 12 }}>{children}</div>
    </section>
  );
}

const BODY_COLLAPSE_THRESHOLD = 500;

function HttpPane({
  label,
  headline,
  headers,
  body,
}: {
  label: string;
  headline?: string;
  headers?: Record<string, string>;
  body?: string;
}) {
  const [bodyExpanded, setBodyExpanded] = useState(false);
  const shouldCollapse = (body?.length ?? 0) > BODY_COLLAPSE_THRESHOLD;

  return (
    <Section title={label}>
      {headline && (
        <div
          style={{
            color: 'var(--netlab-text-primary)',
            fontSize: 12,
            fontWeight: 'bold',
            marginBottom: 8,
          }}
        >
          {headline}
        </div>
      )}

      {headers && Object.keys(headers).length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 8 }}>
          <tbody>
            {Object.entries(headers).map(([key, value]) => (
              <tr key={key}>
                <td
                  style={{
                    color: 'var(--netlab-text-muted)',
                    padding: '2px 8px 2px 0',
                    whiteSpace: 'nowrap',
                    verticalAlign: 'top',
                  }}
                >
                  {key}
                </td>
                <td
                  style={{
                    color: 'var(--netlab-text-secondary)',
                    padding: '2px 0',
                    wordBreak: 'break-all',
                  }}
                >
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {body != null && (
        <div>
          <pre
            style={{
              color: 'var(--netlab-text-secondary)',
              fontSize: 11,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              margin: 0,
              maxHeight: shouldCollapse && !bodyExpanded ? 80 : undefined,
              overflow: shouldCollapse && !bodyExpanded ? 'hidden' : undefined,
            }}
          >
            {body}
          </pre>
          {shouldCollapse && (
            <button
              type="button"
              onClick={() => setBodyExpanded((prev) => !prev)}
              style={{
                marginTop: 4,
                fontSize: 11,
                color: 'var(--netlab-accent-blue)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                fontFamily: 'inherit',
              }}
            >
              {bodyExpanded ? 'Collapse' : `Show all (${body.length} chars)`}
            </button>
          )}
        </div>
      )}
    </Section>
  );
}

function SessionPathView({ label, trace }: { label: string; trace?: PacketTrace }) {
  const { topology } = useNetlabContext();

  return (
    <Section title={label}>
      {!trace ? (
        <div style={{ color: 'var(--netlab-text-muted)', fontSize: 12 }}>
          No trace attached yet.
        </div>
      ) : trace.hops.length === 0 ? (
        <div style={{ color: 'var(--netlab-text-muted)', fontSize: 12 }}>No hops recorded.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {trace.hops.map((hop) => {
            const eventMeta = EVENT_META[hop.event];
            const isDrop = hop.event === 'drop';
            const address = resolveNodeAddress(hop.nodeId, topology.nodes);

            return (
              <div
                key={`${trace.packetId}-${hop.step}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: 8,
                  alignItems: 'center',
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: isDrop ? '#450a0a33' : 'var(--netlab-bg-surface)',
                  border: `1px solid ${isDrop ? '#7f1d1d' : 'var(--netlab-border-subtle)'}`,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      color: 'var(--netlab-text-primary)',
                      fontSize: 12,
                      fontWeight: 'bold',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {hop.nodeLabel}
                    {address ? (
                      <span style={{ color: 'var(--netlab-text-muted)', fontWeight: 'normal' }}>
                        {' '}
                        ({address})
                      </span>
                    ) : null}
                  </div>
                  <div
                    style={{
                      color: isDrop ? '#fca5a5' : 'var(--netlab-text-secondary)',
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    {describeHop(hop, topology.nodes)}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 'bold',
                    color: eventMeta.color,
                    background: `${eventMeta.color}22`,
                    border: `1px solid ${eventMeta.color}44`,
                    borderRadius: 999,
                    padding: '2px 7px',
                    letterSpacing: 0.4,
                  }}
                >
                  {eventMeta.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

export const SessionDetail = memo(function SessionDetail() {
  const { topology } = useNetlabContext();
  const { selectedSession } = useSession();

  if (!selectedSession) {
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
            padding: '10px 12px',
            borderBottom: '1px solid var(--netlab-border-subtle)',
            color: 'var(--netlab-text-muted)',
            fontSize: 10,
            fontWeight: 'bold',
            letterSpacing: 1,
          }}
        >
          SESSION DETAIL
        </div>
        <div style={{ padding: '16px 14px', color: 'var(--netlab-text-muted)', fontSize: 12 }}>
          Select a session to inspect its lifecycle and packet paths.
        </div>
      </div>
    );
  }

  const status = STATUS_META[selectedSession.status];
  const srcLabel = resolveNodeLabel(selectedSession.srcNodeId, topology.nodes);
  const dstLabel = resolveNodeLabel(selectedSession.dstNodeId, topology.nodes);

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
          background: 'var(--netlab-bg-panel)',
        }}
      >
        <div
          style={{
            color: 'var(--netlab-text-muted)',
            fontSize: 10,
            fontWeight: 'bold',
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          SESSION DETAIL
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--netlab-text-primary)' }}>
            SESSION #{shortSessionId(selectedSession.sessionId)}
          </span>
          <span style={{ fontSize: 12, color: status.color }}>
            {status.icon} {status.label}
          </span>
        </div>

        <div style={{ color: 'var(--netlab-text-secondary)', fontSize: 12, marginBottom: 4 }}>
          {selectedSession.requestType ?? 'Unnamed request'}
        </div>

        <div style={{ color: 'var(--netlab-text-muted)', fontSize: 11 }}>
          {srcLabel} → {dstLabel}
          {selectedSession.protocol ? ` · ${selectedSession.protocol}` : ''}
        </div>
      </div>

      <div
        tabIndex={0}
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
        <Section title="LIFECYCLE">
          {selectedSession.events.length === 0 ? (
            <div style={{ color: 'var(--netlab-text-muted)', fontSize: 12 }}>
              No lifecycle events recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedSession.events.map((event) => (
                <div
                  key={`${selectedSession.sessionId}-${event.seq}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px minmax(0, 1fr) auto auto',
                    gap: 8,
                    alignItems: 'center',
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: 'var(--netlab-text-muted)' }}>{event.seq + 1}.</span>
                  <span style={{ color: 'var(--netlab-text-primary)' }}>
                    {formatPhase(event.phase)}
                  </span>
                  <span style={{ color: 'var(--netlab-text-secondary)' }}>
                    {resolveNodeLabel(event.nodeId, topology.nodes)}
                  </span>
                  <span style={{ color: 'var(--netlab-text-muted)' }}>
                    {formatElapsed(event.timestamp, selectedSession.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {selectedSession.error && (
          <Section title="ERROR">
            <div style={{ color: '#fca5a5', fontSize: 12, marginBottom: 4 }}>
              {selectedSession.error.reason}
            </div>
            <div style={{ color: 'var(--netlab-text-secondary)', fontSize: 11 }}>
              at {resolveNodeLabel(selectedSession.error.nodeId, topology.nodes)}
            </div>
          </Section>
        )}

        <SessionPathView label="REQUEST PATH" trace={selectedSession.requestTrace} />
        <SessionPathView label="RESPONSE PATH" trace={selectedSession.responseTrace} />

        {selectedSession.httpMeta && (
          <>
            <HttpPane
              label="HTTP REQUEST"
              headline={
                selectedSession.httpMeta.method && selectedSession.httpMeta.path
                  ? `${selectedSession.httpMeta.method} ${selectedSession.httpMeta.path} HTTP/1.1`
                  : undefined
              }
              headers={selectedSession.httpMeta.requestHeaders}
              body={selectedSession.httpMeta.requestBody}
            />
            <HttpPane
              label="HTTP RESPONSE"
              headline={
                selectedSession.httpMeta.statusCode != null
                  ? `HTTP/1.1 ${selectedSession.httpMeta.statusCode}`
                  : undefined
              }
              headers={selectedSession.httpMeta.responseHeaders}
              body={selectedSession.httpMeta.responseBody}
            />
          </>
        )}
      </div>
    </div>
  );
});
