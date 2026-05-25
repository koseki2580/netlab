import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { getScenarioBrief } from '../scenarios';
import type { BriefConclusion, BriefWatchPoint, ScenarioBrief } from '../scenarios/types';
import type { NetlabAudience } from '../theme';

export interface PreFlightBriefProps {
  /** Scenario id — used to resolve the brief (when `brief` is omitted) and to key persistence. */
  scenarioId: string;
  /** Brief to render. Defaults to `getScenarioBrief(scenarioId)`; pass directly to decouple. */
  brief?: ScenarioBrief;
  /** Learner sees the full overlay on first visit; pro always sees the compact strip. */
  audience?: NetlabAudience;
  /** When `true`, the conclusion card replaces the brief (final timeline step). */
  isLastStep?: boolean;
  /** Called when the learner dismisses the full overlay (persists the "seen" flag). */
  onStart?: () => void;
  /** Called with a conclusion action id when an action button is clicked. */
  onAction?: (actionId: string) => void;
  /**
   * Extra content rendered inside the conclusion card, below the action row
   * (Q8 — the next-scenario rail). The caller owns routing, so this stays a
   * slot rather than the brief reaching into the scenario registry / router.
   */
  conclusionExtra?: React.ReactNode;
}

const SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const MONO = 'ui-monospace, monospace';

const WATCH_KIND_COLOR: Record<string, string> = {
  route: 'var(--netlab-accent-cyan)',
  spf: 'var(--netlab-accent-green)',
  lsa: 'var(--netlab-accent-yellow)',
  hello: 'var(--netlab-accent-blue)',
  fragment: 'var(--netlab-accent-orange)',
  reassembly: 'var(--netlab-accent-green)',
};

function watchColor(kind: string): string {
  return WATCH_KIND_COLOR[kind] ?? 'var(--netlab-text-secondary)';
}

function readSeen(storageKey: string): boolean {
  try {
    return window.localStorage.getItem(storageKey) === '1';
  } catch {
    return false;
  }
}

function writeSeen(storageKey: string): void {
  try {
    window.localStorage.setItem(storageKey, '1');
  } catch {
    /* localStorage unavailable (private mode / SSR) — dismissal is in-memory only */
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

/** The CommandPalette mounts `[data-netlab-command-palette]`; don't steal its keys. */
function isCommandPaletteOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector('[data-netlab-command-palette]'));
}

/**
 * P11 — reopen the brief with `B` when it is currently closed. `B` (not `?`,
 * which the shell already binds to the help popover) avoids a double-fire.
 * Suppressed while typing or while the command palette owns the keyboard.
 */
function useReopenShortcut(enabled: boolean, onReopen: () => void): void {
  useEffect(() => {
    if (!enabled) return undefined;
    const handler = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'b') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (isCommandPaletteOpen()) return;
      event.preventDefault();
      onReopen();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onReopen]);
}

/**
 * M1 — Pre-flight brief overlay.
 *
 * Renders one of three forms based on state:
 *   - **Full card** — first visit for `audience='learner'` (or strip click → expand).
 *   - **Compact strip** — repeat visit, or `audience='pro'`.
 *   - **Conclusion** — when `isLastStep` is `true`.
 *
 * Dismissal persists to `localStorage['nl_brief_seen_<scenarioId>']`.
 */
