// @vitest-environment node
/**
 * Wrong answers the simulator lets through, which the grader must not: the
 * destination's own address, an address a router side already holds, and the
 * two addresses of a network no device may use. Each was reported by a learner
 * who passed with it. TC-650 to TC-655 in the specification.
 */

import { describe, expect, it } from 'vitest';
import { applyChanges } from '../model/settings';
import type { Exercise, GradeResult, SettingChange } from '../model/types';
import { exerciseById } from '../templates';
import { gradeExercise } from './gradeExercise';

function exercise(id: string): Exercise {
  const found = exerciseById(id);
  if (!found) throw new Error(`no ${id}`);
  return found;
}

const grade = (of: Exercise, changes: readonly SettingChange[]): Promise<GradeResult> =>
  gradeExercise(of, applyChanges(of.start, changes));

const ipOf = (of: Exercise, nodeId: string): string =>
  `${of.start.nodes.find((node) => node.id === nodeId)?.data.ip}`;

const hostRef = (of: Exercise): string => {
  const [ref] = of.allowed;
  if (ref?.kind !== 'host-ip') throw new Error('not a host exercise');
  return ref.nodeId;
};

// TC-650
describe('the address of the device it is trying to reach', () => {
  it.each(['l1-host-blank~0', 'l1-host-address~4'])(
    '%s: is not a pass, and the message names the device that has it',
    async (id) => {
      const of = exercise(id);
      const nodeId = hostRef(of);
      const server = ipOf(of, 'srv');
      const result = await grade(of, [{ kind: 'host-ip', nodeId, ip: server }]);
      expect(result.passed).toBe(false);
      const own = result.results.find((entry) => entry.checkId === `reach-${nodeId}-srv`);
      expect(own).toMatchObject({ passed: false, code: 'address-conflict' });
      expect(own?.message.ja).toContain(server);
      expect(own?.message.ja).toContain('もう使っています');
      expect(own?.evidence).toMatchObject({ diagnosis: 'duplicate-address', address: server });
      // Nothing to replay: the packet never left the device.
      expect(own?.trace).toBeUndefined();
    },
  );

  it('the reference still passes, and so does another free address', async () => {
    const of = exercise('l1-host-blank~0');
    expect((await grade(of, of.reference)).passed).toBe(true);
  });
});

// TC-651
describe('a router side given the address of the server behind it', () => {
  it('l1-router-address~0: no goal about that server is met', async () => {
    const of = exercise('l1-router-address~0');
    const server = ipOf(of, 'srv');
    const result = await grade(of, [
      { kind: 'iface-address', nodeId: 'r1', ifaceId: 'far', ipAddress: server, prefixLength: 24 },
    ]);
    expect(result.passed).toBe(false);
    const aboutServer = result.results.filter((entry) => entry.checkId.endsWith('-srv'));
    expect(aboutServer.length).toBeGreaterThan(0);
    for (const entry of aboutServer) {
      expect(entry, entry.checkId).toMatchObject({ passed: false, code: 'address-conflict' });
    }
  });
});

