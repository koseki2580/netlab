/**
 * R09 R4 — Timeline step hover/focus preview.
 *
 * A floating card shown above a timeline step indicator: step number, the M6
 * event marker, the event label, a one-line description, and lightweight delta
 * pills. Hover opens after a 60ms delay (suppressing accidental hovers); focus
 * opens immediately (keyboard nav wants instant feedback). `prefers-reduced-
 * motion` removes the delay and the fade.
 */

import { useEffect, useRef, useState } from 'react';
import type { PacketHop } from '../../types/simulation';
import { Marker, type MarkerShape } from './Marker';
import { hopEventMarker } from './hopMarkers';

const MONO = 'ui-monospace, monospace';

export interface StepPreviewData {
  /** 0-indexed step. */
  index: number;
  marker?: { shape: MarkerShape; color: string };
  /** Short event label, e.g. "ARP request" / "forwarded". */
  label: string;
  /** One-line description. */
  description?: string;
  /** Lightweight delta pills, e.g. ["TCP", "ttl 63"]. */
  delta?: string[];
}

export interface CardBounds {
  left: number;
  right: number;
}

export interface CardPosition {
  left: number;
  top: number;
  arrow: number;
}

/**
 * Position the card centered above the anchor, clamped within `bounds` (8px
 * inset). The arrow tail tracks the anchor center even when the card is shifted.
 */
export function computeCardPosition(
  anchorRect: { left: number; top: number; width: number },
  cardW: number,
  cardH: number,
  bounds: CardBounds,
): CardPosition {
  const ax = anchorRect.left + anchorRect.width / 2;
  const ay = anchorRect.top;
  let left = ax - cardW / 2;
  let arrow = cardW / 2;
  if (left < bounds.left + 8) {
    left = bounds.left + 8;
    arrow = ax - left;
  } else if (left + cardW > bounds.right - 8) {
    left = bounds.right - 8 - cardW;
    arrow = ax - left;
  }
  return { left, top: ay - cardH - 14, arrow };
}

/** Map a packet hop to the card's display model. */
export function resolveStepPreview(hop: PacketHop): StepPreviewData {
  const marker = hopEventMarker(hop.event);
  const out: StepPreviewData = {
    index: hop.step,
    marker: { shape: marker.shape, color: marker.color },
    label: marker.label,
    description: describeHop(hop),
  };
  const delta = hopDelta(hop);
  if (delta.length > 0) out.delta = delta;
  return out;
}

function describeHop(hop: PacketHop): string {
  switch (hop.event) {
    case 'create':
      return `${hop.protocol} packet created at ${hop.nodeLabel}`;
    case 'forward':
      return hop.egressInterfaceName
        ? `forwarded via ${hop.nodeLabel} (${hop.egressInterfaceName})`
        : `forwarded via ${hop.nodeLabel}`;
    case 'deliver':
      return `delivered to ${hop.nodeLabel}`;
    case 'drop':
      return hop.reason
        ? `dropped at ${hop.nodeLabel} · ${hop.reason}`
        : `dropped at ${hop.nodeLabel}`;
    case 'arp-request':
      return `ARP request from ${hop.nodeLabel} (who-has ${hop.dstIp})`;
    case 'arp-reply':
      return `ARP reply from ${hop.nodeLabel}`;
    default:
      return hop.nodeLabel;
  }
}

function hopDelta(hop: PacketHop): string[] {
  const pills: string[] = [];
  if (hop.event !== 'arp-request' && hop.event !== 'arp-reply') {
    pills.push(hop.protocol);
    if (typeof hop.ttl === 'number') pills.push(`ttl ${hop.ttl}`);
  }
  if (hop.action) pills.push(hop.action);
  return pills;
}

