/** REQ-390 — the physical layer: duplex, PoE budget, LLDP (TC-1940..TC-1944). */
import { describe, expect, it } from 'vitest';
import {
  LLDP_CABLES,
  LLDP_DEVICES,
  LLDP_TTL,
  POE_BUDGET_W,
  POE_CLASSES,
  POE_DEVICES,
  allocatePower,
  errorCounters,
  lldpTable,
  negotiate,
  type PortSetting,
} from './physicalLayer';

const AUTO: PortSetting = { mode: 'auto' };
const FULL100: PortSetting = { mode: 'fixed', speed: 100, duplex: 'full' };
const HALF100: PortSetting = { mode: 'fixed', speed: 100, duplex: 'half' };
const FULL10: PortSetting = { mode: 'fixed', speed: 10, duplex: 'full' };

describe('TC-1940: what each side of the cable ends up with', () => {
  it('auto/auto: both 100 full, no mismatch', () => {
    expect(negotiate(AUTO, AUTO)).toEqual({
      link: true,
      a: { speed: 100, duplex: 'full' },
      b: { speed: 100, duplex: 'full' },
      mismatch: false,
    });
  });
  it('fixed 100 full facing auto: the auto side detects 100 but falls back to half — a mismatch', () => {
    for (const [a, b, fixedSide, autoSide] of [
      [FULL100, AUTO, 'a', 'b'],
      [AUTO, FULL100, 'b', 'a'],
    ] as const) {
      const outcome = negotiate(a, b);
      expect(outcome.link).toBe(true);
      if (!outcome.link) return;
      expect(outcome[fixedSide]).toEqual({ speed: 100, duplex: 'full' });
      expect(outcome[autoSide]).toEqual({ speed: 100, duplex: 'half' });
      expect(outcome.mismatch).toBe(true);
    }
  });
  it('fixed 100 half facing auto: both half, which matches', () => {
    const outcome = negotiate(HALF100, AUTO);
    expect(outcome).toMatchObject({ link: true, mismatch: false, b: { duplex: 'half' } });
  });
  it('fixed 100 full on both ends: 100 full, no mismatch', () => {
    expect(negotiate(FULL100, FULL100)).toMatchObject({ link: true, mismatch: false });
  });
  it('fixed at different speeds: no link', () => {
    expect(negotiate(FULL100, FULL10)).toEqual({ link: false });
  });
});

describe('TC-1941: a duplex mismatch shows different errors on each side, growing with load', () => {
  it('half side: collisions and late collisions; full side: runts and FCS errors', () => {
    const outcome = negotiate(FULL100, AUTO);
    const { a, b } = errorCounters(outcome, 50);
    expect(b.lateCollisions).toBeGreaterThan(0);
    expect(b.collisions).toBeGreaterThan(0);
    expect(b.fcsErrors + b.runts).toBe(0);
    expect(a.fcsErrors).toBeGreaterThan(0);
    expect(a.runts).toBeGreaterThan(0);
    expect(a.collisions + a.lateCollisions).toBe(0);
    // Each frame the half side aborts is one the full side receives damaged.
    expect(a.runts).toBe(b.collisions);
    expect(a.fcsErrors).toBe(b.lateCollisions);
    // Most overlaps land after the first 64 bytes of a full-size frame.
    expect(b.lateCollisions).toBeGreaterThan(b.collisions);
  });
  it('more load, more errors; idle, none', () => {
    const outcome = negotiate(AUTO, FULL100);
    const light = errorCounters(outcome, 10).a.lateCollisions;
    const heavy = errorCounters(outcome, 80).a.lateCollisions;
    expect(heavy).toBeGreaterThan(light);
    expect(errorCounters(outcome, 0).a.lateCollisions).toBe(0);
  });
  it('a matched link counts no errors at any load', () => {
    for (const outcome of [negotiate(AUTO, AUTO), negotiate(HALF100, AUTO)]) {
      const { a, b } = errorCounters(outcome, 90);
      expect(
        Object.values(a)
          .concat(Object.values(b))
          .every((n) => n === 0),
      ).toBe(true);
    }
  });
});

describe('TC-1942: allocated by class, the last access point is denied though far less is drawn', () => {
  it('370 W: 355.6 W allocated, port 24 denied (385.6 W would be needed), 214 W drawn', () => {
    const result = allocatePower(POE_DEVICES, POE_BUDGET_W, 'class');
    expect(POE_DEVICES).toHaveLength(24);
    expect(result.allocatedW).toBe(355.6);
    expect(result.denied).toEqual([24]);
    expect(result.drawW).toBe(214);
    expect(result.allocatedW + POE_CLASSES[4].pseW).toBeGreaterThan(POE_BUDGET_W);
  });
});

describe('TC-1943: allocated by what each device asks for over LLDP, every port powers up', () => {
  it('276 W allocated, nothing denied, 232 W drawn', () => {
    const result = allocatePower(POE_DEVICES, POE_BUDGET_W, 'lldp');
    expect(result.allocatedW).toBe(276);
    expect(result.denied).toEqual([]);
    expect(result.drawW).toBe(232);
  });
});

describe('TC-1944: each device learns its direct neighbours over LLDP, and no further', () => {
  it('core-1 sees both access switches, with their port IDs and a 120 s TTL — not the AP', () => {
    const table = lldpTable('core-1', LLDP_DEVICES, LLDP_CABLES);
    expect(table).toEqual([
      {
        localPort: 'Gi1/0/1',
        chassisId: '00:1b:54:0a:00:11',
        portId: 'Gi1/0/48',
        systemName: 'access-1',
        ttl: 120,
      },
      {
        localPort: 'Gi1/0/2',
        chassisId: '00:1b:54:0a:00:12',
        portId: 'Gi1/0/48',
        systemName: 'access-2',
        ttl: 120,
      },
    ]);
    expect(LLDP_TTL).toBe(120);
  });
  it('access-2 sees core-1 and the AP; the AP sees only access-2', () => {
    expect(lldpTable('access-2', LLDP_DEVICES, LLDP_CABLES).map((n) => n.systemName)).toEqual([
      'core-1',
      'ap-3f',
    ]);
    expect(lldpTable('ap-3f', LLDP_DEVICES, LLDP_CABLES)).toEqual([
      {
        localPort: 'eth0',
        chassisId: '00:1b:54:0a:00:12',
        portId: 'Gi1/0/17',
        systemName: 'access-2',
        ttl: 120,
      },
    ]);
  });
});
