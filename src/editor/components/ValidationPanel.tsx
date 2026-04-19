import { useMemo } from 'react';
import type { NetlabNode, NetlabEdge } from '../../types/topology';
import { validateTopology, type TopologyValidationResult } from '../../utils/connectionValidator';

export interface ValidationPanelProps {
  nodes: NetlabNode[];
  edges: NetlabEdge[];
  onEdgeClick?: (edgeId: string) => void;
}

const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: 12,
  bottom: 12,
  width: 320,
  maxHeight: 'calc(100% - 24px)',
  overflowY: 'auto',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--netlab-border-subtle, rgba(100, 116, 139, 0.4))',
  background: 'var(--netlab-bg-panel, rgba(15, 23, 42, 0.95))',
  color: 'var(--netlab-text-primary, #e2e8f0)',
  fontFamily: 'monospace',
  fontSize: 11,
  lineHeight: 1.5,
  zIndex: 200,
  pointerEvents: 'all',
};

const BADGE_BASE_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0 6px',
  borderRadius: 999,
  fontSize: 10,
};

const EDGE_BUTTON_STYLE: React.CSSProperties = {
  display: 'block',
  width: '100%',
  margin: '0 0 6px',
  padding: '6px 8px',
  borderRadius: 6,
  border: '1px solid var(--netlab-border, #334155)',
  background: 'var(--netlab-bg-surface, #1e293b)',
  color: 'var(--netlab-text-primary, #e2e8f0)',
  fontFamily: 'inherit',
  fontSize: 11,
  textAlign: 'left',
  cursor: 'pointer',
};

function resolveNodeLabel(nodes: NetlabNode[], nodeId: string): string {
  return nodes.find((node) => node.id === nodeId)?.data.label ?? nodeId;
}

export function ValidationPanel({ nodes, edges, onEdgeClick }: ValidationPanelProps) {
  const result: TopologyValidationResult = useMemo(
    () => validateTopology(nodes, edges),
    [nodes, edges],
  );

  const edgeEntries = useMemo(
    () =>
      Array.from(result.edgeResults.entries())
        .map(([edgeId, edgeResult]) => {
          const edge = edges.find((candidate) => candidate.id === edgeId);
          const issues = [
            ...edgeResult.errors.map((error) => ({
              level: 'error' as const,
              message: error.message,
            })),
            ...edgeResult.warnings.map((warning) => ({
              level: 'warning' as const,
              message: warning.message,
            })),
          ];

          if (!edge || issues.length === 0) {
            return null;
          }

          const sourceLabel = resolveNodeLabel(nodes, edge.source);
          const targetLabel = resolveNodeLabel(nodes, edge.target);

          return {
            edgeId,
            title: `${sourceLabel} ↔ ${targetLabel}`,
            issues,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    [edges, nodes, result.edgeResults],
  );

  if (result.valid && result.warningCount === 0) {
    return (
      <div className="netlab-validation-panel" style={PANEL_STYLE}>
        <span>✅ No issues found</span>
      </div>
    );
  }

  return (
    <div className="netlab-validation-panel" style={PANEL_STYLE}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        <strong style={{ fontSize: 12 }}>Topology Issues</strong>
        {result.errorCount > 0 ? (
          <span
            className="error-badge"
            style={{
              ...BADGE_BASE_STYLE,
              background: 'rgba(248, 113, 113, 0.16)',
              color: 'var(--netlab-accent-red, #f87171)',
            }}
          >
            {result.errorCount} errors
          </span>
        ) : null}
        {result.warningCount > 0 ? (
          <span
            className="warning-badge"
            style={{
              ...BADGE_BASE_STYLE,
              background: 'rgba(245, 158, 11, 0.16)',
              color: 'var(--netlab-accent-orange, #f59e0b)',
            }}
          >
            {result.warningCount} warnings
          </span>
        ) : null}
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {edgeEntries.map((entry) => (
          <li key={entry.edgeId} style={{ marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => onEdgeClick?.(entry.edgeId)}
              style={EDGE_BUTTON_STYLE}
            >
              {entry.title}
              <span style={{ color: 'var(--netlab-text-muted, #5a6a7e)' }}> ({entry.edgeId})</span>
            </button>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {entry.issues.map((issue, index) => (
                <li
                  key={`${entry.edgeId}-${index}`}
                  className={`issue-${issue.level}`}
                  style={{
                    color:
                      issue.level === 'error'
                        ? 'var(--netlab-accent-red, #f87171)'
                        : 'var(--netlab-accent-orange, #f59e0b)',
                  }}
                >
                  {issue.level === 'error' ? '❌' : '⚠️'} {issue.message}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
