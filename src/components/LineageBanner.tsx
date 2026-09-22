import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { TranslatorFn } from '../i18n/types';
import { useI18n } from '../i18n/useI18n';
import type { Sandbox, SandboxDiff } from '../sandbox/fork';

const MONO = 'ui-monospace, monospace';
const RESET_CONFIRM_TIMEOUT_MS = 5000;

function totalEdits(diff: SandboxDiff): number {
  return Object.values(diff).reduce<number>((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
}

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

const DIFF_KIND_KEYS: Record<keyof SandboxDiff, string> = {
  nodes: 'simulation.lineage.kind.nodes',
  edges: 'simulation.lineage.kind.edges',
  routes: 'simulation.lineage.kind.routes',
  acls: 'simulation.lineage.kind.acls',
};

function diffParts(diff: SandboxDiff, t: TranslatorFn): string[] {
  return (Object.keys(diff) as (keyof SandboxDiff)[])
    .filter((key) => diff[key] !== 0)
    .map((key) =>
      t('simulation.lineage.diffPart', {
        count: diff[key],
        kind: t(DIFF_KIND_KEYS[key]),
      }),
    );
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
  const { t } = useI18n();
  const parts = diffParts(sandbox.diff, t);
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
        {t('simulation.lineage.forkedFrom')}{' '}
        <strong style={{ color: 'var(--netlab-text-primary)' }}>
          {originTitle ?? sandbox.forkedFrom}
        </strong>{' '}
        {t('simulation.lineage.atStep', { step: sandbox.forkedAtStep })}
      </span>
      <span data-testid="lineage-diff" style={{ color: 'var(--netlab-text-muted)' }}>
        {parts.length > 0 ? parts.join(' · ') : t('simulation.lineage.noEdits')}
      </span>
      <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        {onReset && <LineageResetButton diff={sandbox.diff} onReset={onReset} />}
        {onCompare && (
          <button
            type="button"
            data-testid="lineage-compare"
            onClick={onCompare}
            style={bannerButton('var(--netlab-accent-blue)')}
          >
            {t('simulation.lineage.compare')}
          </button>
        )}
        {onClose && (
          <button
            type="button"
            data-testid="lineage-close"
            onClick={onClose}
            style={bannerButton('var(--netlab-text-muted)')}
          >
            {t('simulation.lineage.close')}
          </button>
        )}
      </span>
    </div>
  );
}

/**
 * P7 — confirm before discarding edits. With a non-empty diff, the first click
 * arms a `discard N edits?` confirm state (auto-clearing after 5s); the second
 * click within the window actually resets. An empty diff resets on first click
 * since there is nothing to lose.
 */
function LineageResetButton({ diff, onReset }: { diff: SandboxDiff; onReset: () => void }) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const total = useMemo(() => totalEdits(diff), [diff]);

  // Auto-clear the confirm state after a few seconds of inaction.
  useEffect(() => {
    if (!confirming) return undefined;
    const id = window.setTimeout(() => setConfirming(false), RESET_CONFIRM_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [confirming]);

  // If the diff drops to zero while armed, there is nothing left to confirm.
  useEffect(() => {
    if (total === 0) setConfirming(false);
  }, [total]);

  const handleClick = () => {
    if (total === 0) {
      onReset();
      return;
    }
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onReset();
    setConfirming(false);
  };

  const label = confirming
    ? total === 1
      ? t('simulation.lineage.discardOne', { count: total })
      : t('simulation.lineage.discardMany', { count: total })
    : t('simulation.lineage.reset');
  const color = confirming ? 'var(--netlab-accent-red)' : 'var(--netlab-text-secondary)';
  return (
    <button
      type="button"
      data-testid="lineage-reset"
      data-confirming={confirming || undefined}
      onClick={handleClick}
      style={{
        ...bannerButton(color),
        ...(confirming
          ? {
              // Keep the `border` shorthand (not borderColor) so toggling confirm
              // off doesn't mix shorthand + longhand and trip React's style warning.
              border: '1px solid var(--netlab-accent-red)',
              background: 'color-mix(in srgb, var(--netlab-accent-red) 8%, transparent)',
            }
          : {}),
        transition: 'color 120ms, background 120ms, border-color 120ms',
      }}
    >
      {label}
    </button>
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
