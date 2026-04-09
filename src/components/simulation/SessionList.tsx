import { useMemo } from 'react';
import { useNetlabContext } from '../NetlabContext';
import { useSession } from '../../simulation/SessionContext';
import type { NetworkSession } from '../../types/session';

const STATUS_META = {
  pending: { icon: '◌', label: 'pending', color: '#94a3b8' },
  success: { icon: '✓', label: 'success', color: '#34d399' },
  failed: { icon: '✗', label: 'failed', color: '#f87171' },
} as const;

const STATUS_ORDER: Record<NetworkSession['status'], number> = {
  pending: 0,
  success: 1,
  failed: 2,
};

function shortSessionId(sessionId: string): string {
  return sessionId.length > 8 ? sessionId.slice(0, 8) : sessionId;
}

function resolveNodeLabel(
  nodeId: string,
  nodes: Array<{ id: string; data: { label: string } }>,
): string {
  return nodes.find((node) => node.id === nodeId)?.data.label ?? nodeId;
}

export function SessionList() {
  const { topology } = useNetlabContext();
  const {
    sessions,
    selectedSessionId,
    selectSession,
  } = useSession();

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort((a, b) => {
        const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (statusDiff !== 0) return statusDiff;
        return b.createdAt - a.createdAt;
      }),
    [sessions],
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
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
        SESSIONS
        <span style={{ marginLeft: 8, color: 'var(--netlab-border)', fontWeight: 'normal' }}>
          {sessions.length}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 6 }}>
        {sortedSessions.length === 0 ? (
          <div style={{ padding: '10px 8px', color: 'var(--netlab-text-muted)', fontSize: 12 }}>
            No sessions yet. Send a request to start tracing a round trip.
          </div>
        ) : (
          sortedSessions.map((session) => {
            const status = STATUS_META[session.status];
            const srcLabel = resolveNodeLabel(session.srcNodeId, topology.nodes);
            const dstLabel = resolveNodeLabel(session.dstNodeId, topology.nodes);
            const isSelected = session.sessionId === selectedSessionId;

            return (
              <button
                key={session.sessionId}
                type="button"
                onClick={() => selectSession(session.sessionId)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  padding: '8px 10px',
                  marginBottom: 4,
                  borderRadius: 6,
                  border: `1px solid ${isSelected ? 'var(--netlab-accent-blue)' : 'transparent'}`,
                  borderLeft: `3px solid ${isSelected ? 'var(--netlab-accent-blue)' : 'transparent'}`,
                  background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: status.color, fontWeight: 'bold', fontSize: 12 }}>
                    {status.icon}
                  </span>
                  <span
                    style={{
                      color: 'var(--netlab-text-primary)',
                      fontSize: 12,
                      fontWeight: 'bold',
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {session.requestType ?? session.protocol ?? `Session ${shortSessionId(session.sessionId)}`}
                  </span>
                  <span style={{ color: status.color, fontSize: 10, textTransform: 'uppercase' }}>
                    {status.label}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                  <span style={{ color: 'var(--netlab-text-muted)' }}>
                    #{shortSessionId(session.sessionId)}
                  </span>
                  <span style={{ color: 'var(--netlab-text-secondary)' }}>
                    {srcLabel} → {dstLabel}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
