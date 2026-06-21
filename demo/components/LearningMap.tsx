import type React from 'react';
import { Link } from 'react-router-dom';
import type {
  LearningMap as LearningMapData,
  LearningStep,
  LearningStepState,
} from '../hooks/useLearningMap';

export interface LearningMapProps {
  map: LearningMapData;
  /** Fires when a non-locked step is opened. Caller handles navigation. */
  onOpen?: (id: string, path: string) => void;
  /** Fires when the resume affordance is used. Caller handles navigation. */
  onResume?: (id: string, path: string) => void;
  /**
   * Pro audience: collapse to the header + progress bar + resume only (the map
   * is orientation, not a beginner nag — but pros do not need the full spine).
   */
  compact?: boolean;
}

const SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const MONO = 'ui-monospace, monospace';

const STATE_COLOR: Record<LearningStepState, string> = {
  done: 'var(--netlab-accent-green)',
  current: 'var(--netlab-accent-cyan)',
  locked: 'var(--netlab-text-faint)',
};

const STATE_GLYPH: Record<LearningStepState, string> = {
  done: '✓',
  current: '▸',
  locked: '◦',
};

function formatRemaining(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return (hrs ? `${hrs}h ` : '') + `${mins}m`;
}

function stepStyle(state: LearningStepState): React.CSSProperties {
  const color = STATE_COLOR[state];
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 10px',
    borderRadius: 'var(--netlab-radius-md, 16px)',
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 600,
    color,
    background:
      state === 'current'
        ? 'color-mix(in srgb, var(--netlab-accent-cyan) 12%, var(--netlab-bg-surface))'
        : 'var(--netlab-bg-surface)',
    border: `1px solid color-mix(in srgb, ${color} 28%, var(--netlab-learning-surface-border))`,
    textDecoration: 'none',
    cursor: state === 'locked' ? 'default' : 'pointer',
    opacity: state === 'locked' ? 0.55 : 1,
    // learning-surface: 180ms, multi-axis transition (color + background).
    transition: 'color 180ms ease, background 180ms ease, border-color 180ms ease',
  };
}

function StepNode({
  step,
  onOpen,
}: {
  step: LearningStep;
  onOpen?: (id: string, path: string) => void;
}) {
  const content = (
    <>
      <span aria-hidden>{STATE_GLYPH[step.state]}</span>
      {step.label}
    </>
  );

  if (step.state === 'locked') {
    return (
      <span
        data-testid={`learning-step-${step.id}`}
        data-state="locked"
        aria-disabled="true"
        style={stepStyle('locked')}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      data-testid={`learning-step-${step.id}`}
      data-state={step.state}
      to={step.path}
      onClick={(e) => {
        if (!onOpen) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        onOpen(step.id, step.path);
      }}
      style={stepStyle(step.state)}
    >
      {content}
    </Link>
  );
}

/**
 * C2 — cross-curriculum learning map spine (learning-surface).
 *
 * Turns recorded progress into a route: done / current / locked across every
 * concept track, remaining time, and a single resume. Renders host-derived
 * state from {@link useLearningMap}; it owns no state of its own.
 */
export function LearningMap({ map, onOpen, onResume, compact = false }: LearningMapProps) {
  if (map.totalCount === 0) return null;
  const pct = Math.round((map.doneCount / map.totalCount) * 100);

  return (
    <section
      data-testid="learning-map"
      aria-label="learning progress"
      style={{
        padding: 'var(--netlab-pad, 20px)',
        borderRadius: 'var(--netlab-radius-lg, 24px)',
        border: '1px solid var(--netlab-learning-surface-border)',
        background: 'var(--netlab-learning-surface-bg)',
        // exactly one resting shadow; it never animates (learning-surface rule).
        boxShadow: 'var(--netlab-learning-shadow)',
        color: 'var(--netlab-text-primary)',
        fontFamily: SANS,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 'var(--netlab-eyebrow, 10px)',
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: 'var(--netlab-text-muted)',
            }}
          >
            your progress
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>
            {map.doneCount} / {map.totalCount} scenarios
          </div>
        </div>
        <div
          style={{
            textAlign: 'right',
            fontFamily: MONO,
            fontSize: 11,
            color: 'var(--netlab-text-secondary)',
          }}
        >
          ~{formatRemaining(map.remainingMinutes)} left
          <div style={{ color: 'var(--netlab-text-muted)', marginTop: 2 }}>
            {map.totalCount - map.doneCount} scenarios · {map.conceptsLeft} concepts left
          </div>
        </div>
      </header>

      <div
        role="progressbar"
        aria-label="track progress"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: 6,
          marginTop: 14,
          borderRadius: 999,
          background: 'var(--netlab-bg-surface)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'var(--netlab-accent-green)',
            transition: 'width 180ms ease',
          }}
        />
      </div>

      {!compact && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 'var(--netlab-gap, 14px)',
            marginTop: 18,
          }}
        >
          {map.tracks.map((track) => (
            <div key={track.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  color: 'var(--netlab-text-muted)',
                }}
              >
                {track.name}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {track.steps.map((step) => (
                  <StepNode key={step.id} step={step} {...(onOpen ? { onOpen } : {})} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {map.resume && (
        <Link
          data-testid="learning-resume"
          to={map.resume.path}
          onClick={(e) => {
            if (!onResume || !map.resume) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            onResume(map.resume.id, map.resume.path);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 18,
            padding: '8px 16px',
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 13,
            color: 'var(--netlab-accent-cyan)',
            background: 'color-mix(in srgb, var(--netlab-accent-cyan) 14%, transparent)',
            border: '1px solid color-mix(in srgb, var(--netlab-accent-cyan) 30%, transparent)',
            textDecoration: 'none',
          }}
        >
          <span aria-hidden>▶</span> Resume — {map.resume.label}
        </Link>
      )}
    </section>
  );
}
