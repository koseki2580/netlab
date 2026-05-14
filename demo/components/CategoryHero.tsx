import type React from 'react';

export interface CategoryHeroPill {
  tone: 'up' | 'info' | 'warn';
  label: string;
}

export interface CategoryHeroProps {
  /** Display title — usually the category label. */
  title: string;
  /** One-line summary of the track. */
  blurb: string;
  /** Accent color — a CSS variable like `var(--netlab-accent-green)`. */
  accent: string;
  /** Number of done items. */
  doneCount: number;
  /** Number of total items. */
  totalCount: number;
  /** Tagged pills shown under the title. */
  pills: readonly CategoryHeroPill[];
  /** Optional eyebrow override — defaults to `<title> track · X / Y complete`. */
  eyebrowOverride?: string;
}

const PILL_PALETTE = {
  up: 'var(--netlab-accent-green)',
  info: 'var(--netlab-accent-cyan)',
  warn: 'var(--netlab-accent-yellow)',
} as const;

function pillStyle(tone: CategoryHeroPill['tone']): React.CSSProperties {
  const color = PILL_PALETTE[tone];
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 4,
    fontFamily: 'ui-monospace, monospace',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.4,
    color,
    background: `color-mix(in srgb, ${color} 12%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 30%, var(--netlab-border))`,
  };
}

export function CategoryHero({
  title,
  blurb,
  accent,
  doneCount,
  totalCount,
  pills,
  eyebrowOverride,
}: CategoryHeroProps) {
  const ratio = totalCount === 0 ? 0 : doneCount / totalCount;
  const percent = Math.round(ratio * 100);
  const eyebrow =
    eyebrowOverride ?? `${title.toLowerCase()} track · ${doneCount} / ${totalCount} complete`;

  return (
    <div
      role="region"
      aria-label={`${title} track overview`}
      style={{
        padding: 24,
        borderRadius: 14,
        background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 14%, var(--netlab-bg-surface)) 0%, var(--netlab-bg-surface) 60%, var(--netlab-bg-primary) 100%)`,
        border: `1px solid color-mix(in srgb, ${accent} 22%, var(--netlab-border))`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 'var(--netlab-eyebrow, 10px)',
          fontWeight: 700,
          letterSpacing: 1,
          color: 'var(--netlab-text-muted)',
          textTransform: 'uppercase',
        }}
      >
        <span
          aria-hidden="true"
          style={{ width: 6, height: 6, borderRadius: 999, background: accent }}
        />
        {eyebrow}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          marginTop: 10,
          letterSpacing: -0.4,
          color: 'var(--netlab-text-primary)',
        }}
      >
        {title}
      </div>
      <p
        style={{
          fontSize: 'var(--netlab-font, 13px)',
          color: 'var(--netlab-text-secondary)',
          marginTop: 8,
          maxWidth: 620,
          lineHeight: 1.6,
        }}
      >
        {blurb}
      </p>
      {pills.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {pills.map((pill) => (
            <span key={`${pill.tone}-${pill.label}`} style={pillStyle(pill.tone)}>
              {pill.label}
            </span>
          ))}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`${doneCount} of ${totalCount} complete`}
        style={{
          height: 6,
          marginTop: 14,
          borderRadius: 999,
          background: 'var(--netlab-bg-elevated)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: accent,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}
