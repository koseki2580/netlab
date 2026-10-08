/* @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import type { TopologySnapshot } from '../../../src/types/topology';
import { exerciseById } from '../exerciseSource';
import { gradeExercise } from '../grade/gradeExercise';
import { applyChanges } from '../model/settings';
import type { SettingChange, SettingRef } from '../model/types';
import { lanBehindRouter, withInterface, withNodeData } from '../templates/shared/build';
import { SettingsForm } from './SettingsForm';
import { settingTestId } from './describe';
import { englishProse, hasJapanese, render, type Screen } from './testSupport';
import { ACCESS_PORT_HELP, TRUNK_PORT_HELP, cableLabel } from './words';

/** One network that has something of every kind to set. */
const START: TopologySnapshot = withNodeData(
  withNodeData(
    withInterface(lanBehindRouter(), 'r1', 'lan', {
      inboundAcl: [{ id: 'a', priority: 10, action: 'permit', protocol: 'any' }],
    }),
    'r1',
    {
      staticRoutes: [{ destination: '10.9.0.0/16', nextHop: '203.0.113.10' }],
      ospfConfig: {
        routerId: '1.1.1.1',
        areas: [{ areaId: '0.0.0.0', networks: ['192.168.1.0/24'] }],
      },
    },
  ),
  'sw1',
  { stpConfig: { priority: 32768 } },
);

const EVERY: SettingRef[] = [
  { kind: 'host-ip', nodeId: 'pc1' },
  { kind: 'iface-address', nodeId: 'r1', ifaceId: 'lan' },
  { kind: 'link-state', edgeId: 'e-pc1' },
  { kind: 'port-vlan', nodeId: 'sw1', portId: 'p1' },
  { kind: 'stp-priority', nodeId: 'sw1' },
  { kind: 'stp-port', nodeId: 'sw1', portId: 'p2' },
  { kind: 'static-routes', nodeId: 'r1' },
  { kind: 'ospf-cost', nodeId: 'r1', network: '192.168.1.0/24' },
  { kind: 'iface-acl', nodeId: 'r1', ifaceId: 'lan', direction: 'inbound' },
  { kind: 'iface-nat', nodeId: 'r1', ifaceId: 'wan' },
];

let screen: Screen | null = null;
afterEach(() => {
  screen?.unmount();
  screen = null;
});

function form(allowed: SettingRef[], level: 1 | 3 = 1, locale: 'en' | 'ja' = 'ja') {
  const changes: SettingChange[] = [];
  screen = render(
    <SettingsForm
      exercise={{ allowed, start: START, level, seed: 3 }}
      topology={START}
      onChange={(change) => changes.push(change)}
    />,
    { locale },
  );
  return { screen, changes, last: () => changes[changes.length - 1] };
}

