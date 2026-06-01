import type React from 'react';
import { useEffect } from 'react';
import type { PacketHop } from '../../types/simulation';
import type { DpTab } from '../NodeDetailPanel/useNodeDetailDock';
import { getDropLesson } from './dropLessons';

const SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const MONO = 'ui-monospace, monospace';

/** Where a drop-event ref navigates: the dropping node's panel, routed to a tab. */
export interface DropNavigateTarget {
  nodeId: string;
  tab?: DpTab;
}

/** Advisory, sandbox-only corrective action surfaced on a drop card. */
export interface DropFix {
  /** Button copy, e.g. `'permit this traffic'`. */
  label: string;
  /** Runs the corrective action (e.g. open the editable ACL tab). */
  onApply: () => void;
}

export interface DropEventCardProps {
  /** The dropped hop. The card resolves its lesson from `hop.reason`. */
  hop: PacketHop;
  /** Called when the card is dismissed (close button or Esc). */
  onClose?: () => void;
  /** Called when a tab-ref is clicked; the host opens the node's detail panel. */
  onNavigate?: ((target: DropNavigateTarget) => void) | undefined;
  /**
   * Advisory fix for the drop. Rendered only when `editable` is true (sandbox /
   * editor), so read-only scenarios stop at the cause display.
   */
  fix?: DropFix | undefined;
  /** Gates the {@link fix} affordance; defaults to `false` (read-only). */
  editable?: boolean;
}

/** Imperative helper: pulse a canvas node element to mark a drop (M2). */
export function pulseDroppingNode(nodeId: string, duration = 750): void {
  if (typeof document === 'undefined') return;
  const el = document.querySelector(`[data-id="${nodeId}"]`);
  if (!el) return;
  el.classList.add('netlab-drop-pulse');
  window.setTimeout(() => el.classList.remove('netlab-drop-pulse'), duration);
}

const SECTION_LABEL: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  color: 'var(--netlab-text-muted)',
};

/**
 * M2 — Drop-event lesson card.
 *
 * Explains a dropped packet (cause / response / why) and offers refs that jump
 * into the dropping node's detail panel or an external RFC. Renders nothing when
 * the hop is not a drop or its `reason` has no authored lesson. Esc closes.
 */
export function DropEventCard({
  hop,
  onClose,
  onNavigate,
  fix,
  editable = false,
}: DropEventCardProps) {
  const lesson = hop.event === 'drop' ? getDropLesson(hop.reason) : undefined;

  useEffect(() => {
    if (!lesson || !onClose) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lesson, onClose]);

  if (!lesson) return null;

  return (
    <div
      className="netlab-page-fade-in"
      data-testid="drop-event-card"
      role="dialog"
      aria-labelledby="drop-event-title"
      style={{
        position: 'absolute',
        left: 12,
        bottom: 12,
        zIndex: 36,
        width: 'min(380px, calc(100% - 24px))',
        boxSizing: 'border-box',
        padding: 14,
        borderRadius: 12,
        border: '1px solid color-mix(in srgb, var(--netlab-accent-red) 45%, var(--netlab-border))',
        background: 'var(--netlab-bg-panel, var(--netlab-bg-surface))',
        color: 'var(--netlab-text-primary)',
        boxShadow: '0 18px 48px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <span
          id="drop-event-title"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: 'var(--netlab-accent-red)',
          }}
        >
          <span aria-hidden>▼</span>
          <span>drop event</span>
        </span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--netlab-text-muted)' }}>
          step {hop.step + 1}
          {hop.nodeLabel ? ` · ${hop.nodeLabel}` : ''}
        </span>
      </div>

      <DropSection label="Cause">
        <span style={{ fontFamily: MONO, fontSize: 12 }}>{lesson.cause.text}</span>
      </DropSection>

      <DropSection label="Response">
        <span style={{ fontFamily: MONO, fontSize: 12 }}>{lesson.response.text}</span>
        {lesson.response.meta && (
          <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--netlab-text-muted)' }}>
            {' '}
            {lesson.response.meta}
          </span>
        )}
      </DropSection>

      <DropSection label="Why">
        <span
          style={{
            fontFamily: SANS,
            fontSize: 12,
            lineHeight: 1.5,
            color: 'var(--netlab-text-secondary)',
          }}
        >
          {lesson.why}
        </span>
      </DropSection>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
        {lesson.refs.map((ref) => (
          <button
            key={ref.label}
            type="button"
            data-testid={`drop-ref-${ref.tab ?? 'link'}`}
            onClick={() => {
              if (ref.tab && onNavigate) {
                onNavigate({ nodeId: hop.nodeId, tab: ref.tab });
              } else if (ref.href) {
                window.open(ref.href, '_blank', 'noopener');
              }
            }}
            style={refStyle('var(--netlab-accent-cyan)')}
          >
            {ref.label} →
          </button>
        ))}
        {editable && fix && (
          <button
            type="button"
            data-testid="drop-fix"
            onClick={fix.onApply}
            style={{
              fontFamily: MONO,
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 6,
              border: '1px solid var(--netlab-accent-cyan)',
              background: 'transparent',
              color: 'var(--netlab-accent-cyan)',
              cursor: 'pointer',
            }}
          >
            {fix.label} →
          </button>
        )}
        {onClose && (
          <button
            type="button"
            data-testid="drop-event-close"
            onClick={onClose}
            style={refStyle('var(--netlab-text-muted)')}
          >
            esc · close
          </button>
        )}
      </div>
    </div>
  );
}

function DropSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={SECTION_LABEL}>{label}</div>
      <div style={{ marginTop: 2 }}>{children}</div>
    </div>
  );
}

function refStyle(color: string): React.CSSProperties {
  return {
    fontFamily: MONO,
    fontSize: 11,
    padding: 0,
    border: 'none',
    background: 'none',
    color,
    cursor: 'pointer',
    textDecoration: 'underline',
  };
}
