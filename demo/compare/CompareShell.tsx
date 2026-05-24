import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ComparePane } from './ComparePane';

// P12 — shared-playhead speed control. The play loop interval is 450ms / speed.
export type CompareSpeed = 0.25 | 0.5 | 1 | 1.5 | 2;
const SPEED_SEGMENTS: readonly CompareSpeed[] = [0.5, 1, 2] as const;
const SPEED_KEY = 'nl_compare_speed';

function clampSpeed(v: number): CompareSpeed {
  if (v <= 0.25) return 0.25;
  if (v <= 0.5) return 0.5;
  if (v <= 1) return 1;
  if (v <= 1.5) return 1.5;
  return 2;
}

function loadInitialSpeed(): CompareSpeed {
  try {
    const raw = window.localStorage.getItem(SPEED_KEY);
    if (raw == null) return 1;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? clampSpeed(parsed) : 1;
  } catch {
    return 1;
  }
}

function persistSpeed(speed: CompareSpeed): void {
  try {
    window.localStorage.setItem(SPEED_KEY, String(speed));
  } catch {
    /* localStorage unavailable — speed stays in-memory only */
  }
}

function CompareSpeedControl({
  speed,
  onChange,
}: {
  speed: CompareSpeed;
  onChange: (next: CompareSpeed) => void;
}) {
  return (
    <div
      data-testid="compare-speed"
      role="radiogroup"
      aria-label="Playback speed"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 2,
        borderRadius: 999,
        background: 'var(--netlab-bg-elevated)',
        border: '1px solid var(--netlab-border)',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 10,
      }}
    >
      {SPEED_SEGMENTS.map((opt) => {
        const active = speed === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${opt}× speed`}
            onClick={() => onChange(opt)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '2px 10px',
              borderRadius: 999,
              color: active ? 'var(--netlab-accent-cyan)' : 'var(--netlab-text-muted)',
              background: active
                ? 'color-mix(in srgb, var(--netlab-accent-cyan) 14%, transparent)'
                : 'transparent',
              fontWeight: active ? 700 : 400,
            }}
          >
            {opt}×
          </button>
        );
      })}
    </div>
  );
}

/**
 * M4 — shared timeline for a compare view. Provided by {@link CompareShell} and
 * consumed by both panes: one playhead drives `engine.selectHop` in each pane,
 * and each pane registers its own hop count so the scrub spans the longer trace.
 */
export interface CompareTimelineValue {
  step: number;
  playing: boolean;
  /** Largest step index across both panes (max trace length − 1). */
  maxStep: number;
  setStep: (step: number) => void;
  togglePlay: () => void;
  /** A pane reports its hop count (called when its trace resolves). */
  registerTotal: (side: string, total: number) => void;
}

const CompareTimelineContext = createContext<CompareTimelineValue | null>(null);

export function useCompareTimeline(): CompareTimelineValue {
  const value = useContext(CompareTimelineContext);
  if (!value) throw new Error('useCompareTimeline must be used inside CompareShell');
  return value;
}

export interface CompareShellProps {
  leftId: string;
  rightId: string;
}

/**
 * Split layout that opens two topology-group siblings side by side under one
 * shared playhead (Space plays, ← / → step).
 */
export function CompareShell({ leftId, rightId }: CompareShellProps) {
  const [step, setStepRaw] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [speed, setSpeedRaw] = useState<CompareSpeed>(loadInitialSpeed);

  const setSpeed = useCallback((next: CompareSpeed) => {
    setSpeedRaw(next);
    persistSpeed(next);
  }, []);

  const maxTotal = Math.max(0, ...Object.values(totals));
  const maxStep = Math.max(0, maxTotal - 1);

  const setStep = useCallback((next: number) => {
    setStepRaw(Math.max(0, next));
  }, []);

  const registerTotal = useCallback((side: string, total: number) => {
    setTotals((prev) => (prev[side] === total ? prev : { ...prev, [side]: total }));
  }, []);

  const togglePlay = useCallback(() => {
    setPlaying((prev) => (maxStep > 0 ? !prev : false));
  }, [maxStep]);

  // Clamp the playhead whenever the longest trace shrinks.
  useEffect(() => {
    setStepRaw((current) => Math.min(current, maxStep));
  }, [maxStep]);

  // Play loop — base cadence ~2 steps/sec, scaled by the speed control.
  useEffect(() => {
    if (!playing) return undefined;
    if (maxStep === 0) {
      setPlaying(false);
      return undefined;
    }
    const id = window.setInterval(() => {
      setStepRaw((current) => {
        if (current >= maxStep) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 450 / speed);
    return () => window.clearInterval(id);
  }, [playing, maxStep, speed]);

  // Keyboard: space play/pause, arrows step (ignored while typing).
  useEffect(() => {
    function isTyping(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
    }
    function onKey(event: KeyboardEvent) {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === ' ') {
        event.preventDefault();
        togglePlay();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setStep(step - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setStep(Math.min(maxStep, step + 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSpeed(clampSpeed(speed + 0.25));
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSpeed(clampSpeed(speed - 0.25));
      } else if (event.key === '0') {
        event.preventDefault();
        setSpeed(1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, setStep, step, maxStep, setSpeed, speed]);

  const timeline = useMemo<CompareTimelineValue>(
    () => ({ step, playing, maxStep, setStep, togglePlay, registerTotal }),
    [step, playing, maxStep, setStep, togglePlay, registerTotal],
  );

  return (
    <CompareTimelineContext.Provider value={timeline}>
      <div
        data-testid="compare-shell"
        style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      >
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <ComparePane scenarioId={leftId} side="left" />
          <div style={{ width: 1, background: 'var(--netlab-border)' }} />
          <ComparePane scenarioId={rightId} side="right" />
        </div>
        <SharedTimelineBar
          step={step}
          maxStep={maxStep}
          playing={playing}
          speed={speed}
          onStep={setStep}
          onTogglePlay={togglePlay}
          onSpeedChange={setSpeed}
        />
      </div>
    </CompareTimelineContext.Provider>
  );
}

function SharedTimelineBar({
  step,
  maxStep,
  playing,
  speed,
  onStep,
  onTogglePlay,
  onSpeedChange,
}: {
  step: number;
  maxStep: number;
  playing: boolean;
  speed: CompareSpeed;
  onStep: (n: number) => void;
  onTogglePlay: () => void;
  onSpeedChange: (next: CompareSpeed) => void;
}) {
  return (
    <div
      data-testid="compare-timeline"
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 12px',
        borderTop: '1px solid var(--netlab-border)',
        background: 'var(--netlab-bg-surface)',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 11,
        color: 'var(--netlab-text-secondary)',
      }}
    >
      <button
        type="button"
        data-testid="compare-play"
        onClick={onTogglePlay}
        disabled={maxStep === 0}
        style={{
          padding: '4px 12px',
          borderRadius: 6,
          cursor: maxStep === 0 ? 'default' : 'pointer',
          border: '1px solid var(--netlab-border)',
          background: 'var(--netlab-bg-elevated)',
          color: 'var(--netlab-text-primary)',
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        {playing ? '⏸ pause' : '▶ play'}
      </button>
      <input
        type="range"
        aria-label="Shared compare timeline"
        min={0}
        max={maxStep}
        value={step}
        onChange={(event) => onStep(Number(event.currentTarget.value))}
        style={{ flex: 1 }}
      />
      <span style={{ color: 'var(--netlab-accent-cyan)', whiteSpace: 'nowrap' }}>
        step {step} / {maxStep}
      </span>
      <CompareSpeedControl speed={speed} onChange={onSpeedChange} />
      <span style={{ color: 'var(--netlab-text-muted)', whiteSpace: 'nowrap' }}>
        space · ← / → · ↑ / ↓ speed
      </span>
    </div>
  );
}
