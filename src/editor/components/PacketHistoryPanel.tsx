import type { PacketHop, PacketTrace } from '../../types/simulation';
import { historyRows, hopEdgeId, summarizeTraces } from '../simulationSummary';

export interface PacketHistoryPanelProps {
  traces: readonly PacketTrace[];
  /** Step of the currently selected hop, so the row can show as selected. */
  selectedStep?: number | null;
  /**
   * A history row was chosen. `edgeId` is the link that hop crossed, or null for
   * a hop that crossed none (creation, or a drop at the holding node).
   */
  onSelectHop?: (hop: PacketHop, edgeId: string | null) => void;
}

const EVENT_TONE: Record<string, string> = {
  create: '#60a5fa',
  forward: 'var(--netlab-text-primary)',
  deliver: 'var(--netlab-accent-green)',
  drop: 'var(--netlab-accent-red)',
  'arp-request': 'var(--netlab-accent-yellow)',
  'arp-reply': 'var(--netlab-accent-yellow)',
};

/**
 * The right pane's Results and History. Results answers "did it get there";
 * History is the hop-by-hop record, and selecting a row points back at the link
 * that hop crossed so the text and the picture stay connected.
 */
export function PacketHistoryPanel({ traces, selectedStep, onSelectHop }: PacketHistoryPanelProps) {
  const summary = summarizeTraces(traces);
  const rows = historyRows(traces);

  return (
    <div data-testid="editor-history" style={{ fontFamily: 'monospace', fontSize: 12 }}>
      <dl
        data-testid="editor-results"
        style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 10px', margin: 0 }}
      >
        <dt style={{ color: 'var(--netlab-text-secondary)' }}>delivered</dt>
        <dd
          data-testid="editor-results-delivered"
          style={{ margin: 0, color: 'var(--netlab-accent-green)' }}
        >
          {summary.delivered} / {summary.total}
        </dd>
        <dt style={{ color: 'var(--netlab-text-secondary)' }}>dropped</dt>
        <dd
          data-testid="editor-results-dropped"
          style={{ margin: 0, color: 'var(--netlab-accent-red)' }}
        >
          {summary.dropped}
        </dd>
        <dt style={{ color: 'var(--netlab-text-secondary)' }}>longest path</dt>
        <dd data-testid="editor-results-longest" style={{ margin: 0 }}>
          {summary.longestPath} hops
        </dd>
      </dl>

      {rows.length === 0 ? (
        <p
          data-testid="editor-history-empty"
          style={{ color: 'var(--netlab-text-secondary)', marginTop: 12 }}
        >
          No packets yet — run the topology to record a history.
        </p>
      ) : (
        <ol style={{ listStyle: 'none', padding: 0, margin: '12px 0 0' }}>
          {rows.map(({ trace, hop }) => {
            const edgeId = hopEdgeId(hop);
            const selected = selectedStep === hop.step;
            return (
              <li key={`${trace.packetId}-${hop.step}`}>
                <button
                  type="button"
                  data-testid={`editor-history-row-${trace.packetId}-${hop.step}`}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => onSelectHop?.(hop, edgeId)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    font: 'inherit',
                    cursor: 'pointer',
                    padding: '3px 6px',
                    marginBottom: 2,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: selected ? '#60a5fa' : 'transparent',
                    background: selected ? 'var(--netlab-bg-surface)' : 'transparent',
                    color: EVENT_TONE[hop.event] ?? 'var(--netlab-text-primary)',
                  }}
                >
                  <span style={{ color: 'var(--netlab-text-secondary)' }}>{hop.step}</span>{' '}
                  {hop.event}{' '}
                  <span style={{ color: 'var(--netlab-text-secondary)' }}>@{hop.nodeLabel}</span>
                  <span
                    style={{
                      display: 'block',
                      color: 'var(--netlab-text-secondary)',
                      fontSize: 10.5,
                    }}
                  >
                    {hop.srcIp} → {hop.dstIp} · TTL {hop.ttl}
                    {hop.reason ? ` · ${hop.reason}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
