import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSimulation } from '../../simulation/SimulationContext';
import type { PacketHop } from '../../types/simulation';
import { Marker } from './Marker';
import { hopEventMarker } from './hopMarkers';
import { StepHoverCard, resolveStepPreview, useStepHover } from './StepHoverCard';

/**
 * Horizontal scrub track for the active packet trace. The playbook (v5, N3)
 * surfaces step progress as a single bar with event markers and a draggable
 * playhead — keyboard scrubbing maps to the same actions a designer would
 * find natural (Space play, ← / → step, Home/End jump).
 *
 * Unlike the playbook's prototype, this iteration is **integer-step** based:
 * the real simulation engine advances in whole steps, so the continuous
 * `packetT` sub-step axis from the playbook prose is intentionally omitted.
 * The visible bar still uses fractional widths to give a smooth visual.
 */

const TRACK_HEIGHT = 28;

function hopLabel(hop: PacketHop): string {
  return `${String(hop.step).padStart(2, '0')} ${hop.event}`;
}

export interface PacketScrubTimelineProps {
  /** Hide the keyboard hint legend at the bottom — useful for narrow embeds. */
  hideKeyboardHint?: boolean;
  /** Skip global keydown installation (the consumer wires keymap centrally). */
  ownKeyboard?: boolean;
}

