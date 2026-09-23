import { useMemo } from 'react';
import { useI18n } from '../../i18n/useI18n';
import type { NetlabNode, NetlabEdge } from '../../types/topology';
import { validateTopology, type TopologyValidationResult } from '../../utils/connectionValidator';
import {
  suggestFix,
  type ConnectionFix,
  type FixableCode,
  type TopologyPatch,
} from '../../utils/connectionFixers';
import { checkDevices, type DeviceCheckCode } from '../deviceChecks';

const DEVICE_CHECK_KEY: Readonly<Record<DeviceCheckCode, string>> = {
  isolated: 'editor.check.isolated',
  'host-unlinked': 'editor.check.hostUnlinked',
  'router-no-address': 'editor.check.routerNoAddress',
};

export interface ValidationPanelProps {
  nodes: NetlabNode[];
  edges: NetlabEdge[];
  /** Focus an edge (kept for ghost fixes and the issue header). */
  onEdgeClick?: (edgeId: string) => void;
  /**
   * Apply a one-click fix. Only wired in the editor/sandbox; when absent the
   * panel is read-only (cause list + focus only).
   */
  onApplyFix?: (patch: TopologyPatch) => void;
  /** Gates the fix buttons; defaults to `false` (read-only). */
  editable?: boolean;
  /**
   * Render inline inside a sidebar instead of floating over the canvas. Floating
   * is the default so existing embeds are unaffected.
   */
  docked?: boolean;
  /**
   * Also check each device, not only each link: a device linked to nothing, or
   * a router with no addressed interface. Off by default so existing embeds
   * keep their output; the editor turns it on.
   */
  deviceChecks?: boolean;
  /** A device issue was chosen; the editor selects that device. */
  onNodeClick?: (nodeId: string) => void;
}

/** Positioning is the only difference; docked drops the overlay chrome. */
const DOCKED_OVERRIDES: React.CSSProperties = {
  position: 'static',
  width: '100%',
  maxHeight: 'none',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  zIndex: 'auto',
};

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
  background:
    'var(--netlab-bg-panel, color-mix(in srgb, var(--netlab-bg-primary) 95%, transparent))',
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

function fixButtonStyle(recommended: boolean): React.CSSProperties {
  return {
    fontFamily: 'inherit',
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 6,
    cursor: 'pointer',
    border: `1px solid ${
      recommended ? 'var(--netlab-accent-cyan, #22d3ee)' : 'var(--netlab-border, #334155)'
    }`,
    background: recommended
      ? 'color-mix(in srgb, var(--netlab-accent-cyan, #22d3ee) 14%, transparent)'
      : 'transparent',
    color: recommended
      ? 'var(--netlab-accent-cyan, #22d3ee)'
      : 'var(--netlab-text-muted, var(--netlab-text-secondary))',
  };
}

function resolveNodeLabel(nodes: NetlabNode[], nodeId: string): string {
  return nodes.find((node) => node.id === nodeId)?.data.label ?? nodeId;
}

interface PanelIssue {
  level: 'error' | 'warning';
  code: FixableCode;
  message: string;
  fixes: ConnectionFix[];
}

export function ValidationPanel({
  nodes,
  edges,
  onEdgeClick,
  onApplyFix,
  editable = false,
  docked,
  deviceChecks = false,
  onNodeClick,
}: ValidationPanelProps) {
  const { t } = useI18n();
  const result: TopologyValidationResult = useMemo(
    () => validateTopology(nodes, edges),
    [nodes, edges],
  );
  const deviceIssues = useMemo(
    () => (deviceChecks ? checkDevices(nodes, edges) : []),
    [deviceChecks, nodes, edges],
  );
  const errorCount = result.errorCount + deviceIssues.length;

  const edgeEntries = useMemo(
    () =>
      Array.from(result.edgeResults.entries())
        .map(([edgeId, edgeResult]) => {
          const edge = edges.find((candidate) => candidate.id === edgeId);
          if (!edge) return null;
          const issues: PanelIssue[] = [
            ...edgeResult.errors.map((error) => ({
              level: 'error' as const,
              code: error.code,
              message: error.message,
              fixes: suggestFix(error.code, { edge, nodes }),
            })),
            ...edgeResult.warnings.map((warning) => ({
              level: 'warning' as const,
              code: warning.code,
              message: warning.message,
              fixes: suggestFix(warning.code, { edge, nodes }),
            })),
          ];

          if (issues.length === 0) return null;

          return {
            edgeId,
            title: `${resolveNodeLabel(nodes, edge.source)} ↔ ${resolveNodeLabel(nodes, edge.target)}`,
            issues,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    [edges, nodes, result.edgeResults],
  );

  if (result.valid && result.warningCount === 0 && deviceIssues.length === 0) {
    return (
      <div
        className="netlab-validation-panel"
        style={docked ? { ...PANEL_STYLE, ...DOCKED_OVERRIDES } : PANEL_STYLE}
      >
        <span>{t('editor.validation.none')}</span>
      </div>
    );
  }

  return (
    <div
      className="netlab-validation-panel"
      style={docked ? { ...PANEL_STYLE, ...DOCKED_OVERRIDES } : PANEL_STYLE}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        <strong style={{ fontSize: 12 }}>{t('editor.validation.heading')}</strong>
        {errorCount > 0 ? (
          <span
            className="error-badge"
            style={{
              ...BADGE_BASE_STYLE,
              background: 'rgba(248, 113, 113, 0.16)',
              color: 'var(--netlab-accent-red, #f87171)',
            }}
          >
            {t('editor.validation.errors', { count: errorCount })}
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
            {t('editor.validation.warnings', { count: result.warningCount })}
          </span>
        ) : null}
      </div>

      {deviceIssues.length > 0 ? (
        <ul style={{ listStyle: 'none', margin: '0 0 10px', padding: 0 }}>
          {deviceIssues.map((issue) => (
            <li
              key={`${issue.nodeId}-${issue.code}`}
              data-testid="editor-device-issue"
              data-check={issue.code}
              className="issue-error"
              style={{ marginBottom: 6 }}
            >
              <button
                type="button"
                onClick={() => onNodeClick?.(issue.nodeId)}
                style={{ ...EDGE_BUTTON_STYLE, color: 'var(--netlab-accent-red, #f87171)' }}
              >
                ❌ {t(DEVICE_CHECK_KEY[issue.code], { name: issue.name })}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

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
                    marginBottom: 6,
                    color:
                      issue.level === 'error'
                        ? 'var(--netlab-accent-red, #f87171)'
                        : 'var(--netlab-accent-orange, #f59e0b)',
                  }}
                >
                  <div>
                    {issue.level === 'error' ? '❌' : '⚠️'} {issue.message}
                  </div>
                  {editable && issue.fixes.length > 0 && (
                    <div
                      data-testid="issue-fixes"
                      style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}
                    >
                      {issue.fixes.map((fix, fixIndex) => (
                        <button
                          key={`${entry.edgeId}-${index}-${fixIndex}`}
                          type="button"
                          data-testid={fix.ghost ? 'fix-ghost' : 'fix-apply'}
                          onClick={() => {
                            if (fix.ghost || !fix.patch) {
                              onEdgeClick?.(entry.edgeId);
                              return;
                            }
                            onApplyFix?.(fix.patch);
                          }}
                          style={fixButtonStyle(!fix.ghost && fixIndex === 0)}
                        >
                          {fix.label}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
