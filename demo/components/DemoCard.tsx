import { Link } from 'react-router-dom';
import { getDemoIcon } from './demoIcons';

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

const DIFFICULTY_STYLES: Record<Difficulty, { bg: string; fg: string }> = {
  beginner: {
    bg: 'color-mix(in srgb, var(--netlab-accent-green) 12%, transparent)',
    fg: 'var(--netlab-accent-green)',
  },
  intermediate: {
    bg: 'color-mix(in srgb, var(--netlab-accent-yellow) 12%, transparent)',
    fg: 'var(--netlab-accent-yellow)',
  },
  advanced: {
    bg: 'color-mix(in srgb, var(--netlab-accent-red) 12%, transparent)',
    fg: 'var(--netlab-accent-red)',
  },
};

const LAYER_TAG_STYLE = {
  bg: 'color-mix(in srgb, var(--netlab-accent-cyan) 10%, transparent)',
  fg: 'var(--netlab-accent-cyan)',
};

const PROTO_TAG_STYLE = {
  bg: 'color-mix(in srgb, var(--netlab-text-primary) 10%, transparent)',
  fg: 'var(--netlab-text-secondary)',
};

function getCardBackground(color: string) {
  return `linear-gradient(180deg, color-mix(in srgb, ${color} 11%, var(--netlab-bg-surface)) 0%, color-mix(in srgb, var(--netlab-bg-surface) 82%, var(--netlab-bg-primary)) 34%, color-mix(in srgb, ${color} 4%, var(--netlab-bg-primary)) 100%)`;
}

function getCardBorder(color: string) {
  return `1px solid color-mix(in srgb, ${color} 24%, var(--netlab-border))`;
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
    color,
    textDecoration: 'none',
    fontWeight: 700,
  } as const;
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
}

export function DemoCard({
  demo,
  category,
  tutorialHref,
  sandboxHref,
  assessmentHref,
}: DemoCardProps) {
  const difficulty = demo.meta?.difficulty;
  const tags = demo.meta?.tags ?? [];
  const [layerTag, ...protoTags] = tags;
  const defaultShadow = '0 18px 36px rgba(15, 23, 42, 0.07)';
  const hoverShadow = '0 24px 44px rgba(15, 23, 42, 0.12)';

  return (
    <div
      style={{
        background: getCardBackground(category.color),
        border: getCardBorder(category.color),
        borderRadius: 18,
        padding: '16px 16px 18px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: defaultShadow,
        transition: 'border-color 0.18s, transform 0.18s, box-shadow 0.18s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = category.color;
        el.style.transform = 'translateY(-3px)';
        el.style.boxShadow = hoverShadow;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = `color-mix(in srgb, ${category.color} 24%, var(--netlab-border))`;
        el.style.transform = '';
        el.style.boxShadow = defaultShadow;
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

      {/* Title */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--netlab-text-primary)',
          marginBottom: 6,
        }}
      >
        {demo.title}
      </div>

      {/* Tags row */}
      {(difficulty || layerTag || protoTags.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
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
        </div>
      )}

      {/* Description */}
      <div
        style={{
          color: 'var(--netlab-text-secondary)',
          fontSize: 12,
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
          <a href={assessmentHref} style={getActionLinkStyle('var(--netlab-accent-green)')}>
            Assessment →
          </a>
        )}
      </div>
    </div>
  );
}
