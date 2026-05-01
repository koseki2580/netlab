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
    <section
      id="featured"
      style={{
        marginBottom: 0,
        padding: '24px',
        borderRadius: 28,
        border: '1px solid color-mix(in srgb, var(--netlab-accent-cyan) 20%, var(--netlab-border))',
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--netlab-accent-cyan) 12%, var(--netlab-bg-surface)) 0%, color-mix(in srgb, var(--netlab-accent-cyan) 5%, var(--netlab-bg-primary)) 100%)',
        boxShadow: '0 20px 44px rgba(15, 23, 42, 0.07)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 18,
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
            color: 'var(--netlab-text-primary)',
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
          gap: 16,
        }}
      >
        {/* Big feature card */}
        <a
          href={featured.href}
          style={{
            display: 'block',
            background:
              'radial-gradient(circle at top left, color-mix(in srgb, var(--netlab-accent-cyan) 18%, var(--netlab-bg-surface)), transparent 42%), linear-gradient(135deg, color-mix(in srgb, var(--netlab-accent-cyan) 11%, var(--netlab-bg-surface)) 0%, color-mix(in srgb, var(--netlab-bg-surface) 82%, var(--netlab-bg-primary)) 58%, color-mix(in srgb, var(--netlab-accent-yellow) 10%, var(--netlab-bg-primary)) 100%)',
            border:
              '1px solid color-mix(in srgb, var(--netlab-accent-cyan) 22%, var(--netlab-border))',
            borderRadius: 22,
            padding: '20px 24px',
            textDecoration: 'none',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08)',
            transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--netlab-accent-cyan)';
            (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLAnchorElement).style.boxShadow =
              '0 24px 46px rgba(15, 23, 42, 0.12)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor =
              'color-mix(in srgb, var(--netlab-accent-cyan) 22%, var(--netlab-border))';
            (e.currentTarget as HTMLAnchorElement).style.transform = '';
            (e.currentTarget as HTMLAnchorElement).style.boxShadow =
              '0 20px 40px rgba(15, 23, 42, 0.08)';
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
              color: 'var(--netlab-text-primary)',
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
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '5px 10px',
                borderRadius: 999,
                background:
                  'color-mix(in srgb, var(--netlab-accent-cyan) 14%, var(--netlab-bg-surface))',
                color: 'var(--netlab-accent-cyan)',
                fontWeight: 700,
              }}
            >
              Open intro →
            </span>
          </div>
        </a>

        {/* Mini list */}
        <div
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--netlab-accent-yellow) 9%, var(--netlab-bg-surface)) 0%, color-mix(in srgb, var(--netlab-accent-yellow) 4%, var(--netlab-bg-primary)) 100%)',
            border:
              '1px solid color-mix(in srgb, var(--netlab-accent-yellow) 18%, var(--netlab-border))',
            borderRadius: 22,
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.06)',
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
                  'color-mix(in srgb, var(--netlab-accent-cyan) 8%, var(--netlab-bg-surface))';
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
                    color: 'var(--netlab-text-primary)',
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