// TC-652
describe('the two addresses of a network that no device may use', () => {
  const cases: [string, (of: Exercise) => SettingChange, 'network' | 'broadcast'][] = [
    [
      'l1-host-blank~0',
      (of) => ({ kind: 'host-ip', nodeId: hostRef(of), ip: lanStart(of, hostRef(of), 0) }),
      'network',
    ],
    [
      'l1-host-blank~0',
      (of) => ({ kind: 'host-ip', nodeId: hostRef(of), ip: lanStart(of, hostRef(of), 255) }),
      'broadcast',
    ],
    [
      'l1-host-address~3',
      (of) => ({ kind: 'host-ip', nodeId: hostRef(of), ip: lanStart(of, hostRef(of), 255) }),
      'broadcast',
    ],
  ];

  /** The first three numbers of the reference answer, with another last number. */
  function lanStart(of: Exercise, nodeId: string, last: number): string {
    const fix = of.reference.find(
      (change) => change.kind === 'host-ip' && change.nodeId === nodeId,
    );
    if (fix?.kind !== 'host-ip' || fix.ip === null) throw new Error('no reference address');
    return `${fix.ip.split('.').slice(0, 3).join('.')}.${last}`;
  }

  it.each(cases)('%s: %s is refused with its own sentence', async (id, change, which) => {
    const of = exercise(id);
    const result = await grade(of, [change(of)]);
    expect(result.passed).toBe(false);
    const refused = result.results.filter((entry) => entry.code === 'address-reserved');
    expect(refused.length).toBeGreaterThan(0);
    expect(refused[0]?.message.ja).toContain(
      which === 'network'
        ? 'ネットワーク全体を表す特別な数字です。機器には使えません。'
        : '全員あての特別な数字です。機器には使えません。',
    );
  });

  it('a /8 network: 10.255.255.255 is the address for everyone, 10.0.0.255 is not', async () => {
    // The first /8 instance of the pool.
    const of = [0, 1, 2, 3, 4, 5, 6, 7]
      .map((seed) => exercise(`l1-prefix-fit~${seed}`))
      .find((entry) => entry.fingerprint.includes('|/8|'));
    if (!of) throw new Error('no /8 instance');
    const nodeId = hostRef(of);
    const everyone = await grade(of, [{ kind: 'host-ip', nodeId, ip: '10.255.255.255' }]);
    expect(everyone.passed).toBe(false);
    expect(everyone.results.some((entry) => entry.code === 'address-reserved')).toBe(true);
    const whole = await grade(of, [{ kind: 'host-ip', nodeId, ip: '10.0.0.0' }]);
    expect(whole.results.some((entry) => entry.code === 'address-reserved')).toBe(true);
    const fine = await grade(of, [{ kind: 'host-ip', nodeId, ip: '10.0.0.255' }]);
    expect(fine.results.every((entry) => entry.code !== 'address-reserved')).toBe(true);
    expect(fine.passed).toBe(true);
  });

  it('a router side: the first address of its network is refused on every goal', async () => {
    const of = exercise('l1-router-address~0');
    const [fix] = of.reference;
    if (fix?.kind !== 'iface-address') throw new Error('not a router exercise');
    const zero = `${fix.ipAddress.split('.').slice(0, 3).join('.')}.0`;
    const result = await grade(of, [{ ...fix, ipAddress: zero }]);
    expect(result.passed).toBe(false);
    expect(result.results.every((entry) => entry.code === 'address-reserved')).toBe(true);
  });
});

// TC-659
describe('the unplugged cable', () => {
  it('offers nothing but cables to change: an address setting there was only noise, and a pass with one changed was accepted', () => {
    for (const seed of [0, 1, 2, 3, 4, 5]) {
      const of = exercise(`l1-cable-off~${seed}`);
      expect(of.allowed.map((ref) => ref.kind)).toEqual(of.allowed.map(() => 'link-state'));
      expect(of.allowed.length).toBeGreaterThan(2);
    }
  });

  it('plugging the cable in and pulling another out is not a pass', async () => {
    const of = exercise('l1-cable-off~1');
    const [fix] = of.reference;
    const other = of.allowed.find(
      (ref) =>
        ref.kind === 'link-state' && ref.edgeId !== (fix?.kind === 'link-state' ? fix.edgeId : ''),
    );
    if (!fix || other?.kind !== 'link-state') throw new Error('no second cable');
    const result = await grade(of, [
      fix,
      { kind: 'link-state', edgeId: other.edgeId, state: 'down' },
    ]);
    expect(result.passed).toBe(false);
  });
});

// TC-662
describe('a route whose next router is wrong is not called a missing route', () => {
  const routeFix = (of: Exercise) => {
    const [fix] = of.reference;
    if (fix?.kind !== 'static-routes') throw new Error('the fix is not a route');
    return fix;
  };
  /** The first instance of the template whose start has this fault. */
  const withFault = (fault: string): Exercise => {
    for (let seed = 0; seed < 40; seed += 1) {
      const of = exercise(`l2-static-nexthop~${seed}`);
      if (of.fingerprint.endsWith(`|${fault}`)) return of;
    }
    throw new Error(`no instance with the fault ${fault}`);
  };
  const NO_ROUTE = '行き先への道を知りませんでした';

  it("the router's own address as the next router: said as that, at the start", async () => {
    const of = withFault('own');
    const result = await gradeExercise(of, of.start);
    const [failed] = result.results.filter((entry) => !entry.passed);
    expect(failed?.code).toBe('not-delivered');
    expect(failed?.message.ja).toContain('そのルータ自身のアドレス');
    expect(failed?.message.ja).not.toContain(NO_ROUTE);
  });

  it('a device far away as the next router: said as that, at the start and when the learner writes it', async () => {
    const of = withFault('not-a-neighbour');
    const atStart = (await gradeExercise(of, of.start)).results.find((entry) => !entry.passed);
    expect(atStart?.message.ja).toContain('はなれた場所にある機器のアドレスは使えません');
    expect(atStart?.message.ja).not.toContain(NO_ROUTE);

    const own = withFault('own');
    const fix = routeFix(own);
    const server = ipOf(own, 'srv');
    const before = own.start.nodes.find((node) => node.id === fix.nodeId)?.data.staticRoutes ?? [];
    const written = await grade(own, [
      {
        ...fix,
        routes: fix.routes.map((route, index) =>
          route.nextHop === before[index]?.nextHop ? route : { ...route, nextHop: server },
        ),
      },
    ]);
    const refused = written.results.find((entry) => entry.code === 'next-hop-not-neighbour');
    expect(refused?.message.ja).toContain('はなれた場所にある機器のアドレスは使えません');
    expect(refused?.message.ja).not.toContain('書けません');
  });

  it('no route at all is still called that', async () => {
    const of = exercise('l2-static-missing~0');
    const failed = (await gradeExercise(of, of.start)).results.find((entry) => !entry.passed);
    expect(failed?.message.ja).toContain(NO_ROUTE);
  });

  it('the design whose one line hands everything to the router itself is told so', async () => {
    const of = exercise('l2-choose-static-default~0');
    const option = of.options?.find((entry) => entry.id === 'default-self');
    if (!option) throw new Error('no such option');
    const failed = (await grade(of, option.changes)).results.find((entry) => !entry.passed);
    expect(failed?.message.ja).toContain('そのルータ自身のアドレス');
    expect(failed?.message.ja).not.toContain(NO_ROUTE);
  });
});

