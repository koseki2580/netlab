import type React from 'react';
import { Link } from 'react-router-dom';
import type { TrackItemState } from '../hooks/useScenarioProgress';

export interface RecommendedOrderItem {
  /** Stable id (typically scenarioId or path). Used for React keys. */
  id: string;
  /** Display title. */
  title: string;
  /** One-line description. */
  desc: string;
  /** Estimated minutes shown next to the title. */
  minutes: number;
  /** 1-based step number. */
  step: number;
  /** Derived state. */
  state: TrackItemState;
  /** Path or route the row links to. */
  href: string;
}

export interface RecommendedOrderProps {
  items: readonly RecommendedOrderItem[];
  /** Optional callback fired when a row is selected. Receives the row id. */
  onOpen?: (id: string, href: string) => void;
}

const STATE_COLOR: Record<TrackItemState, string> = {
  done: 'var(--netlab-accent-green)',
  current: 'var(--netlab-accent-cyan)',
  next: 'var(--netlab-accent-yellow)',
};

/**
 * Darken an accent toward the theme text colour so it stays readable as text on
 * the light accent-tinted pills/badges (WCAG AA) while keeping its hue.
 */
function readable(color: string): string {
  return `color-mix(in srgb, ${color} 40%, var(--netlab-text-primary))`;
}

function statePillStyle(state: TrackItemState): React.CSSProperties {
  const color = STATE_COLOR[state];
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 8px',
    borderRadius: 4,
    fontFamily: 'ui-monospace, monospace',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.4,
    color: readable(color),
    background: `color-mix(in srgb, ${color} 12%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 28%, var(--netlab-border))`,
  };
}

function actionStyle(state: TrackItemState): React.CSSProperties {
  const color = STATE_COLOR[state];
  return {
    fontSize: 11,
    fontWeight: 700,
    padding: '5px 12px',
    borderRadius: 999,
    color: readable(color),
    background: `color-mix(in srgb, ${color} 14%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
    fontFamily: 'ui-monospace, monospace',
  };
}

function badgeStyle(state: TrackItemState): React.CSSProperties {
  const color = STATE_COLOR[state];
  return {
    width: 32,
    height: 32,
    borderRadius: 999,
    background: `color-mix(in srgb, ${color} 16%, var(--netlab-bg-elevated))`,
    border: `1px solid color-mix(in srgb, ${color} 32%, var(--netlab-border))`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: readable(color),
    fontFamily: 'ui-monospace, monospace',
    fontWeight: 700,
    fontSize: 12,
  };
}

function rowStyle(state: TrackItemState): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: '40px 1fr auto',
    alignItems: 'center',
    gap: 14,
    padding: '14px 18px',
    borderRadius: 12,
    background:
      state === 'current'
        ? 'color-mix(in srgb, var(--netlab-accent-cyan) 8%, var(--netlab-bg-surface))'
        : 'var(--netlab-bg-surface)',
    border: `1px solid ${
      state === 'current' ? 'var(--netlab-accent-cyan)' : 'var(--netlab-border)'
    }`,
    color: 'inherit',
    textDecoration: 'none',
  };
}

function actionLabel(state: TrackItemState): string {
  return state === 'done' ? 'Review →' : 'Open →';
}

export function RecommendedOrder({ items, onOpen }: RecommendedOrderProps) {
  return (
    <div role="list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 'var(--netlab-eyebrow, 10px)',
            fontWeight: 700,
            letterSpacing: 1,
            color: 'var(--netlab-text-muted)',
            textTransform: 'uppercase',
          }}
        >
          recommended order
        </span>
        <span
          style={{
            fontSize: 10,
            color: 'var(--netlab-text-muted)',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          click any demo to open it →
        </span>
      </div>
      {items.map((it) => (
        <Link
          key={it.id}
          role="listitem"
          to={it.href}
          onClick={(e) => {
            if (!onOpen) return;
            // Allow modifier-clicks to behave normally (open in new tab, etc.).
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            onOpen(it.id, it.href);
          }}
          style={rowStyle(it.state)}
        >
          <div style={badgeStyle(it.state)}>{it.state === 'done' ? '✓' : it.step}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--netlab-text-primary)' }}>
              {it.title}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--netlab-text-muted)',
                fontFamily: 'ui-monospace, monospace',
                marginTop: 2,
              }}
            >
              {it.desc} · ~{it.minutes}m
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={statePillStyle(it.state)}>{it.state}</span>
            <span style={actionStyle(it.state)}>{actionLabel(it.state)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
