import type React from 'react';
import { Link } from 'react-router-dom';
import { ProgressBadge } from '../../src/components/progress/ProgressBadge';
import type { NetlabAudience } from '../../src/theme';
import { getDemoIcon } from './demoIcons';
import './DemoCard.css';

interface DemoCardData {
  path: string;
  title: string;
  desc: string;
  meta?: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    tags?: string[];
  };
}

interface Category {
  id: string;
  label: string;
  color: string;
  demos: DemoCardData[];
}

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * Pull an accent toward the theme's text colour. On the light accent-tinted
 * chip/link backgrounds the raw accent (e.g. orange var(--netlab-accent-orange)) fails WCAG AA;
 * mixing it ~40% with text-primary darkens it enough to clear 4.5:1 in light
 * theme (and lightens it in dark theme) while keeping the hue. Used for every
 * accent-on-tint label in the card.
 */
function readableAccent(color: string): string {
  return `color-mix(in srgb, ${color} 40%, var(--netlab-text-primary))`;
}

const DIFFICULTY_STYLES: Record<Difficulty, { bg: string; fg: string }> = {
  beginner: {
    bg: 'color-mix(in srgb, var(--netlab-accent-green) 12%, transparent)',
    fg: readableAccent('var(--netlab-accent-green)'),
  },
  intermediate: {
    bg: 'color-mix(in srgb, var(--netlab-accent-yellow) 12%, transparent)',
    fg: readableAccent('var(--netlab-accent-yellow)'),
  },
  advanced: {
    bg: 'color-mix(in srgb, var(--netlab-accent-red) 12%, transparent)',
    fg: readableAccent('var(--netlab-accent-red)'),
  },
};

const LAYER_TAG_STYLE = {
  bg: 'color-mix(in srgb, var(--netlab-accent-cyan) 10%, transparent)',
  fg: readableAccent('var(--netlab-accent-cyan)'),
};

const PROTO_TAG_STYLE = {
  bg: 'color-mix(in srgb, var(--netlab-text-primary) 10%, transparent)',
  fg: 'var(--netlab-text-primary)',
};

function getCardBackground(color: string) {
  return `linear-gradient(180deg, color-mix(in srgb, ${color} 11%, var(--netlab-bg-surface)) 0%, color-mix(in srgb, var(--netlab-bg-surface) 82%, var(--netlab-bg-primary)) 34%, color-mix(in srgb, ${color} 4%, var(--netlab-bg-primary)) 100%)`;
}

function getCardBorderColor(color: string) {
  return `color-mix(in srgb, ${color} 24%, var(--netlab-learning-surface-border))`;
}

function getActionLinkStyle(color: string) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    borderRadius: 999,
    background: `color-mix(in srgb, ${color} 10%, var(--netlab-bg-surface))`,
    border: `1px solid color-mix(in srgb, ${color} 20%, var(--netlab-border))`,
    color: readableAccent(color),
    textDecoration: 'none',
    fontWeight: 700,
  } as const;
}

/**
 * Q10 — audience-aware density. Learner cards are looser with a larger title
 * and tags stacked below; pro cards are denser with the tags beside the title.
 * Returned as CSS vars the `.nl-demo-card` class and inline sizes consume.
 */
function cardDensityVars(audience: NetlabAudience): React.CSSProperties {
  return audience === 'learner'
    ? ({
        '--demo-card-title': '18px',
        '--demo-card-desc': '13px',
        '--demo-card-pad': '20px',
        '--demo-card-meta-dir': 'column',
        '--demo-card-meta-align': 'flex-start',
      } as React.CSSProperties)
    : ({
        '--demo-card-title': '14px',
        '--demo-card-desc': '12px',
        '--demo-card-pad': '14px',
        '--demo-card-meta-dir': 'row',
        '--demo-card-meta-align': 'center',
      } as React.CSSProperties);
}

function Tag({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 4,
        background: bg,
        color: fg,
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 6px',
      }}
    >
      {label}
    </span>
  );
}

interface DemoCardProps {
  demo: DemoCardData;
  category: Category;
  tutorialHref: string | null;
  sandboxHref: string | null;
  assessmentHref: string | null;
  /** `/compare/...` route when this scenario has a topology-group sibling (M4). */
  compareHref?: string | null;
  progressTargetId?: string;
  /** Audience axis (Q10) — drives card density. Defaults to `pro`. */
  audience?: NetlabAudience;
}

