import { useI18n } from '../../i18n/useI18n';
import type { TranslatorFn } from '../../i18n/types';
import { memo, useState } from 'react';
import { useSession } from '../../simulation/SessionContext';
import type { PacketHop, PacketTrace } from '../../types/simulation';
import { useNetlabContext } from '../NetlabContext';

const STATUS_META = {
  pending: {
    icon: '◌',
    labelKey: 'simulation.sessions.pending',
    color: 'var(--netlab-text-secondary)',
  },
  success: {
    icon: '✓',
    labelKey: 'simulation.sessions.success',
    color: 'var(--netlab-accent-green)',
  },
  failed: { icon: '✗', labelKey: 'simulation.sessions.failed', color: 'var(--netlab-accent-red)' },
} as const;

const EVENT_META: Record<PacketHop['event'], { label: string; color: string }> = {
  create: { label: 'CREATE', color: 'var(--netlab-accent-cyan)' },
  forward: { label: 'FORWARD', color: 'var(--netlab-accent-green)' },
  deliver: { label: 'DELIVER', color: 'var(--netlab-accent-green)' },
  drop: { label: 'DROP', color: 'var(--netlab-accent-red)' },
  'arp-request': { label: 'ARP-REQ', color: 'var(--netlab-accent-orange)' },
  'arp-reply': { label: 'ARP-REP', color: 'var(--netlab-accent-orange)' },
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

function describeHop(
  hop: PacketHop,
  nodes: { id: string; data: { label: string } }[],
  t: TranslatorFn,
): string {
  if (hop.event === 'drop') {
    return `drop: ${hop.reason ?? 'unknown'}`;
  }
  if (hop.event === 'deliver') {
    return t('simulation.session.delivered');
  }
  if (hop.event === 'arp-request') {
    return `who has ${hop.dstIp}?`;
  }
  if (hop.event === 'arp-reply') {
    return `${hop.srcIp} is at ${hop.arpFrame?.srcMac ?? 'unknown'}`;
  }

  const parts: string[] = [];
  if (hop.toNodeId) {
    parts.push(t('simulation.session.to', { node: resolveNodeLabel(hop.toNodeId, nodes) }));
  }

  if (hop.ingressInterfaceName || hop.egressInterfaceName) {
    parts.push(`${hop.ingressInterfaceName ?? '—'} → ${hop.egressInterfaceName ?? '—'}`);
  }

  return parts.join(' · ') || t('simulation.session.originated');
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
  const { t } = useI18n();
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
              {bodyExpanded
                ? t('simulation.session.collapse')
                : t('simulation.session.showAll', { count: body.length })}
            </button>
          )}
        </div>
      )}
    </Section>
  );
}

function SessionPathView({ label, trace }: { label: string; trace?: PacketTrace }) {
  const { t } = useI18n();
  const { topology } = useNetlabContext();

  return (
    <Section title={label}>
      {!trace ? (
        <div style={{ color: 'var(--netlab-text-muted)', fontSize: 12 }}>
          {t('simulation.session.noTrace')}
        </div>
      ) : trace.hops.length === 0 ? (
        <div style={{ color: 'var(--netlab-text-muted)', fontSize: 12 }}>
          {t('simulation.session.noHops')}
        </div>
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
                      color: isDrop ? 'var(--netlab-accent-red)' : 'var(--netlab-text-secondary)',
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    {describeHop(hop, topology.nodes, t)}
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
  const { t } = useI18n();
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
          {t('simulation.session.heading')}
        </div>
        <div style={{ padding: '16px 14px', color: 'var(--netlab-text-muted)', fontSize: 12 }}>
          {t('simulation.session.empty')}
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
          {t('simulation.session.heading')}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--netlab-text-primary)' }}>
            SESSION #{shortSessionId(selectedSession.sessionId)}
          </span>
          <span style={{ fontSize: 12, color: status.color }}>
            {status.icon} {t(status.labelKey)}
          </span>
        </div>

        <div style={{ color: 'var(--netlab-text-secondary)', fontSize: 12, marginBottom: 4 }}>
          {selectedSession.requestType ?? t('simulation.session.unnamed')}
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
        <Section title={t('simulation.session.lifecycle')}>
          {selectedSession.events.length === 0 ? (
            <div style={{ color: 'var(--netlab-text-muted)', fontSize: 12 }}>
              {t('simulation.session.noLifecycle')}
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
          <Section title={t('simulation.session.error')}>
            <div style={{ color: 'var(--netlab-accent-red)', fontSize: 12, marginBottom: 4 }}>
              {selectedSession.error.reason}
            </div>
            <div style={{ color: 'var(--netlab-text-secondary)', fontSize: 11 }}>
              {t('simulation.session.at', {
                node: resolveNodeLabel(selectedSession.error.nodeId, topology.nodes),
              })}
            </div>
          </Section>
        )}

        <SessionPathView
          label={t('simulation.session.requestPath')}
          {...(selectedSession.requestTrace !== undefined
            ? { trace: selectedSession.requestTrace }
            : {})}
        />
        <SessionPathView
          label={t('simulation.session.responsePath')}
          {...(selectedSession.responseTrace !== undefined
            ? { trace: selectedSession.responseTrace }
            : {})}
        />

        {selectedSession.httpMeta && (
          <>
            <HttpPane
              label={t('simulation.session.httpRequest')}
              {...(selectedSession.httpMeta.method && selectedSession.httpMeta.path
                ? {
                    headline: `${selectedSession.httpMeta.method} ${selectedSession.httpMeta.path} HTTP/1.1`,
                  }
                : {})}
              {...(selectedSession.httpMeta.requestHeaders !== undefined
                ? { headers: selectedSession.httpMeta.requestHeaders }
                : {})}
              {...(selectedSession.httpMeta.requestBody !== undefined
                ? { body: selectedSession.httpMeta.requestBody }
                : {})}
            />
            <HttpPane
              label={t('simulation.session.httpResponse')}
              {...(selectedSession.httpMeta.statusCode != null
                ? { headline: `HTTP/1.1 ${selectedSession.httpMeta.statusCode}` }
                : {})}
              {...(selectedSession.httpMeta.responseHeaders !== undefined
                ? { headers: selectedSession.httpMeta.responseHeaders }
                : {})}
              {...(selectedSession.httpMeta.responseBody !== undefined
                ? { body: selectedSession.httpMeta.responseBody }
                : {})}
            />
          </>
        )}
      </div>
    </div>
  );
});
