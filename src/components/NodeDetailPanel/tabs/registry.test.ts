import { describe, expect, it } from 'vitest';
import { en } from '../../../i18n/locales/en';
import { ja } from '../../../i18n/locales/ja';
import { DP_TAB_IDS } from '../useNodeDetailDock';
import { DP_TABS, defaultTab, visibleTabs, type DpTabContext } from './registry';

const node = (role: string, sandbox = false): DpTabContext => ({
  target: { kind: 'node', role },
  sandbox,
});
const edge = (sandbox = false): DpTabContext => ({ target: { kind: 'edge' }, sandbox });

describe('detail-panel tabs — which a selection offers, and which it opens on', () => {
  it.each([
    ['a router', node('router'), ['overview', 'ifaces', 'routes', 'arp'], 'ifaces'],
    ['a switch', node('switch'), ['overview', 'ifaces', 'arp'], 'ifaces'],
    ['a client', node('client'), ['overview'], 'overview'],
    ['a server', node('server'), ['overview'], 'overview'],
    ['a device of another kind', node('firewall'), ['overview'], 'overview'],
    [
      'a router with a sandbox',
      node('router', true),
      ['overview', 'ifaces', 'routes', 'arp', 'sandbox'],
      'sandbox',
    ],
    [
      'a switch with a sandbox',
      node('switch', true),
      ['overview', 'ifaces', 'arp', 'sandbox'],
      'sandbox',
    ],
    ['a client with a sandbox', node('client', true), ['overview', 'sandbox'], 'sandbox'],
    ['a server with a sandbox', node('server', true), ['overview', 'sandbox'], 'sandbox'],
    ['another kind with a sandbox', node('firewall', true), ['overview'], 'overview'],
    ['a link', edge(), ['overview'], 'overview'],
    ['a link with a sandbox', edge(true), ['overview'], 'overview'],
  ] as const)('%s offers %j and opens on %s', (_name, context, offered, opensOn) => {
    expect(visibleTabs(context).map((tab) => tab.id)).toEqual(offered);
    expect(defaultTab(context)).toBe(opensOn);
  });

  it('draws a link with the link tab, and a device with the device tabs', () => {
    expect(visibleTabs(edge()).map((tab) => tab.target)).toEqual(['edge']);
    expect(new Set(visibleTabs(node('router', true)).map((tab) => tab.target))).toEqual(
      new Set(['node']),
    );
  });

  it('never offers the ACL tab, which holds nothing yet', () => {
    for (const context of [node('router', true), node('switch', true), edge(true)]) {
      expect(visibleTabs(context).map((tab) => tab.id)).not.toContain('acl');
    }
  });

  it('names every tab in both languages, and only with ids a stored choice can hold', () => {
    for (const tab of DP_TABS) {
      expect(DP_TAB_IDS).toContain(tab.id);
      expect(en[tab.labelKey]?.trim().length ?? 0).toBeGreaterThan(0);
      expect(ja[tab.labelKey]?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });
});
