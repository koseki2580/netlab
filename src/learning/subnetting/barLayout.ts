import { ipToInt } from '../../utils/cidr';
import type { SubnetFacts } from './types';

/** Percent positions for rendering a subnet block as a horizontal bar. */
export interface SubnetBarLayout {
  /** Left edge of the subnet block, percent of the bar's domain. */
  readonly blockLeftPct: number;
  readonly blockWidthPct: number;
  /** Usable-host range inside the block; `null` for /31 and /32. */
  readonly usable: { readonly leftPct: number; readonly widthPct: number } | null;
  /** Marker for an asked-about address; `null` when none was given. */
  readonly probe: { readonly pct: number; readonly inside: boolean } | null;
}

const MARGIN_RATIO = 0.18;

/**
 * Lay the subnet block out on a slightly wider domain so an address just
 * outside the block stays visible. The domain is a pure render coordinate
 * space (it may extend past the IPv4 range); all positions are percentages of
 * it, computed from `SubnetFacts`, so the rendering layer stays trivial.
 */
export function subnetBarLayout(facts: SubnetFacts, probeIp?: string): SubnetBarLayout {
  const blockStart = ipToInt(facts.networkAddress);
  const blockEnd = ipToInt(facts.broadcastAddress);
  const margin = Math.max(1, Math.round(facts.totalAddresses * MARGIN_RATIO));

  const domainStart = blockStart - margin;
  const domainEnd = blockEnd + 1 + margin;
  const domainSpan = domainEnd - domainStart || 1;

  const pct = (value: number) => ((value - domainStart) / domainSpan) * 100;

  let usable: SubnetBarLayout['usable'] = null;
  if (facts.firstUsableHost && facts.lastUsableHost) {
    const first = ipToInt(facts.firstUsableHost);
    const last = ipToInt(facts.lastUsableHost);
    usable = { leftPct: pct(first), widthPct: pct(last + 1) - pct(first) };
  }

  let probe: SubnetBarLayout['probe'] = null;
  if (probeIp) {
    const value = ipToInt(probeIp);
    const inside = value >= blockStart && value <= blockEnd;
    const clamped = Math.min(domainEnd, Math.max(domainStart, value));
    probe = { pct: pct(clamped), inside };
  }

  return {
    blockLeftPct: pct(blockStart),
    blockWidthPct: pct(blockEnd + 1) - pct(blockStart),
    usable,
    probe,
  };
}