export function PacketScrubTimeline({
  hideKeyboardHint = false,
  ownKeyboard = true,
}: PacketScrubTimelineProps = {}) {
  const { engine, state } = useSimulation();
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ step: number; x: number } | null>(null);
  const stepHover = useStepHover();

  const trace = useMemo(
    () => state.traces.find((t) => t.packetId === state.currentTraceId) ?? null,
    [state.traces, state.currentTraceId],
  );
  const totalSteps = trace?.hops.length ?? 0;
  const stepIdx = state.currentStep >= 0 ? state.currentStep : 0;
  const playing = state.status === 'running';

  const stepFromX = useCallback(
    (clientX: number): number => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || totalSteps === 0) return 0;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.min(totalSteps - 1, Math.floor(ratio * totalSteps));
    },
    [totalSteps],
  );

  const jumpTo = useCallback(
    (step: number) => {
      if (totalSteps === 0) return;
      const clamped = Math.max(0, Math.min(totalSteps - 1, step));
      engine.selectHop(clamped);
    },
    [engine, totalSteps],
  );

  const togglePlay = useCallback(() => {
    if (totalSteps === 0) return;
    if (playing) {
      engine.pause();
    } else {
      engine.play();
    }
  }, [engine, playing, totalSteps]);

  // Global keyboard shortcuts (suppressed when an input is focused).
  useEffect(() => {
    if (!ownKeyboard) return undefined;
    if (typeof window === 'undefined') return undefined;

    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (target.isContentEditable) return true;
      return false;
    }

    function handler(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        jumpTo(stepIdx - (e.shiftKey ? 5 : 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        jumpTo(stepIdx + (e.shiftKey ? 5 : 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        jumpTo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        jumpTo(totalSteps - 1);
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ownKeyboard, togglePlay, jumpTo, stepIdx, totalSteps]);

  // Drag scrubbing — bind once per drag session.
  const onTrackPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (totalSteps === 0) return;
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      jumpTo(stepFromX(e.clientX));
      engine.pause();
    },
    [engine, jumpTo, stepFromX, totalSteps],
  );

  const onTrackPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const isDragging = e.currentTarget.hasPointerCapture(e.pointerId);
      const step = stepFromX(e.clientX);
      const rect = trackRef.current?.getBoundingClientRect();
      if (rect) {
        setHover({ step, x: e.clientX - rect.left });
      }
      if (isDragging) {
        jumpTo(step);
      }
    },
    [jumpTo, stepFromX],
  );

  const onTrackPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  if (totalSteps === 0) {
    return (
      <div
        data-netlab-scrub-empty=""
        style={{
          height: TRACK_HEIGHT + 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--netlab-text-muted)',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 10,
          background: 'var(--netlab-bg-surface)',
          border: '1px solid var(--netlab-border)',
          borderRadius: 8,
        }}
      >
        no trace yet — send a probe to populate the timeline
      </div>
    );
  }

  const pastFill = ((stepIdx + 1) / totalSteps) * 100;
  const playheadX = ((stepIdx + 0.5) / totalSteps) * 100;
  const hoveredHop = hover && trace ? trace.hops[hover.step] : null;

  return (
    <div
      ref={rootRef}
      data-netlab-scrub-timeline=""
      style={{
        background: 'var(--netlab-bg-surface)',
        border: '1px solid var(--netlab-border)',
        borderRadius: 8,
        padding: 8,
        fontFamily: 'ui-monospace, monospace',
        fontSize: 10,
        color: 'var(--netlab-text-secondary)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2px 6px',
        }}
      >
        <span style={{ letterSpacing: 1, color: 'var(--netlab-text-muted)' }}>
          PACKET TIMELINE · TRACE
        </span>
        <span style={{ color: 'var(--netlab-accent-cyan)' }}>
          {stepIdx + 1} / {totalSteps}
          {playing ? ' · ▶' : ''}
        </span>
      </div>
      <div
        ref={trackRef}
        role="slider"
        aria-label="Packet trace scrub"
        aria-valuemin={0}
        aria-valuemax={totalSteps - 1}
        aria-valuenow={stepIdx}
        tabIndex={0}
        onPointerDown={onTrackPointerDown}
        onPointerMove={onTrackPointerMove}
        onPointerUp={onTrackPointerUp}
        onPointerLeave={() => setHover(null)}
        style={{
          position: 'relative',
          height: TRACK_HEIGHT,
          borderRadius: 4,
          background: 'var(--netlab-bg-primary)',
          border: '1px solid var(--netlab-border)',
          cursor: 'pointer',
          touchAction: 'none',
        }}
      >
        {/* past fill */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 1,
            bottom: 1,
            left: 1,
            width: `calc(${pastFill}% - 2px)`,
            background: 'color-mix(in srgb, var(--netlab-accent-cyan) 18%, transparent)',
            borderRadius: 3,
            pointerEvents: 'none',
            transition: 'width 120ms linear',
          }}
        />
        {/* step boundary ticks */}
        {trace?.hops.slice(0, -1).map((_hop, i) => {
          const x = ((i + 1) / totalSteps) * 100;
          return (
            <div
              key={`tick-${i}`}
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${x}%`,
                width: 1,
                background: 'var(--netlab-border)',
                opacity: 0.5,
                pointerEvents: 'none',
              }}
            />
          );
        })}
        {/* event markers — shape encodes the event so it reads without color (M6) */}
        {trace?.hops.map((hop, i) => {
          const x = ((i + 0.5) / totalSteps) * 100;
          const marker = hopEventMarker(hop.event);
          return (
            <button
              key={`m-${hop.step}`}
              type="button"
              aria-label={hopLabel(hop)}
              title={hopLabel(hop)}
              onClick={(e) => {
                e.stopPropagation();
                jumpTo(hop.step);
                engine.pause();
              }}
              onMouseEnter={(e) => stepHover.onEnter(i, e.currentTarget)}
              onMouseLeave={stepHover.onLeave}
              onFocus={(e) => stepHover.onFocus(i, e.currentTarget)}
              onBlur={stepHover.onBlur}
              style={{
                position: 'absolute',
                top: '50%',
                left: `${x}%`,
                display: 'flex',
                transform: 'translate(-50%, -50%)',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: 0,
                lineHeight: 0,
              }}
            >
              <Marker shape={marker.shape} color={marker.color} label={marker.label} size={13} />
            </button>
          );
        })}
        {/* playhead */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -6,
            bottom: -6,
            left: `${playheadX}%`,
            width: 2.4,
            transform: 'translateX(-50%)',
            background: 'var(--netlab-accent-cyan)',
            pointerEvents: 'none',
            borderRadius: 1.2,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: `${playheadX}%`,
            width: 14,
            height: 14,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--netlab-accent-cyan)',
            boxShadow: '0 0 0 6px color-mix(in srgb, var(--netlab-accent-cyan) 22%, transparent)',
            pointerEvents: 'none',
          }}
        />
        {hover && hoveredHop && !stepHover.hovered && (
          <div
            data-netlab-scrub-tooltip=""
            role="tooltip"
            style={{
              position: 'absolute',
              top: TRACK_HEIGHT + 8,
              left: hover.x,
              transform: 'translateX(-50%)',
              padding: '4px 8px',
              borderRadius: 4,
              background: 'var(--netlab-bg-surface)',
              border: '1px solid var(--netlab-accent-cyan)',
              color: 'var(--netlab-text-primary)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 3,
              fontSize: 10,
            }}
          >
            step {hoveredHop.step + 1} · {hoveredHop.event}
            {hoveredHop.nodeLabel ? ` · ${hoveredHop.nodeLabel}` : ''}
          </div>
        )}
      </div>
      {stepHover.hovered && trace?.hops[stepHover.hovered.index] && (
        <StepHoverCard
          step={resolveStepPreview(trace.hops[stepHover.hovered.index]!)}
          anchorRect={stepHover.hovered.rect}
          container={rootRef.current}
        />
      )}
      {!hideKeyboardHint && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 14,
            color: 'var(--netlab-text-muted)',
          }}
        >
          <span>
            <span style={{ color: 'var(--netlab-accent-cyan)' }}>space</span> play ·{' '}
            <span style={{ color: 'var(--netlab-accent-cyan)' }}>←/→</span> step ·{' '}
            <span style={{ color: 'var(--netlab-accent-cyan)' }}>⇧+←/→</span> ±5 ·{' '}
            <span style={{ color: 'var(--netlab-accent-cyan)' }}>home/end</span>
          </span>
          <span>drag the bar to scrub</span>
        </div>
      )}
    </div>
  );
}
