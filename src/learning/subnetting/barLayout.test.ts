import { describe, expect, it } from 'vitest';
import { subnetBarLayout } from './barLayout';
import { subnetFacts } from './solver';

describe('subnetBarLayout', () => {
  it('centers the block inside the padded domain with the usable range inside it', () => {
    const layout = subnetBarLayout(subnetFacts('192.168.1.0', 24));

    expect(layout.blockLeftPct).toBeGreaterThan(0);
    expect(layout.blockLeftPct + layout.blockWidthPct).toBeLessThan(100);
    expect(layout.usable).not.toBeNull();
    // Usable hosts sit strictly inside the block (network/broadcast excluded).
    expect(layout.usable!.leftPct).toBeGreaterThan(layout.blockLeftPct);
    expect(layout.usable!.leftPct + layout.usable!.widthPct).toBeLessThan(
      layout.blockLeftPct + layout.blockWidthPct,
    );
    expect(layout.probe).toBeNull();
  });

  it('marks an inside probe within the block and an outside probe beyond it', () => {
    const facts = subnetFacts('192.168.1.0', 24);

    const inside = subnetBarLayout(facts, '192.168.1.50');
    expect(inside.probe?.inside).toBe(true);
    expect(inside.probe!.pct).toBeGreaterThanOrEqual(inside.blockLeftPct);
    expect(inside.probe!.pct).toBeLessThanOrEqual(inside.blockLeftPct + inside.blockWidthPct);

    const outside = subnetBarLayout(facts, '192.168.2.50');
    expect(outside.probe?.inside).toBe(false);
    expect(outside.probe!.pct).toBeGreaterThan(outside.blockLeftPct + outside.blockWidthPct);
  });

  it('clamps a far-outside probe to the domain edge instead of overflowing', () => {
    const layout = subnetBarLayout(subnetFacts('192.168.1.0', 24), '10.0.0.1');
    expect(layout.probe?.inside).toBe(false);
    expect(layout.probe!.pct).toBeGreaterThanOrEqual(0);
    expect(layout.probe!.pct).toBeLessThanOrEqual(100);
  });

  it('reports no usable range for /31 and /32 and stays in bounds at the address-space edges', () => {
    expect(subnetBarLayout(subnetFacts('192.168.1.4', 31)).usable).toBeNull();

    const low = subnetBarLayout(subnetFacts('0.0.0.10', 24));
    expect(low.blockLeftPct).toBeGreaterThanOrEqual(0);
    const high = subnetBarLayout(subnetFacts('255.255.255.10', 24));
    expect(high.blockLeftPct + high.blockWidthPct).toBeLessThanOrEqual(100.0001);
  });
});
