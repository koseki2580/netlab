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

  return (
    <div
      style={{
        background: 'var(--netlab-bg-elevated)',
        border: '1px solid var(--netlab-border)',
        borderRadius: 8,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.15s, transform 0.15s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = category.color;
        el.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = 'var(--netlab-border)';
        el.style.transform = '';
      }}
    >
      {/* Icon tile */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'var(--netlab-bg-surface)',
          border: '1px solid var(--netlab-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--netlab-text-secondary)',
          marginBottom: 10,
          flexShrink: 0,
        }}
      >
        {getDemoIcon(demo.path)}
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 700,
          color: '#f1f5f9',
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
          lineHeight: 1.5,
          flex: 1,
          marginBottom: 10,
        }}
      >
        {demo.desc}
      </div>

      {/* Foot links */}
      <div
        style={{
          borderTop: '1px dashed var(--netlab-border)',
          paddingTop: 10,
          display: 'flex',
          gap: 10,
          fontSize: 11,
          flexWrap: 'wrap',
        }}
      >
        <Link to={demo.path} style={{ color: category.color, textDecoration: 'none' }}>
          Open →
        </Link>
        {sandboxHref && (
          <a
            href={sandboxHref}
            style={{ color: 'var(--netlab-accent-yellow)', textDecoration: 'none' }}
          >
            Sandbox →
          </a>
        )}
        {tutorialHref && (
          <a
            href={tutorialHref}
            style={{ color: 'var(--netlab-accent-cyan)', textDecoration: 'none' }}
          >
            Tutorial →
          </a>
        )}
        {assessmentHref && (
          <a
            href={assessmentHref}
            style={{ color: 'var(--netlab-accent-green)', textDecoration: 'none' }}
          >
            Assessment →
          </a>
        )}
      </div>
    </div>
  );
}
