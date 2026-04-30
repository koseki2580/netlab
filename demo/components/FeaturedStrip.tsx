interface SandboxIntro {
  id: string;
  title: string;
  desc: string;
  href: string;
  badge: string;
}

interface FeaturedStripProps {
  intros: readonly SandboxIntro[];
}

export function FeaturedStrip({ intros }: FeaturedStripProps) {
  const [featured, ...rest] = intros;
  if (!featured) return null;

  return (
    <section id="featured" style={{ marginBottom: 40 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingBottom: 12,
          borderBottom: '1px solid var(--netlab-border)',
          marginBottom: 16,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--netlab-accent-yellow)',
          }}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#f1f5f9',
          }}
        >
          Start here
        </span>
        <span
          style={{
            fontSize: 12,
            fontStyle: 'italic',
            color: 'var(--netlab-text-muted)',
          }}
        >
          — recommended entry points
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: 'var(--netlab-text-muted)',
          }}
        >
          {intros.length} demos
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 12,
        }}
      >
        {/* Big feature card */}
        <a
          href={featured.href}
          style={{
            display: 'block',
            background: `radial-gradient(ellipse at 20% 50%, color-mix(in srgb, var(--netlab-accent-cyan) 12%, transparent), transparent 60%), var(--netlab-bg-elevated)`,
            border: '1px solid var(--netlab-border)',
            borderRadius: 8,
            padding: '20px 24px',
            textDecoration: 'none',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--netlab-accent-cyan)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--netlab-border)';
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 999,
              background: 'color-mix(in srgb, var(--netlab-accent-cyan) 14%, transparent)',
              color: 'var(--netlab-accent-cyan)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              padding: '4px 10px',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Recommended · 5 min
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#f1f5f9',
              marginBottom: 8,
            }}
          >
            {featured.title}
          </div>
          <p
            style={{
              fontSize: 12,
              color: 'var(--netlab-text-secondary)',
              lineHeight: 1.6,
              marginBottom: 16,
            }}
          >
            {featured.desc}
          </p>
          <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
            <span style={{ color: 'var(--netlab-accent-cyan)' }}>Open intro →</span>
          </div>
        </a>

        {/* Mini list */}
        <div
          style={{
            background: 'var(--netlab-bg-elevated)',
            border: '1px solid var(--netlab-border)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {rest.map((intro, index) => (
            <a
              key={intro.id}
              href={intro.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                textDecoration: 'none',
                borderBottom:
                  index < rest.length - 1 ? '1px solid var(--netlab-border)' : undefined,
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  'var(--netlab-bg-surface)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = '';
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--netlab-text-muted)',
                  minWidth: 24,
                }}
              >
                {String(index + 2).padStart(2, '0')}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#f1f5f9',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {intro.title}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--netlab-text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {intro.badge}
                </div>
              </div>
              <span style={{ color: 'var(--netlab-text-muted)', fontSize: 14 }}>›</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
