/** REQ-404 — MPLS traffic engineering with RSVP-TE (TC-2080..TC-2086). */
import { describe, expect, it } from 'vitest';
import {
  LINKS,
  cspfPlacement,
  fastReroute,
  igpPlacement,
  lspRequests,
  unreservedGbps,
} from './mplsTe';

const route = (r: { path: { routers: readonly string[] } | null }) =>
  r.path ? r.path.routers.join('-') : null;
const byId = (id: string) => LINKS.find((l) => l.id === id)!;

describe('TC-2080: without TE every flow takes the IGP shortest path and overloads it', () => {
  it('6 + 5 + 4 Gbit/s all go A-B-Z (metric 20): 15 Gbit/s offered to a 10 Gbit/s link', () => {
    const igp = igpPlacement(lspRequests(4));
    expect(igp.path.routers.join('-')).toBe('A-B-Z');
    expect(igp.path.metric).toBe(20);
    expect(igp.loadGbps['A-B']).toBe(15);
    expect(igp.loadGbps['B-Z']).toBe(15);
    expect(igp.loadGbps['A-C']).toBe(0);
    expect(igp.worstLink).toEqual({ id: 'A-B', loadGbps: 15, capacityGbps: 10 });
  });
});

describe('TC-2081: CSPF places LSPs in order, pruning links without enough unreserved bandwidth', () => {
  it('LSP 1 (6) takes A-B-Z; LSP 2 (5) no longer fits there and takes A-C-Z; LSP 3 (4) fits A-B-Z exactly', () => {
    const te = cspfPlacement(lspRequests(4));
    expect(te.placements.map(route)).toEqual(['A-B-Z', 'A-C-Z', 'A-B-Z']);
    expect(te.reservedGbps['A-B']).toBe(10);
    expect(te.reservedGbps['A-C']).toBe(5);
    expect(unreservedGbps(byId('B-Z'), te.reservedGbps)).toBe(0);
    expect(unreservedGbps(byId('C-Z'), te.reservedGbps)).toBe(5);
  });
  it('no link is reserved beyond its capacity', () => {
    for (const size of [1, 4, 5, 6, 7, 8]) {
      const te = cspfPlacement(lspRequests(size));
      for (const l of LINKS) expect(te.reservedGbps[l.id]!).toBeLessThanOrEqual(l.capacityGbps);
    }
  });
});

describe('TC-2082: a bigger third LSP is pushed to a longer path', () => {
  it('5 Gbit/s goes A-C-Z (metric 30); 6 Gbit/s goes A-E-Z (metric 40, its 6 Gbit/s links)', () => {
    expect(route(cspfPlacement(lspRequests(5)).placements[2]!)).toBe('A-C-Z');
    const six = cspfPlacement(lspRequests(6)).placements[2]!;
    expect(route(six)).toBe('A-E-Z');
    expect(six.path!.metric).toBe(40);
  });
});

describe('TC-2083: an LSP is refused when no path has enough unreserved bandwidth', () => {
  it('7 Gbit/s: A-B has 4 left, A-C 5, A-E 6, so LSP 3 is refused and reserves nothing', () => {
    const te = cspfPlacement(lspRequests(7));
    expect(route(te.placements[2]!)).toBeNull();
    expect(te.reservedGbps['A-E']).toBe(0);
    expect(te.reservedGbps['A-B']).toBe(6);
  });
});

describe('TC-2084: fast reroute sends the LSPs on a failed link through a pre-signalled bypass', () => {
  it('B-Z fails: B repairs locally over B-D-Z for LSP 1 and LSP 3, 10 Gbit/s on the bypass', () => {
    const frr = fastReroute(lspRequests(4), 'B-Z');
    expect(frr.plr).toBe('B');
    expect(frr.mergePoint).toBe('Z');
    expect(frr.protectedIds).toEqual(['lsp1', 'lsp3']);
    expect(frr.bypass!.routers.join('-')).toBe('B-D-Z');
    expect(frr.bypassLoadGbps['B-D']).toBe(10);
    expect(frr.bypassLoadGbps['D-Z']).toBe(10);
    expect(frr.bypassLoadGbps['B-Z']).toBe(0);
    expect(frr.bypassLoadGbps['C-Z']).toBe(5);
  });
});

describe('TC-2085: the head end re-runs CSPF without the failed link', () => {
  it('LSP 1 (6) moves to A-E-Z, LSP 3 (4) to A-C-Z; LSP 2 stays; the bypass is no longer needed', () => {
    const frr = fastReroute(lspRequests(4), 'B-Z');
    expect(frr.after.placements.map(route)).toEqual(['A-E-Z', 'A-C-Z', 'A-C-Z']);
    expect(frr.after.reservedGbps['A-C']).toBe(9);
    expect(frr.after.reservedGbps['A-E']).toBe(6);
    expect(frr.after.reservedGbps['B-D']).toBe(0);
  });
});

describe('TC-2086: an LSP not on the failed link is not protected or moved', () => {
  it('LSP 3 at 5 Gbit/s is on A-C-Z: only LSP 1 uses the bypass; LSP 1 is re-placed on A-E-Z', () => {
    const frr = fastReroute(lspRequests(5), 'B-Z');
    expect(frr.protectedIds).toEqual(['lsp1']);
    expect(frr.bypassLoadGbps['B-D']).toBe(6);
    expect(frr.after.placements.map(route)).toEqual(['A-E-Z', 'A-C-Z', 'A-C-Z']);
  });
});