describe('the settings form', () => {
  // TC-490
  it('shows a card for each allowed setting and for nothing else', () => {
    const allowed = [EVERY[0]!, EVERY[3]!];
    const { screen } = form(allowed);
    const cards = [...screen.get('exercise-settings').children].map((card) =>
      card.getAttribute('data-testid'),
    );
    expect(cards).toEqual(['exercise-setting-host-ip-pc1', 'exercise-setting-port-vlan-sw1-p1']);
  });

  // TC-491
  it('names every kind of setting with the device as drawn, and every control has a label', () => {
    const { screen } = form(EVERY, 3);
    expect([...screen.get('exercise-settings').children]).toHaveLength(EVERY.length);
    expect(screen.get('exercise-setting-host-ip-pc1').textContent).toContain('pc1');
    for (const control of screen.container.querySelectorAll('input, select, button')) {
      const labelled =
        control.closest('label') !== null ||
        control.hasAttribute('aria-label') ||
        (control.textContent ?? '').trim() !== '';
      expect(labelled, control.outerHTML.slice(0, 120)).toBe(true);
    }
  });

  // TC-492
  it('host-ip: a chip and typed text both write the address; text that is not an address writes nothing', async () => {
    const { screen, changes, last } = form([EVERY[0]!]);
    const id = settingTestId(EVERY[0]!);
    const chip = screen.get('exercise-chip-0');
    expect(chip.style.minHeight).toBe('44px');
    await screen.click('exercise-chip-0');
    expect(last()).toEqual({ kind: 'host-ip', nodeId: 'pc1', ip: chip.textContent?.trim() });

    const input = screen.get(`${id}-input`) as HTMLInputElement;
    expect(input.inputMode).toBe('decimal');
    expect(input.style.fontSize).toBe('16px');
    await screen.enter(`${id}-input`, '192.168.1.77');
    expect(last()).toEqual({ kind: 'host-ip', nodeId: 'pc1', ip: '192.168.1.77' });

    const before = changes.length;
    await screen.enter(`${id}-input`, '192.168.1.');
    expect(changes).toHaveLength(before);
    expect(screen.get(`${id}-note`).textContent).toContain('192.168.1.20');
    await screen.enter(`${id}-input`, '');
    expect(last()).toEqual({ kind: 'host-ip', nodeId: 'pc1', ip: null });
  });

  // TC-493
  it('offers no chips above level 2', () => {
    const { screen } = form([EVERY[0]!], 3);
    expect(screen.find('exercise-chip-0')).toBeNull();
  });

  // TC-494
  it('each other field writes the change of its kind', async () => {
    const { screen, last } = form(EVERY, 3);
    const id = (index: number) => settingTestId(EVERY[index]!);

    await screen.enter(`${id(1)}-input`, '192.168.1.254');
    expect(last()).toMatchObject({
      kind: 'iface-address',
      ipAddress: '192.168.1.254',
      prefixLength: 24,
    });
    await screen.enter(`${id(1)}-prefix`, '25');
    expect(last()).toMatchObject({
      kind: 'iface-address',
      ipAddress: '192.168.1.1',
      prefixLength: 25,
    });

    await screen.click(`${id(2)}-toggle`);
    expect(last()).toEqual({ kind: 'link-state', edgeId: 'e-pc1', state: 'down' });

    await screen.enter(`${id(3)}-vlan-input`, '20');
    expect(last()).toEqual({
      kind: 'port-vlan',
      nodeId: 'sw1',
      portId: 'p1',
      vlanMode: 'access',
      accessVlan: 20,
    });
    await screen.enter(`${id(3)}-mode`, 'trunk');
    expect(last()).toEqual({
      kind: 'port-vlan',
      nodeId: 'sw1',
      portId: 'p1',
      vlanMode: 'trunk',
      trunkAllowedVlans: [1],
    });

    await screen.enter(`${id(4)}-select`, '4096');
    expect(last()).toEqual({ kind: 'stp-priority', nodeId: 'sw1', priority: 4096 });
    expect((screen.get(`${id(4)}-select`) as HTMLSelectElement).options).toHaveLength(16);

    await screen.click(`${id(5)}-toggle`);
    expect(last()).toEqual({ kind: 'stp-port', nodeId: 'sw1', portId: 'p2', enabled: false });

    await screen.enter(`${id(7)}-input`, '50');
    expect(last()).toEqual({
      kind: 'ospf-cost',
      nodeId: 'r1',
      network: '192.168.1.0/24',
      cost: 50,
    });

    await screen.enter(`${id(9)}-select`, 'outside');
    expect(last()).toEqual({ kind: 'iface-nat', nodeId: 'r1', ifaceId: 'wan', nat: 'outside' });
  });

  // TC-495
  it('static-routes: rows are added and removed, and only complete rows are written', async () => {
    const { screen, last } = form([EVERY[6]!], 3);
    const id = settingTestId(EVERY[6]!);
    await screen.click(`${id}-add`);
    expect(last()).toMatchObject({
      kind: 'static-routes',
      routes: [{ destination: '10.9.0.0/16' }],
    });
    expect(screen.find(`${id}-note`)).not.toBeNull();
    await screen.enter(`${id}-row-1-destination`, '10.0.2.0/24');
    await screen.enter(`${id}-row-1-nexthop`, '203.0.113.10');
    expect(last()).toEqual({
      kind: 'static-routes',
      nodeId: 'r1',
      routes: [
        { destination: '10.9.0.0/16', nextHop: '203.0.113.10' },
        { destination: '10.0.2.0/24', nextHop: '203.0.113.10' },
      ],
    });
    await screen.click(`${id}-row-0-remove`);
    expect(last()).toMatchObject({
      routes: [{ destination: '10.0.2.0/24', nextHop: '203.0.113.10' }],
    });
    for (let more = 0; more < 8; more += 1) await screen.click(`${id}-add`);
    expect((screen.get(`${id}-add`) as HTMLButtonElement).disabled).toBe(true);
  });

  // TC-496
  it('iface-acl: rules are added, edited, reordered and removed, in the order the engine reads them', async () => {
    const { screen, last } = form([EVERY[8]!], 3);
    const id = settingTestId(EVERY[8]!);
    await screen.click(`${id}-add`);
    await screen.enter(`${id}-row-1-action`, 'deny');
    await screen.enter(`${id}-row-1-protocol`, 'tcp');
    await screen.enter(`${id}-row-1-src`, '192.168.1.10');
    await screen.enter(`${id}-row-1-port`, '80');
    expect(last()).toMatchObject({
      kind: 'iface-acl',
      direction: 'inbound',
      rules: [
        { id: 'a', priority: 10, action: 'permit' },
        { priority: 20, action: 'deny', protocol: 'tcp', srcIp: '192.168.1.10/32', dstPort: 80 },
      ],
    });
    await screen.click(`${id}-row-1-up`);
    const moved = last() as Extract<SettingChange, { kind: 'iface-acl' }>;
    expect(moved.rules.map((rule) => [rule.action, rule.priority])).toEqual([
      ['deny', 10],
      ['permit', 20],
    ]);
    await screen.click(`${id}-row-0-remove`);
    await screen.click(`${id}-row-0-remove`);
    expect(last()).toMatchObject({ kind: 'iface-acl', rules: [] });
  });

  /** TC-497 — a list that is full says so, instead of a button that silently stops working. */
  it('static-routes and iface-acl: a full list says how many it takes and how to make room', async () => {
    const routes = form([EVERY[6]!], 3, 'en');
    const routesId = settingTestId(EVERY[6]!);
    expect(routes.screen.find(`${routesId}-full`)).toBeNull();
    for (let more = 0; more < 5; more += 1) await routes.screen.click(`${routesId}-add`);
    expect((routes.screen.get(`${routesId}-add`) as HTMLButtonElement).disabled).toBe(true);
    expect(routes.screen.get(`${routesId}-full`).textContent).toContain('6 routes');
    await routes.screen.click(`${routesId}-row-5-remove`);
    expect(routes.screen.find(`${routesId}-full`)).toBeNull();
    routes.screen.unmount();

    const acl = form([EVERY[8]!], 3, 'ja');
    const aclId = settingTestId(EVERY[8]!);
    for (let more = 0; more < 7; more += 1) await acl.screen.click(`${aclId}-add`);
    expect((acl.screen.get(`${aclId}-add`) as HTMLButtonElement).disabled).toBe(true);
    expect(acl.screen.get(`${aclId}-full`).textContent).toContain('8 行');
  });

  /**
   * TC-498 — nothing a learner can type into a route or an ACL line reaches the
   * grader in a form it cannot run: every keystroke is graded here, and no
   * check ever answers `engine-error` or `config-invalid`.
   */
  it.each([
    [
      'l2-acl-permit~0',
      'src',
      ['192.168.1.10', '192.168.1.0/24', '192.168.1.10/', '192.168.1', 'abc', '999.1.1.1/40'],
    ],
    ['l2-acl-permit~0', 'dst', ['10.20.0.100', '10.20.0.0/24', '10.20.0.100 /32', '0.0.0.0/0']],
    [
      'l2-static-missing~0',
      'destination',
      ['10.20.0.0/24', '10.20.0.0', '10.20.0.0/', '10.20.0.5/24', 'abc', '0.0.0.0/0'],
    ],
    ['l2-static-missing~0', 'nexthop', ['10.255.0.2', '10.255.0', '10.255.0.2/30', 'next']],
  ] as const)(
    '%s: typing %s one key at a time never gives a grade that cannot be run',
    async (exerciseId, column, typed) => {
      const exercise = exerciseById(exerciseId, 'ja');
      if (!exercise) throw new Error(`no exercise ${exerciseId}`);
      const ref = exercise.allowed.find(
        (allowed) => allowed.kind === 'iface-acl' || allowed.kind === 'static-routes',
      );
      if (!ref) throw new Error('no list to edit');
      let changes: SettingChange[] = [];
      screen = render(
        <SettingsForm
          exercise={exercise}
          topology={exercise.start}
          onChange={(change) => {
            changes = [change];
          }}
        />,
      );
      const id = settingTestId(ref);
      await screen.click(`${id}-add`);
      // The row just added to this card (another card may hold the same kind of list).
      const fields = screen.container.querySelectorAll(
        `[data-testid^="${id}-row-"][data-testid$="-${column}"]`,
      );
      const testId = fields[fields.length - 1]?.getAttribute('data-testid') ?? '';
      // The other column of a route row is filled, so the row is used whenever this one is usable.
      if (column === 'destination')
        await screen.enter(testId.replace('destination', 'nexthop'), '10.255.0.2');
      if (column === 'nexthop')
        await screen.enter(testId.replace('nexthop', 'destination'), '10.20.0.0/24');

      const codes = new Set<string>();
      for (const text of typed) {
        for (let length = 0; length <= text.length; length += 1) {
          await screen.enter(testId, text.slice(0, length));
          const grade = await gradeExercise(exercise, applyChanges(exercise.start, changes));
          grade.results.forEach((result) => codes.add(result.code));
        }
      }
      // Both a row that is used and a row that is held back were graded.
      expect(codes.size).toBeGreaterThan(0);
      expect([...codes]).not.toContain('engine-error');
      expect([...codes]).not.toContain('config-invalid');
    },
    60_000,
  );

  /** TC-498 — a bare address in an ACL line is that one device; a bare address as a route's destination is not used, and the form says why. */
  it('a bare address is one device in an ACL line, and an unfinished row in a route, with a note', async () => {
    const acl = form([EVERY[8]!], 3, 'en');
    const aclId = settingTestId(EVERY[8]!);
    await acl.screen.enter(`${aclId}-row-0-dst`, '203.0.113.10');
    expect(acl.last()).toMatchObject({ rules: [{ dstIp: '203.0.113.10/32' }] });
    expect(acl.screen.find(`${aclId}-note`)).toBeNull();
    await acl.screen.enter(`${aclId}-row-0-dst`, '203.0.113');
    expect(acl.last()).toMatchObject({ rules: [] });
    expect(acl.screen.get(`${aclId}-note`).textContent).toContain('192.168.1.0/24');
    acl.screen.unmount();

    const routes = form([EVERY[6]!], 3, 'en');
    const routesId = settingTestId(EVERY[6]!);
    await routes.screen.enter(`${routesId}-row-0-destination`, '10.9.0.0');
    expect(routes.last()).toMatchObject({ routes: [] });
    expect(routes.screen.get(`${routesId}-note`).textContent).toContain('10.0.2.0/24');
  });

  // TC-499
  it('is in one language at a time', () => {
    const japanese = form(EVERY, 1, 'ja').screen;
    expect(
      englishProse(japanese.container.innerText ?? japanese.container.textContent ?? ''),
    ).toEqual([]);
    for (const heading of japanese.container.querySelectorAll('h3, label > span')) {
      expect(englishProse(heading.textContent ?? ''), heading.textContent ?? '').toEqual([]);
    }
    japanese.unmount();
    const english = form(EVERY, 1, 'en').screen;
    for (const text of english.container.querySelectorAll('h3, label > span, p, button')) {
      expect(hasJapanese(text.textContent ?? ''), text.textContent ?? '').toBe(false);
    }
  });
});

