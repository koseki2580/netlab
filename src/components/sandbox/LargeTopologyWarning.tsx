import { useState } from 'react';

interface LargeTopologyWarningProps {
  readonly nodeCount: number;
  readonly fastMode: boolean;
  readonly onEnableFastMode: () => void;
}

function severityFor(nodeCount: number): 'none' | 'warning' | 'critical' {
  if (nodeCount >= 200) return 'critical';
  if (nodeCount >= 100) return 'warning';
  return 'none';
}

export function LargeTopologyWarning({
  nodeCount,
  fastMode,
  onEnableFastMode,
}: LargeTopologyWarningProps) {
  const [dismissed, setDismissed] = useState(false);
  const severity = severityFor(nodeCount);
  if (severity === 'none' || dismissed) return null;

  const critical = severity === 'critical';

  return (
    <div
      role="status"
      data-severity={severity}
      style={{
        margin: '10px 12px 0',
        border: `1px solid ${critical ? '#dc2626' : '#d97706'}`,
        borderRadius: 6,
        background: critical ? 'rgba(220, 38, 38, 0.12)' : 'rgba(217, 119, 6, 0.12)',
        color: 'var(--netlab-text-primary)',
        padding: 10,
        fontSize: 11,
        lineHeight: 1.4,
      }}
    >
      <button
        type="button"
        aria-label="Dismiss large topology warning"
        onClick={() => setDismissed(true)}
        className="netlab-focus-ring"
        style={{
          float: 'right',
          border: 0,
          background: 'transparent',
          color: 'var(--netlab-text-muted)',
          fontSize: 14,
          lineHeight: 1,
          cursor: 'pointer',
        }}
      >
        x
      </button>
      <div style={{ fontWeight: 700 }}>
        {critical
          ? `${nodeCount} nodes exceeds the tested bound.`
          : `${nodeCount} nodes may replay more slowly.`}
      </div>
      <div style={{ marginTop: 4 }}>
        {fastMode
          ? 'Fast mode is on, so trace detail is reduced.'
          : 'Use Fast mode to reduce retained trace detail.'}
      </div>
      {!fastMode && (
        <button
          type="button"
          aria-label="Use fast mode"
          onClick={onEnableFastMode}
          className="netlab-focus-ring"
          style={{
            marginTop: 8,
            border: '1px solid var(--netlab-border)',
            borderRadius: 6,
            background: 'var(--netlab-bg-surface)',
            color: 'var(--netlab-text-primary)',
            padding: '4px 8px',
            fontFamily: 'monospace',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          Fast mode
        </button>
      )}
    </div>
  );
}