function prefersReducedMotion(): boolean {
  return Boolean(
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
}

export interface StepHoverCardProps {
  step: StepPreviewData;
  /** Anchor element rect (viewport coords). */
  anchorRect: { left: number; top: number; width: number };
  /** Container that clips/positions the card. Defaults to the viewport. */
  container?: HTMLElement | null;
}

export function StepHoverCard({ step, anchorRect, container }: StepHoverCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<CardPosition | null>(null);
  const reduce = prefersReducedMotion();

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const rect = container?.getBoundingClientRect();
    const bounds: CardBounds = rect
      ? { left: rect.left, right: rect.right }
      : { left: 0, right: typeof window === 'undefined' ? 1024 : window.innerWidth };
    setCoords(computeCardPosition(anchorRect, card.offsetWidth, card.offsetHeight, bounds));
  }, [anchorRect, container, step]);

  return (
    <div
      ref={cardRef}
      role="tooltip"
      data-testid="step-hover-card"
      style={{
        position: 'fixed',
        zIndex: 50,
        left: coords?.left ?? -9999,
        top: coords?.top ?? -9999,
        minWidth: 240,
        maxWidth: 320,
        padding: '10px 14px',
        background: 'var(--netlab-bg-surface)',
        border: '1px solid var(--netlab-border)',
        borderRadius: 'var(--netlab-radius-sm, 8px)',
        boxShadow: 'var(--netlab-learning-shadow, 0 12px 28px rgba(0,0,0,.32))',
        fontFamily: MONO,
        opacity: coords ? 1 : 0,
        transition: reduce ? 'none' : 'opacity 120ms',
        pointerEvents: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 10, color: 'var(--netlab-text-muted)', letterSpacing: 1 }}>
          {String(step.index + 1).padStart(2, '0')}
        </span>
        {step.marker && <Marker shape={step.marker.shape} color={step.marker.color} size={12} />}
        <span style={{ fontSize: 11, color: 'var(--netlab-text-primary)', fontWeight: 700 }}>
          {step.label}
        </span>
      </div>
      {step.description && (
        <div
          style={{
            marginTop: 6,
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontSize: 12,
            color: 'var(--netlab-text-secondary)',
            lineHeight: 1.4,
          }}
        >
          {step.description}
        </div>
      )}
      {step.delta && step.delta.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {step.delta.map((d) => (
            <span
              key={d}
              style={{
                fontFamily: MONO,
                fontSize: 9,
                padding: '1px 6px',
                borderRadius: 'var(--netlab-radius-pill, 999px)',
                background: 'var(--netlab-bg-elevated)',
                border: '1px solid var(--netlab-border)',
                color: 'var(--netlab-text-secondary)',
              }}
            >
              {d}
            </span>
          ))}
        </div>
      )}
      {coords && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: coords.arrow - 6,
            bottom: -6,
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid var(--netlab-border)',
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// useStepHover — 60ms enter delay (0 on focus / reduced-motion)
// ─────────────────────────────────────────────────────────────────────────────

export interface StepHoverState {
  index: number;
  rect: { left: number; top: number; width: number };
}

export function useStepHover(enterDelay = 60) {
  const [hovered, setHovered] = useState<StepHoverState | null>(null);
  const timerRef = useRef<number | null>(null);

  const clear = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const rectOf = (target: HTMLElement): StepHoverState['rect'] => {
    const r = target.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width };
  };

  const onEnter = (index: number, target: HTMLElement) => {
    const delay = prefersReducedMotion() ? 0 : enterDelay;
    clear();
    const rect = rectOf(target);
    timerRef.current = window.setTimeout(() => setHovered({ index, rect }), delay);
  };

  const onLeave = () => {
    clear();
    setHovered(null);
  };

  // No delay on focus — keyboard nav wants immediate feedback.
  const onFocus = (index: number, target: HTMLElement) => {
    clear();
    setHovered({ index, rect: rectOf(target) });
  };

  useEffect(() => clear, []);

  return { hovered, onEnter, onLeave, onFocus, onBlur: onLeave };
}