// TC-547
describe('the words on a switch and under a port', () => {
  const shownWith = (changes: SettingChange[], allowed: SettingRef[], locale: 'en' | 'ja') => {
    screen?.unmount();
    screen = render(
      <SettingsForm
        exercise={{ allowed, start: START, level: 1, seed: 3 }}
        topology={applyChanges(START, changes)}
        onChange={() => undefined}
      />,
      { locale },
    );
    return screen;
  };

  it('a cable says how it is now and, apart from that, what a press does', () => {
    const cable = EVERY[2]!;
    const id = settingTestId(cable);
    const up = shownWith([], [cable], 'ja');
    expect(up.get(`${id}-state`).textContent).toBe('つながっています');
    expect(up.get(`${id}-action`).textContent).toBe('→ 押すと、はずします');
    expect(up.get(`${id}-toggle`).getAttribute('aria-checked')).toBe('true');

    const down = shownWith([{ kind: 'link-state', edgeId: 'e-pc1', state: 'down' }], [cable], 'ja');
    expect(down.get(`${id}-toggle`).textContent).toBe(cableLabel('down').ja);
    expect(cableLabel('down').ja).toBe('✕ ぬけています → 押すと、つなぎます');
    expect(cableLabel('up').ja).toBe('● つながっています → 押すと、はずします');

    const english = shownWith([], [cable], 'en');
    expect(english.get(`${id}-toggle`).textContent).toBe(cableLabel('up').en);
  });

  it('a trunk is explained as a trunk, not as an access port', () => {
    const port = EVERY[3]!;
    const id = settingTestId(port);
    const access = shownWith([], [port], 'ja');
    expect(access.get(`${id}-help`).textContent).toBe(ACCESS_PORT_HELP.ja);
    const trunk = shownWith(
      [
        {
          kind: 'port-vlan',
          nodeId: 'sw1',
          portId: 'p1',
          vlanMode: 'trunk',
          trunkAllowedVlans: [10],
        },
      ],
      [port],
      'ja',
    );
    expect(trunk.get(`${id}-help`).getAttribute('data-mode')).toBe('trunk');
    expect(trunk.get(`${id}-help`).textContent).toBe(TRUNK_PORT_HELP.ja);
    expect(TRUNK_PORT_HELP.ja).toContain('書いた VLAN の番号だけ');
  });
});

// TC-542
describe('the order of the cards', () => {
  it('is the diagram’s, whatever order the exercise lists the settings in', () => {
    const ids = (allowed: SettingRef[]) => {
      screen?.unmount();
      screen = render(
        <SettingsForm
          exercise={{ allowed, start: START, level: 1, seed: 3 }}
          topology={START}
          onChange={() => undefined}
        />,
      );
      return [...screen.get('exercise-settings').children].map((card) =>
        card.getAttribute('data-testid'),
      );
    };
    const some = [EVERY[0]!, EVERY[1]!, EVERY[2]!, EVERY[4]!];
    expect(ids([...some].reverse())).toEqual(ids(some));
  });
});
