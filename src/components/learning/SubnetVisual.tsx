import { subnetBarLayout } from '../../learning/subnetting/barLayout';
import type { SubnetFacts } from '../../learning/subnetting';

/**
 * The subnet as a picture: one horizontal bar spanning the block from network
 * address to broadcast, the usable-host range shaded inside it, and an
 * optional marker showing where an asked-about address falls (inside or out).
 * Rendered after each drill answer so every question ends as a visual lesson.
 */
export function SubnetVisual({ facts, probeIp }: { facts: SubnetFacts; probeIp?: string }) {
  const layout = subnetBarLayout(facts, probeIp);

  return (
    <figure data-testid="subnet-visual" style={{ margin: 0, display: 'grid', gap: 4 }}>
      <figcaption
        style={{
          color: 'var(--netlab-text-secondary)',
          fontSize: 12,
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        {facts.cidr} — {facts.totalAddresses.toLocaleString('en-US')} addresses,{' '}
        {facts.usableHostCount.toLocaleString('en-US')} usable
      </figcaption>

      <div
        style={{
          position: 'relative',
          height: 34,
          borderRadius: 'var(--netlab-radius-sm)',
          background: 'color-mix(in srgb, var(--netlab-text-secondary) 8%, transparent)',
          overflow: 'hidden',
        }}
      >
        {/* The subnet block. */}
        <div
          data-testid="subnet-visual-block"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${layout.blockLeftPct}%`,
            width: `${layout.blockWidthPct}%`,
            background: 'color-mix(in srgb, var(--netlab-accent-blue) 22%, transparent)',
            border: '1px solid color-mix(in srgb, var(--netlab-accent-blue) 55%, transparent)',
            boxSizing: 'border-box',
          }}
        />
        {/* Usable host range. */}
        {layout.usable && (
          <div
            data-testid="subnet-visual-usable"
            style={{
              position: 'absolute',
              top: 8,
              bottom: 8,
              left: `${layout.usable.leftPct}%`,
              width: `${layout.usable.widthPct}%`,
              background: 'color-mix(in srgb, var(--netlab-accent-green) 30%, transparent)',
            }}
          />
        )}
        {/* Asked-about address. */}
        {layout.probe && (
          <div
            data-testid={`subnet-visual-probe-${layout.probe.inside ? 'inside' : 'outside'}`}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `calc(${layout.probe.pct}% - 1px)`,
              width: 2,
              background: layout.probe.inside
                ? 'var(--netlab-accent-green)'
                : 'var(--netlab-accent-red)',
            }}
          />
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 11,
          color: 'var(--netlab-text-secondary)',
        }}
      >
        <span data-testid="subnet-visual-network">network {facts.networkAddress}</span>
        {facts.firstUsableHost && facts.lastUsableHost && (
          <span data-testid="subnet-visual-hosts">
            hosts {facts.firstUsableHost} – {facts.lastUsableHost}
          </span>
        )}
        <span data-testid="subnet-visual-broadcast">broadcast {facts.broadcastAddress}</span>
      </div>
    </figure>
  );
}
