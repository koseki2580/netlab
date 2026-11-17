/** REQ-372 — RSTP roles, the alternate port taking over, and MST instances (TC-1780..TC-1782). */
import { describe, expect, it } from 'vitest';
import {
  MST_INSTANCES,
  blockedLinks,
  rootPortOf,
  rstpRoles,
  rstpTopology,
  withLinkCut,
} from './rstpLesson';

describe('TC-1780: the triangle’s ports have RSTP roles', () => {
  it('Switch A is root; B and C each have a root port; one port between B and C is alternate', () => {
    const roles = rstpRoles(rstpTopology());
    expect(
      roles
        .filter((port) => port.switchId === 'switch-a')
        .every((port) => port.role === 'designated'),
    ).toBe(true);
    expect(rootPortOf(roles, 'switch-b')).toBe('ba');
    expect(rootPortOf(roles, 'switch-c')).toBe('ca');
    expect(roles.filter((port) => port.role === 'alternate')).toHaveLength(1);
    expect(blockedLinks(roles)).toEqual(['B–C']);
  });
});

describe('TC-1781: when a root port’s link is cut, the alternate port becomes the root port', () => {
  it('cutting A–C makes C’s port toward B its root port, and nothing is blocked', () => {
    const before = rstpRoles(rstpTopology());
    const alternate = before.find((port) => port.role === 'alternate');
    const cut = rstpRoles(withLinkCut('switch-c', 'ca'));
    expect(rootPortOf(cut, 'switch-c')).toBe('cb');
    expect(cut.filter((port) => port.role === 'alternate')).toHaveLength(0);
    // The port that was waiting is the one that took over, or its partner forwards to it.
    expect(['switch-c:cb', 'switch-b:bc']).toContain(`${alternate?.switchId}:${alternate?.portId}`);
  });
});

describe('TC-1782: two MST instances with different roots block different links', () => {
  it('instance 1 (root A) blocks B–C; instance 2 (root B) blocks A–C', () => {
    const [one, two] = MST_INSTANCES.map((instance) =>
      blockedLinks(rstpRoles(rstpTopology(instance.priorities))),
    );
    expect(one).toEqual(['B–C']);
    expect(two).toEqual(['A–C']);
  });
});