export function PreFlightBrief({
  scenarioId,
  brief: briefProp,
  audience = 'learner',
  isLastStep = false,
  onStart,
  onAction,
  conclusionExtra,
}: PreFlightBriefProps) {
  const brief = briefProp ?? getScenarioBrief(scenarioId);
  const storageKey = `nl_brief_seen_${scenarioId}`;
  const [seen, setSeen] = useState<boolean>(() => readSeen(storageKey));
  const [expanded, setExpanded] = useState(false);

  const dismiss = useCallback(() => {
    writeSeen(storageKey);
    setSeen(true);
    setExpanded(false);
    onStart?.();
  }, [storageKey, onStart]);

  const reopen = useCallback(() => setExpanded(true), []);

  // Which full card is on screen (if any) drives the keyboard handler.
  const fullCardMode: 'fresh' | 'expanded' | null =
    brief && !isLastStep
      ? expanded
        ? 'expanded'
        : !seen && audience === 'learner'
          ? 'fresh'
          : null
      : null;

  // P11 — `B` reopens the brief only when no full card is already showing.
  useReopenShortcut(Boolean(brief) && !isLastStep && !fullCardMode, reopen);

  useEffect(() => {
    if (!fullCardMode) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
        event.preventDefault();
        if (fullCardMode === 'fresh') {
          dismiss();
        } else {
          setExpanded(false);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullCardMode, dismiss]);

  if (!brief) return null;
  if (isLastStep)
    return (
      <BriefConclusionCard
        conclusion={brief.conclusion}
        onAction={onAction}
        extra={conclusionExtra}
      />
    );

  if (fullCardMode === 'fresh') {
    return <BriefFullCard brief={brief} onStart={dismiss} />;
  }

  const showStrip = seen || audience === 'pro';
  if (showStrip) {
    return (
      <>
        <BriefStrip brief={brief} onExpand={() => setExpanded(true)} />
        {expanded && <BriefFullCard brief={brief} onStart={() => setExpanded(false)} />}
      </>
    );
  }
  return null;
}

// ─── Full card ──────────────────────────────────────────────────────────────

const SCRIM_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  // P10: dim only — no backdrop blur. The learner is about to study the
  // topology behind the card, so it must stay in focus, just de-emphasised.
  background: 'color-mix(in srgb, var(--netlab-bg-primary) 55%, transparent)',
};

const CARD_STYLE: React.CSSProperties = {
  width: 'min(440px, 100%)',
  maxHeight: '100%',
  overflowY: 'auto',
  boxSizing: 'border-box',
  padding: 18,
  borderRadius: 12,
  border: '1px solid var(--netlab-border)',
  background: 'var(--netlab-bg-panel, var(--netlab-bg-surface))',
  color: 'var(--netlab-text-primary)',
  boxShadow: '0 24px 64px rgba(0, 0, 0, 0.45)',
};

function eyebrow(text: string): React.ReactElement {
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: 'var(--netlab-text-muted)',
      }}
    >
      {text}
    </div>
  );
}

function BriefFullCard({ brief, onStart }: { brief: ScenarioBrief; onStart: () => void }) {
  return (
    <div
      className="netlab-page-fade-in"
      data-testid="preflight-fullcard"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preflight-title"
      style={SCRIM_STYLE}
    >
      <div style={CARD_STYLE}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            {eyebrow('brief · scenario')}
            <h2
              id="preflight-title"
              style={{ margin: '4px 0 0', fontFamily: SANS, fontSize: 16, lineHeight: 1.4 }}
            >
              {brief.goal}
            </h2>
          </div>
          {brief.est && (
            <span
              style={{
                flexShrink: 0,
                fontFamily: MONO,
                fontSize: 10,
                color: 'var(--netlab-text-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              {brief.est}
            </span>
          )}
        </div>

        <BriefRow label="Prereq">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {brief.prereq.map((p) => (
              <span
                key={p.id}
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 999,
                  border: '1px solid var(--netlab-border-subtle)',
                  color: p.done ? 'var(--netlab-accent-green)' : 'var(--netlab-text-muted)',
                }}
              >
                {p.done ? '● ' : '○ '}
                {p.label}
              </span>
            ))}
          </div>
        </BriefRow>

        <BriefRow label="Watch for">
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
            {brief.watchPoints.map((w) => (
              <WatchItem key={`${w.step}-${w.kind}`} point={w} />
            ))}
          </ol>
        </BriefRow>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 16,
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--netlab-text-muted)' }}>
            <kbd style={KBD_STYLE}>⏎</kbd> / <kbd style={KBD_STYLE}>space</kbd> to begin
          </span>
          <button
            type="button"
            data-testid="preflight-start"
            onClick={onStart}
            autoFocus
            style={{
              fontFamily: MONO,
              fontSize: 12,
              fontWeight: 700,
              padding: '7px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              color: 'var(--netlab-bg-primary)',
              background: 'var(--netlab-accent-blue)',
              border: '1px solid var(--netlab-accent-blue)',
            }}
          >
            Start ▶
          </button>
        </div>
      </div>
    </div>
  );
}

