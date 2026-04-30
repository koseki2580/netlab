import type { ReactNode } from 'react';

type Variant = 'default' | 'error' | 'success';
type Density = 'block' | 'inline';

const RING_COLORS: Record<Variant, string> = {
  default: 'var(--netlab-border)',
  error: 'var(--netlab-accent-red)',
  success: 'var(--netlab-accent-green)',
};

export interface EmptyStateProps {
  /** Optional 48×48 inline SVG icon. */
  icon?: ReactNode;
  /** Headline. 14px bold. */
  title: string;
  /** Body copy. 12px, --netlab-text-secondary. */
  description?: string;
  /** Optional CTA button. */
  action?: { label: string; onClick: () => void };
  /** Controls icon ring color only. Default: 'default'. */
  variant?: Variant;
  /** 'block' adds 48px vertical padding; 'inline' has none. Default: 'block'. */
  density?: Density;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  density = 'block',
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 12,
        maxWidth: 360,
        margin: '0 auto',
        padding: density === 'block' ? '48px 16px' : '0',
      }}
    >
      {icon && (
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            border: `1px solid ${RING_COLORS[variant]}`,
            background: 'var(--netlab-bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      )}
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--netlab-text-primary)',
          fontFamily: 'monospace',
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--netlab-text-secondary)',
            fontFamily: 'monospace',
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="netlab-focus-ring"
          style={{
            height: 32,
            padding: '0 14px',
            background: 'var(--netlab-accent-blue)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            fontFamily: 'monospace',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter = '';
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
