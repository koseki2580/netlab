/** REQ-445 — BGP graceful restart and BFD (TC-2570..TC-2577). */
import { describe, expect, it } from 'vitest';
import { scenario, simulate } from './bgpGracefulRestart';

describe('TC-2570: without graceful restart a control-plane restart drops traffic', () => {
  it('R2 withdraws at once and relearns at End-of-RIB: 60 s lost with no other path', () => {
    const result = simulate(scenario({ gr: false }));
    expect(result.deletedMs).toBe(0);
    expect(result.refreshedMs).toBe(60_000);
    expect(result.lossMs).toBe(60_000);
  });
});

describe('TC-2571: with graceful restart R2 forwards on stale routes until End-of-RIB', () => {
  it('no traffic is lost; the routes are stale from 0 to 60 s, then fresh', () => {
    const result = simulate(scenario({ gr: true }));
    expect(result.lossMs).toBe(0);
    expect(result.keptStale).toBe(true);
    expect(result.deletedMs).toBeNull();
    expect(result.segments.map((seg) => [seg.fromMs, seg.route])).toEqual([
      [0, 'stale'],
      [60_000, 'fresh'],
    ]);
  });
});

describe('TC-2572: a restart longer than the Restart Time loses traffic after it', () => {
  it('session back at 150 s: stale routes deleted at 120 s, lost until End-of-RIB at 165 s', () => {
    const result = simulate(scenario({ gr: true, cpRestartMs: 150_000 }));
    expect(result.deletedMs).toBe(120_000);
    expect(result.lossMs).toBe(45_000);
  });
});

describe('TC-2573: a C-bit-0 BFD lets graceful restart hide a dead router for the Restart Time', () => {
  it('R1 dies: BFD notices at 0.9 s, stale routes kept until 120.9 s, then the backup', () => {
    const result = simulate(
      scenario({ gr: true, failure: 'whole-router', detection: 'bfd-c0', backup: true }),
    );
    expect(result.keptStale).toBe(true);
    expect(result.deletedMs).toBe(120_900);
    expect(result.lossMs).toBe(120_900);
    expect(result.segments[result.segments.length - 1]).toMatchObject({
      path: 'backup',
      flowing: true,
    });
  });
});

describe('TC-2574: a C-bit-1 BFD going down ends graceful restart at once', () => {
  it('R1 dies: routes withdrawn at 0.9 s and traffic moves to the backup', () => {
    const result = simulate(
      scenario({ gr: true, failure: 'whole-router', detection: 'bfd-c1', backup: true }),
    );
    expect(result.keptStale).toBe(false);
    expect(result.lossMs).toBe(900);
  });
  it('a control-plane restart with C-bit-1 BFD still loses nothing', () => {
    expect(simulate(scenario({ gr: true, detection: 'bfd-c1' })).lossMs).toBe(0);
  });
});

describe('TC-2575: without BFD a dead router is noticed only at the hold time', () => {
  it('GR on: noticed at 90 s, stale until 210 s; GR off: 90 s lost', () => {
    const withGr = simulate(scenario({ gr: true, failure: 'whole-router', backup: true }));
    expect(withGr.noticedMs).toBe(90_000);
    expect(withGr.lossMs).toBe(210_000);
    expect(simulate(scenario({ failure: 'whole-router', backup: true })).lossMs).toBe(90_000);
  });
});

describe('TC-2576: the Restart Time sets how long a dead router is hidden', () => {
  it('Restart Time 60 s with C-bit-0 BFD: 60.9 s lost; 300 s: 300.9 s', () => {
    const base = { gr: true, failure: 'whole-router', detection: 'bfd-c0', backup: true } as const;
    expect(simulate(scenario({ ...base, restartTimeMs: 60_000 })).lossMs).toBe(60_900);
    expect(simulate(scenario({ ...base, restartTimeMs: 300_000 })).lossMs).toBe(300_900);
  });
});

describe('TC-2577: with no backup a dead router loses traffic for good', () => {
  it('loss never ends, with or without graceful restart', () => {
    expect(simulate(scenario({ failure: 'whole-router', detection: 'bfd-c1' })).lossMs).toBe(
      Infinity,
    );
    expect(simulate(scenario({ gr: true, failure: 'whole-router' })).lossMs).toBe(Infinity);
  });
});