const KBD_STYLE: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 9,
  padding: '1px 5px',
  borderRadius: 4,
  border: '1px solid var(--netlab-border)',
  color: 'var(--netlab-text-secondary)',
};

function BriefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 10, marginTop: 12 }}>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: 'var(--netlab-text-muted)',
          paddingTop: 2,
        }}
      >
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

function WatchItem({ point }: { point: BriefWatchPoint }) {
  return (
    <li style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span aria-hidden style={{ color: watchColor(point.kind), fontSize: 10 }}>
        ●
      </span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 9,
          color: 'var(--netlab-text-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        step {point.step}
      </span>
      <span style={{ fontFamily: SANS, fontSize: 12, color: 'var(--netlab-text-secondary)' }}>
        {point.label}
      </span>
    </li>
  );
}

// ─── Compact strip ────────────────────────────────────────────────────────────

function BriefStrip({ brief, onExpand }: { brief: ScenarioBrief; onExpand: () => void }) {
  return (
    <button
      type="button"
      data-testid="preflight-strip"
      onClick={onExpand}
      title="Show brief (press B)"
      style={{
        position: 'absolute',
        left: 12,
        bottom: 12,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        maxWidth: 'min(420px, calc(100% - 24px))',
        padding: '6px 12px',
        borderRadius: 999,
        cursor: 'pointer',
        textAlign: 'left',
        border: '1px solid var(--netlab-border)',
        background: 'var(--netlab-bg-panel, var(--netlab-bg-surface))',
        color: 'var(--netlab-text-secondary)',
        fontFamily: MONO,
        fontSize: 11,
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: 'var(--netlab-text-muted)',
        }}
      >
        goal
      </span>
      <span
        style={{
          fontFamily: SANS,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: 'var(--netlab-text-primary)',
        }}
      >
        {brief.goal}
      </span>
      <span style={{ color: 'var(--netlab-text-muted)', whiteSpace: 'nowrap' }}>
        · {brief.watchPoints.length} watch-points
      </span>
    </button>
  );
}

// ─── Conclusion (final step) ──────────────────────────────────────────────────

function BriefConclusionCard({
  conclusion,
  onAction,
  extra,
}: {
  conclusion: BriefConclusion;
  onAction?: ((actionId: string) => void) | undefined;
  extra?: React.ReactNode;
}) {
  return (
    <div
      className="netlab-page-fade-in"
      data-testid="preflight-conclusion"
      role="status"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 20,
        transform: 'translateX(-50%)',
        zIndex: 35,
        width: 'min(460px, calc(100% - 24px))',
        boxSizing: 'border-box',
        padding: 16,
        borderRadius: 12,
        border:
          '1px solid color-mix(in srgb, var(--netlab-accent-green) 40%, var(--netlab-border))',
        background: 'var(--netlab-bg-panel, var(--netlab-bg-surface))',
        color: 'var(--netlab-text-primary)',
        boxShadow: '0 18px 48px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: MONO,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: 'var(--netlab-accent-green)',
        }}
      >
        <span aria-hidden>✓</span>
        <span>scenario complete</span>
      </div>
      <div style={{ marginTop: 8 }}>
        <strong style={{ fontFamily: SANS, fontSize: 14, lineHeight: 1.4 }}>
          {conclusion.headline}
        </strong>
        <div
          style={{
            marginTop: 6,
            fontFamily: SANS,
            fontSize: 12,
            lineHeight: 1.5,
            color: 'var(--netlab-text-secondary)',
          }}
        >
          {conclusion.detail}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        {conclusion.actions.map((action) => {
          const primary = action.kind === 'primary';
          return (
            <button
              key={action.id}
              type="button"
              data-testid={`preflight-action-${action.id}`}
              onClick={() => onAction?.(action.id)}
              style={{
                fontFamily: MONO,
                fontSize: 11,
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                color: primary ? 'var(--netlab-bg-primary)' : 'var(--netlab-text-secondary)',
                background: primary ? 'var(--netlab-accent-blue)' : 'transparent',
                border: `1px solid ${
                  primary ? 'var(--netlab-accent-blue)' : 'var(--netlab-border)'
                }`,
              }}
            >
              {action.label}
            </button>
          );
        })}
      </div>
      {extra}
    </div>
  );
}
