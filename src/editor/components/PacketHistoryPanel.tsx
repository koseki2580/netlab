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
  forward: '#e2e8f0',
  deliver: '#4ade80',
  drop: '#f87171',
  'arp-request': '#fbbf24',
  'arp-reply': '#fbbf24',
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
        <dt style={{ color: '#94a3b8' }}>delivered</dt>
        <dd data-testid="editor-results-delivered" style={{ margin: 0, color: '#4ade80' }}>
          {summary.delivered} / {summary.total}
        </dd>
        <dt style={{ color: '#94a3b8' }}>dropped</dt>
        <dd data-testid="editor-results-dropped" style={{ margin: 0, color: '#f87171' }}>
          {summary.dropped}
        </dd>
        <dt style={{ color: '#94a3b8' }}>longest path</dt>
        <dd data-testid="editor-results-longest" style={{ margin: 0 }}>
          {summary.longestPath} hops
        </dd>
      </dl>

      {rows.length === 0 ? (
        <p data-testid="editor-history-empty" style={{ color: '#94a3b8', marginTop: 12 }}>
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
                    background: selected ? '#1e293b' : 'transparent',
                    color: EVENT_TONE[hop.event] ?? '#e2e8f0',
                  }}
                >
                  <span style={{ color: '#64748b' }}>{hop.step}</span> {hop.event}{' '}
                  <span style={{ color: '#94a3b8' }}>@{hop.nodeLabel}</span>
                  <span style={{ display: 'block', color: '#64748b', fontSize: 10.5 }}>
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
