/** REQ-429 — MAC learning, flooding, ageing and a moved host (TC-2400..TC-2404). */
import { describe, expect, it } from 'vitest';
import { HOSTS, SCENE_ONE, agedScene, movedScene, replay } from './macLearning';

const steps = replay(SCENE_ONE);

describe('TC-2400: an empty table floods unknown unicast, and every frame teaches its source port', () => {
  it('A → B on a fresh switch leaves by ports 2, 3 and 4, and A is learned on port 1', () => {
    expect(steps[0]).toMatchObject({
      ingress: 1,
      egress: [2, 3, 4],
      kind: 'flood',
      reason: 'unknown',
    });
    expect(steps[0]!.tableBefore).toEqual([]);
    expect(steps[0]!.tableAfter).toEqual([{ mac: HOSTS.A.mac, port: 1, lastSeenS: 0 }]);
  });
  it('a broadcast is flooded even when its sender is known', () => {
    expect(steps[2]).toMatchObject({
      ingress: 3,
      egress: [1, 2, 4],
      kind: 'flood',
      reason: 'broadcast',
    });
  });
});

describe('TC-2401: once the destination is learned, the frame leaves by that one port', () => {
  it('B → A leaves by port 1, A → B by port 2, D → C by port 3', () => {
    expect(steps.map((step) => step.egress)).toEqual([[2, 3, 4], [1], [1, 2, 4], [2], [3]]);
    expect(steps[4]!.tableAfter.map((entry) => entry.port)).toEqual([1, 2, 3, 4]);
  });
  it('a frame whose destination is on the port it came in on is filtered', () => {
    const filtered = replay([
      { kind: 'frame', atS: 0, src: 'A', dst: 'B' },
      { kind: 'move', atS: 1, host: 'B', port: 1 },
      { kind: 'frame', atS: 2, src: 'B', dst: 'A' },
      { kind: 'frame', atS: 3, src: 'A', dst: 'B' },
    ]);
    expect(filtered[2]).toMatchObject({
      ingress: 1,
      egress: [],
      kind: 'filter',
      reason: 'same-port',
    });
  });
});

describe('TC-2402: an entry not refreshed for the 300 s ageing time is removed, and the frame floods again', () => {
  it('120 s after A last sent, B → A still leaves by port 1 only', () => {
    expect(agedScene(120)).toMatchObject({ egress: [1], kind: 'forward', reason: 'known' });
  });
  it('400 s after, the entry has aged out and B → A floods out of 1, 3 and 4', () => {
    expect(agedScene(400)).toMatchObject({ egress: [1, 3, 4], kind: 'flood', reason: 'aged' });
    expect(agedScene(400).tableBefore).toEqual([]);
  });
  it('the boundary is the ageing time: 299 s forwards, 300 s floods; a 600 s ageing time keeps it', () => {
    expect(agedScene(299).kind).toBe('forward');
    expect(agedScene(300).kind).toBe('flood');
    expect(agedScene(400, 600).kind).toBe('forward');
  });
});

describe('TC-2403: a host that moves silently is sent to its old port until it speaks', () => {
  it('B → A leaves by port 1, which A has left; once A sends from port 3, B → A leaves by port 3', () => {
    const [stale, aSpeaks, fixed] = movedScene();
    expect(stale).toMatchObject({ egress: [1], kind: 'forward', delivered: false });
    expect(aSpeaks).toMatchObject({ ingress: 3, egress: [2], delivered: true });
    expect(aSpeaks!.tableAfter.find((entry) => entry.mac === HOSTS.A.mac)?.port).toBe(3);
    expect(fixed).toMatchObject({ egress: [3], delivered: true });
  });
});

describe('TC-2404: an aged-out entry still reaches a host that moved, because the frame floods', () => {
  it('flooding reaches every port, so the delivery of a flooded unicast does not depend on the table', () => {
    expect(agedScene(400).delivered).toBe(true);
    expect(steps[0]!.delivered).toBe(true);
    expect(steps[2]!.delivered).toBeNull();
  });
});
