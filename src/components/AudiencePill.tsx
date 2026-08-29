import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { NetlabAudience } from '../theme';

/**
 * Q7 — persistent audience segmented pill.
 *
 * Surfaces the `learner | pro` axis from Tweaks into a top-level control on
 * both the Gallery (learning-surface) and the Simulator (terminal-surface).
 * Shares persistence with the Gallery: `localStorage['netlab-audience']` plus
 * the `?audience=` URL param, and broadcasts a `netlab:audience` event so
 * uncontrolled consumers (M1 PreFlightBrief, demo audience) reflow live.
 */

const AUDIENCE_KEY = 'netlab-audience';
const AUDIENCE_EVENT = 'netlab:audience';
const MONO = 'ui-monospace, monospace';
const OPTIONS: NetlabAudience[] = ['learner', 'pro'];

function readAudience(): NetlabAudience {
  try {
    const url = new URLSearchParams(window.location.search).get('audience');
    if (url === 'learner' || url === 'pro') return url;
    const stored = window.localStorage.getItem(AUDIENCE_KEY);
    if (stored === 'learner' || stored === 'pro') return stored;
  } catch {
    /* SSR / private mode — fall through to default */
  }
  return 'pro';
}

function persistAudience(value: NetlabAudience): void {
  try {
    window.localStorage.setItem(AUDIENCE_KEY, value);
    const url = new URL(window.location.href);
    url.searchParams.set('audience', value);
    window.history.replaceState(null, '', url.toString());
  } catch {
    /* storage / history unavailable — keep the in-memory value */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUDIENCE_EVENT, { detail: value }));
  }
}

/**
 * Subscribe to the active audience without owning the state. Reacts to the
 * `netlab:audience` event, so a pill flip anywhere updates every consumer
 * (e.g. PreFlightBrief switching between full card and strip) without reload.
 */
export function useAudience(): NetlabAudience {
  const [audience, setAudience] = useState<NetlabAudience>(() => readAudience());
  useEffect(() => {
    function handler(event: Event) {
      const detail = (event as CustomEvent<NetlabAudience>).detail;
      if (detail === 'learner' || detail === 'pro') setAudience(detail);
    }
    window.addEventListener(AUDIENCE_EVENT, handler);
    return () => window.removeEventListener(AUDIENCE_EVENT, handler);
  }, []);
  return audience;
}

export interface AudiencePillProps {
  /** When provided the pill is fully controlled by the parent (Gallery owns state). */
  value?: NetlabAudience;
  onChange?: (next: NetlabAudience) => void;
  /** `'learning'` = Gallery surface (larger); `'terminal'` = Simulator (compact). */
  variant?: 'learning' | 'terminal';
  className?: string;
  style?: React.CSSProperties;
}

export function AudiencePill({
  value,
  onChange,
  variant = 'terminal',
  className,
  style,
}: AudiencePillProps) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState<NetlabAudience>(() => value ?? readAudience());
  const current = controlled ? value : internal;

  const handleClick = useCallback(
    (next: NetlabAudience) => {
      if (next === current) return;
      if (!controlled) {
        setInternal(next);
        persistAudience(next);
      }
      onChange?.(next);
    },
    [controlled, current, onChange],
  );

  // Uncontrolled: re-sync from storage when the tab regains focus (the user may
  // have changed the axis on another surface / tab).
  useEffect(() => {
    if (controlled) return undefined;
    function refocus() {
      setInternal(readAudience());
    }
    window.addEventListener('focus', refocus);
    return () => window.removeEventListener('focus', refocus);
  }, [controlled]);

  const size =
    variant === 'learning' ? { pad: '4px 12px', font: 11 } : { pad: '2px 10px', font: 10 };

  return (
    <div
      role="radiogroup"
      aria-label="Audience"
      data-testid="audience-pill"
      data-variant={variant}
      data-audience={current}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 2,
        borderRadius: 'var(--netlab-radius-pill, 999px)',
        background: 'var(--netlab-bg-elevated)',
        border: '1px solid var(--netlab-border)',
        fontFamily: MONO,
        fontSize: size.font,
        ...style,
      }}
    >
      {OPTIONS.map((opt) => {
        const active = current === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt}
            onClick={() => handleClick(opt)}
            style={{
              // Explicit resets rather than `all: unset`. Unsetting everything
              // takes `display` back to inline and drops the button's own box,
              // and the result hit-tested far outside its bounding rectangle:
              // this pill made the OSPF lesson's "Fail link" button —
              // three hundred pixels away — impossible to click, while every
              // rectangle involved looked correct.
              appearance: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              margin: 0,
              border: 0,
              font: 'inherit',
              // Anchors the hit-area overlay that `shell-chrome.css` puts on
              // every button in the command bar. Without it the overlay
              // anchored to the toolbar row instead and became an invisible
              // full-width shield: the OSPF lesson's "Fail link" button, three
              // hundred pixels away, could not be clicked at all.
              position: 'relative',
              cursor: 'pointer',
              padding: size.pad,
              borderRadius: 'var(--netlab-radius-pill, 999px)',
              // Darkened cyan (vs raw accent) so the active label clears WCAG AA
              // on its light cyan-tinted pill; text-secondary for the inactive.
              color: active
                ? 'color-mix(in srgb, var(--netlab-accent-cyan) 45%, var(--netlab-text-primary))'
                : 'var(--netlab-text-secondary)',
              background: active
                ? 'color-mix(in srgb, var(--netlab-accent-cyan) 14%, transparent)'
                : 'transparent',
              fontWeight: active ? 700 : 400,
              letterSpacing: 0.3,
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
