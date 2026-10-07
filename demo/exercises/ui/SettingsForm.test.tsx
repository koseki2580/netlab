/* @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import type { TopologySnapshot } from '../../../src/types/topology';
import type { SettingChange, SettingRef } from '../model/types';
import { lanBehindRouter, withInterface, withNodeData } from '../templates/shared/build';
import { SettingsForm } from './SettingsForm';
import { settingTestId } from './describe';
import { englishProse, hasJapanese, render, type Screen } from './testSupport';

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
  it('shows a card for each allowed setting and for nothing else', () => {
    const allowed = [EVERY[0]!, EVERY[3]!];
    const { screen } = form(allowed);
    const cards = [...screen.get('exercise-settings').children].map((card) =>
      card.getAttribute('data-testid'),
    );
    expect(cards).toEqual(['exercise-setting-host-ip-pc1', 'exercise-setting-port-vlan-sw1-p1']);
  });

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

  it('offers no chips above level 2', () => {
    const { screen } = form([EVERY[0]!], 3);
    expect(screen.find('exercise-chip-0')).toBeNull();
  });

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