// TC-664
describe('two switches with the same lowest priority', () => {
  it('l2-stp-root: the tie and what breaks it are said, and the switch is not called "the smallest"', async () => {
    const of = exercise('l2-stp-root~0');
    const check = of.checks.find((entry) => entry.kind === 'stp-root');
    if (check?.kind !== 'stp-root') throw new Error('no root goal');
    const switches = of.start.nodes.filter((node) => node.data.role === 'switch');
    // Every switch on the same number: whoever wins, wins on the device number.
    const result = await grade(
      of,
      switches.map((node) => ({ kind: 'stp-priority', nodeId: node.id, priority: 4096 })),
    );
    const root = result.results.find((entry) => entry.checkId === check.id);
    if (root?.passed) return; // The wanted switch happens to hold the lowest device number.
    expect(root?.code).toBe('wrong-root');
    expect(root?.message.ja).toContain('優先度の数字が同じ（4096）');
    expect(root?.message.ja).toContain(
      '数字が同じときは、機器の番号（MAC アドレス）が小さいほうが中心になります',
    );
    expect(root?.message.ja).not.toContain('いちばん小さいスイッチが');
  });

  it('without a tie the message is the rule, with the name of the switch that is the centre', async () => {
    const of = exercise('l2-stp-root~0');
    const root = (await gradeExercise(of, of.start)).results.find(
      (entry) => entry.code === 'wrong-root',
    );
    expect(root?.message.ja).toContain('優先度の数字がいちばん小さいスイッチが、中心になります');
  });
});

// TC-665
describe('what a message points at is something the learner can change', () => {
  it('a trunk exercise: both lists set to one number, and the message opens with the trunk, not with sockets that cannot be set', async () => {
    const of = exercise('l2-trunk-allowed~0');
    const trunks = of.allowed.flatMap((ref) => (ref.kind === 'port-vlan' ? [ref] : []));
    const kept = of.reference[0]?.kind === 'port-vlan' ? of.reference[0].trunkAllowedVlans : [];
    const one = kept?.[0] ?? 10;
    const result = await grade(
      of,
      trunks.map((ref) => ({ ...ref, vlanMode: 'trunk' as const, trunkAllowedVlans: [one] })),
    );
    const failed = result.results.find((entry) => entry.code === 'not-delivered');
    expect(failed?.message.ja).toMatch(/^.+ には、この VLAN 番号を運ぶトランク/);
    expect(failed?.message.ja).toContain('トランクの両はしの一覧');
    expect(failed?.message.ja).not.toContain('2 台の差し込み口の VLAN 番号を見くらべて');
  });

  it('a device that starts with the address of a router it cannot change: only the device is asked to change', async () => {
    // The first instance whose start has the device on the router's address.
    const of = Array.from({ length: 60 }, (_, seed) => exercise(`l1-host-address~${seed}`)).find(
      (entry) => entry.fingerprint.endsWith('|router'),
    );
    if (!of) throw new Error('no instance with the router fault');
    const failed = (await gradeExercise(of, of.start)).results.find((entry) => !entry.passed);
    expect(failed?.code).toBe('address-conflict');
    expect(failed?.message.ja).toMatch(/がもう使っています。べつの数字をえらんでください。$/);
    expect(failed?.message.ja).not.toContain('どちらかを');
  });
});
