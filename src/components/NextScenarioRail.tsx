import type React from 'react';
import type { Scenario } from '../scenarios/types';

/**
 * Q8 — next-scenario rail.
 *
 * Renders up to three recommended scenarios at the bottom of the M1 conclusion
 * card so a learner has a clear forward path after finishing. Routing is the
 * caller's concern: the rail only emits `onOpen(scenarioId)`.
 */

const MONO = 'ui-monospace, monospace';
const SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif';

const DIFFICULTY_RANK: Record<Scenario['metadata']['difficulty'], number> = {
  intro: 0,
  core: 1,
  advanced: 2,
};

/**
 * Recommend up to `limit` scenarios to do next. Priority, each dedup-merged:
 *   1. Same `topologyGroup` (directly comparable)
 *   2. Same `difficulty` (closest in rank first)
 *   3. Shares a protocol (related topic)
 *   4. Anything else, in registration order (filler)
 *
 * The current scenario is always excluded.
 */
export function getRecommendedNext(
  current: Scenario,
  all: readonly Scenario[],
  limit = 3,
): Scenario[] {
  const others = all.filter((s) => s.metadata.id !== current.metadata.id);
  const seen = new Set<string>();
  const out: Scenario[] = [];

  const push = (s: Scenario) => {
    if (seen.has(s.metadata.id) || out.length >= limit) return;
    seen.add(s.metadata.id);
    out.push(s);
  };

  if (current.topologyGroup) {
    others.filter((s) => s.topologyGroup === current.topologyGroup).forEach(push);
  }
  others
    .filter((s) => s.metadata.difficulty === current.metadata.difficulty)
    .sort((a, b) => DIFFICULTY_RANK[a.metadata.difficulty] - DIFFICULTY_RANK[b.metadata.difficulty])
    .forEach(push);
  const currentProtocols = new Set(current.metadata.protocols);
  others.filter((s) => s.metadata.protocols.some((p) => currentProtocols.has(p))).forEach(push);
  others.forEach(push);

  return out.slice(0, limit);
}

export interface NextScenarioRailProps {
  /** Recommended scenarios, already ordered (see {@link getRecommendedNext}). */
  next: readonly Scenario[];
  /** Open a scenario; the caller resolves the route. */
  onOpen: (scenarioId: string) => void;
}

export function NextScenarioRail({ next, onOpen }: NextScenarioRailProps) {
  if (next.length === 0) return null;
  return (
    <div data-testid="next-scenario-rail" style={WRAP}>
      <div style={EYEBROW}>up next</div>
      <div role="list" style={ROW}>
        {next.map((scenario, i) => (
          <NextCard
            key={scenario.metadata.id}
            scenario={scenario}
            ordinal={i + 1}
            primary={i === 0}
            onOpen={() => onOpen(scenario.metadata.id)}
          />
        ))}
      </div>
    </div>
  );
}

function NextCard({
  scenario,
  ordinal,
  primary,
  onOpen,
}: {
  scenario: Scenario;
  ordinal: number;
  primary: boolean;
  onOpen: () => void;
}) {
  const { title, difficulty } = scenario.metadata;
  const est = scenario.brief?.est;
  return (
    <button
      type="button"
      role="listitem"
      data-testid={`next-scenario-${scenario.metadata.id}`}
      onClick={onOpen}
      style={{
        all: 'unset',
        cursor: 'pointer',
        flex: 1,
        minWidth: 0,
        padding: '12px 14px',
        boxSizing: 'border-box',
        borderRadius: 'var(--netlab-radius-md, 16px)',
        border: `1px solid ${primary ? 'var(--netlab-accent-cyan)' : 'var(--netlab-learning-surface-border)'}`,
        background: primary
          ? 'color-mix(in srgb, var(--netlab-accent-cyan) 10%, var(--netlab-bg-surface))'
          : 'var(--netlab-bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={CARD_HEAD}>
        <span
          style={{
            ...EYEBROW,
            color: primary ? 'var(--netlab-accent-cyan)' : 'var(--netlab-text-muted)',
          }}
        >
          {String(ordinal).padStart(2, '0')} · {difficulty}
        </span>
        <span aria-hidden style={{ marginLeft: 'auto', color: 'var(--netlab-text-muted)' }}>
          →
        </span>
      </div>
      <div style={CARD_TITLE}>{title}</div>
      {est && <div style={CARD_META}>{est}</div>}
    </button>
  );
}

const WRAP: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  marginTop: 14,
  paddingTop: 12,
  borderTop: '1px solid var(--netlab-border-subtle)',
};
const ROW: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'stretch' };
const EYEBROW: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: 'var(--netlab-text-muted)',
};
const CARD_HEAD: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 };
const CARD_TITLE: React.CSSProperties = {
  fontFamily: SANS,
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--netlab-text-primary)',
  letterSpacing: -0.2,
};
const CARD_META: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  color: 'var(--netlab-text-secondary)',
};