export function DemoCard({
  demo,
  category,
  tutorialHref,
  sandboxHref,
  assessmentHref,
  compareHref,
  progressTargetId,
  audience = 'pro',
}: DemoCardProps) {
  const difficulty = demo.meta?.difficulty;
  const tags = demo.meta?.tags ?? [];
  const [layerTag, ...protoTags] = tags;

  return (
    <div
      className="nl-demo-card"
      style={{
        ...cardDensityVars(audience),
        // Learning-surface card: bg/border/hover-border feed the CSS class so
        // the resting shadow is constant and only border-color + translateY
        // animate (Q6). The per-category accent rides in via these vars.
        ['--demo-card-bg' as string]: getCardBackground(category.color),
        ['--demo-card-border' as string]: getCardBorderColor(category.color),
        ['--demo-card-border-hover' as string]: category.color,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Icon tile */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: `linear-gradient(180deg, color-mix(in srgb, ${category.color} 14%, var(--netlab-bg-surface)) 0%, color-mix(in srgb, var(--netlab-bg-surface) 90%, var(--netlab-bg-primary)) 100%)`,
          border: `1px solid color-mix(in srgb, ${category.color} 18%, var(--netlab-border))`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: category.color,
          marginBottom: 10,
          flexShrink: 0,
        }}
      >
        {getDemoIcon(demo.path)}
      </div>

      {/* Title + tags — stacked (learner) or inline (pro) via --demo-card-meta-dir */}
      <div
        style={{
          display: 'flex',
          flexDirection:
            'var(--demo-card-meta-dir, column)' as React.CSSProperties['flexDirection'],
          alignItems: 'var(--demo-card-meta-align, flex-start)',
          flexWrap: 'wrap',
          gap: '6px 10px',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 'var(--demo-card-title, 14px)',
            fontWeight: 700,
            color: 'var(--netlab-text-primary)',
          }}
        >
          {demo.title}
        </div>

        {(difficulty || layerTag || protoTags.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {difficulty && (
              <Tag
                label={difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                bg={DIFFICULTY_STYLES[difficulty].bg}
                fg={DIFFICULTY_STYLES[difficulty].fg}
              />
            )}
            {layerTag && <Tag label={layerTag} bg={LAYER_TAG_STYLE.bg} fg={LAYER_TAG_STYLE.fg} />}
            {protoTags.map((tag) => (
              <Tag key={tag} label={tag} bg={PROTO_TAG_STYLE.bg} fg={PROTO_TAG_STYLE.fg} />
            ))}
            {progressTargetId && <ProgressBadge targetId={progressTargetId} />}
          </div>
        )}
      </div>

      {/* Description */}
      <div
        style={{
          color: 'var(--netlab-text-secondary)',
          fontSize: 'var(--demo-card-desc, 12px)',
          lineHeight: 1.6,
          flex: 1,
          marginBottom: 12,
        }}
      >
        {demo.desc}
      </div>

      {/* Foot links */}
      <div
        style={{
          borderTop: `1px solid color-mix(in srgb, ${category.color} 12%, var(--netlab-border))`,
          paddingTop: 12,
          display: 'flex',
          gap: 8,
          fontSize: 11,
          flexWrap: 'wrap',
        }}
      >
        <Link to={demo.path} style={getActionLinkStyle(category.color)}>
          Open →
        </Link>
        {compareHref && (
          <Link
            to={compareHref}
            data-testid="gallery-compare-link"
            style={getActionLinkStyle('var(--netlab-accent-blue)')}
          >
            Compare ⇄
          </Link>
        )}
        {sandboxHref && (
          <a href={sandboxHref} style={getActionLinkStyle('var(--netlab-accent-yellow)')}>
            Sandbox →
          </a>
        )}
        {tutorialHref && (
          <a href={tutorialHref} style={getActionLinkStyle('var(--netlab-accent-cyan)')}>
            Tutorial →
          </a>
        )}
        {assessmentHref && (
          <a
            href={assessmentHref}
            data-testid="gallery-assessment-link"
            style={getActionLinkStyle('var(--netlab-accent-green)')}
          >
            Assessment →
          </a>
        )}
      </div>
    </div>
  );
}
