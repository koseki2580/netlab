import type React from 'react';
import type { Sandbox, SandboxDiff } from '../sandbox/fork';

const MONO = 'ui-monospace, monospace';

export interface LineageBannerProps {
  sandbox: Sandbox;
  /** Display name for the origin scenario (defaults to `sandbox.forkedFrom`). */
  originTitle?: string;
  /** Reset the sandbox to its origin (zero the diff). */
  onReset?: () => void;
  /** Open an M4 compare view against the origin scenario. */
  onCompare?: () => void;
  /** Leave the forked sandbox. */
  onClose?: () => void;
}

function diffParts(diff: SandboxDiff): string[] {
  return (Object.keys(diff) as (keyof SandboxDiff)[])
    .filter((key) => diff[key] !== 0)
    .map((key) => `+${diff[key]} ${key}`);
}

/**
 * M5 — lineage banner shown at the top of the simulator chrome when viewing a
 * forked sandbox. Surfaces the origin scenario, the fork step, and the
 * accumulating edit diff, with reset / compare-with-origin / close actions.
 */
export function LineageBanner({
  sandbox,
  originTitle,
  onReset,
  onCompare,
  onClose,
}: LineageBannerProps) {
  const parts = diffParts(sandbox.diff);
  return (
    <div
      data-testid="lineage-banner"
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '6px 12px',
        flexShrink: 0,
        borderBottom: '1px solid var(--netlab-border)',
        background: 'color-mix(in srgb, var(--netlab-accent-yellow) 12%, var(--netlab-bg-surface))',
        color: 'var(--netlab-text-secondary)',
        fontFamily: MONO,
        fontSize: 11,
      }}
    >
      <span aria-hidden style={{ color: 'var(--netlab-accent-yellow)' }}>
        ⑂
      </span>
      <span>
        forked from{' '}
        <strong style={{ color: 'var(--netlab-text-primary)' }}>
          {originTitle ?? sandbox.forkedFrom}
        </strong>{' '}
        at step {sandbox.forkedAtStep}
      </span>
      <span data-testid="lineage-diff" style={{ color: 'var(--netlab-text-muted)' }}>
        {parts.length > 0 ? parts.join(' · ') : 'no edits yet'}
      </span>
      <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        {onReset && (
          <button
            type="button"
            data-testid="lineage-reset"
            onClick={onReset}
            style={bannerButton('var(--netlab-text-secondary)')}
          >
            reset to origin
          </button>
        )}
        {onCompare && (
          <button
            type="button"
            data-testid="lineage-compare"
            onClick={onCompare}
            style={bannerButton('var(--netlab-accent-blue)')}
          >
            compare ⇄ origin
          </button>
        )}
        {onClose && (
          <button
            type="button"
            data-testid="lineage-close"
            onClick={onClose}
            style={bannerButton('var(--netlab-text-muted)')}
          >
            close
          </button>
        )}
      </span>
    </div>
  );
}

function bannerButton(color: string): React.CSSProperties {
  return {
    fontFamily: MONO,
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 6,
    cursor: 'pointer',
    color,
    background: 'transparent',
    border: '1px solid var(--netlab-border)',
  };
}
