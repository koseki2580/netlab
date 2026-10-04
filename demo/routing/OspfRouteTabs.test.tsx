/* @vitest-environment jsdom */
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
// The app's entry registers the routing protocols; a test rendering the
// panel on its own has to do the same.
import '../../src/layers/l3-network/index';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { protocolRegistry } from '../../src/registry/ProtocolRegistry';
import { buildOspfConvergenceTopology } from '../../src/scenarios/ospf-convergence';
import { GalleryLocaleProvider, type GalleryLocale } from '../localeContext';
import { RouteSummaryPanel, RouterTablesPanel } from './OspfConvergenceDemo';

/**
 * The panel as the lesson shows it: with the link up, or with it failed and
 * the tables from before the failure (`before`) to compare against.
 */
function panel(
  locale: GalleryLocale,
  linkDown = false,
  before = buildOspfConvergenceTopology(false),
): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = renderToString(
    <GalleryLocaleProvider locale={locale}>
      <NetlabProvider topology={buildOspfConvergenceTopology(linkDown)}>
        <RouterTablesPanel {...(linkDown ? { beforeFailure: before } : {})} />
      </NetlabProvider>
    </GalleryLocaleProvider>,
  );
  return container;
}

const CUE = '[data-testid="ospf-recompute-cue"]';
const marks = (root: HTMLElement) =>
  [...root.querySelectorAll('[data-testid^="ospf-route-tab-changed-"]')].map((mark) =>
    mark.getAttribute('data-testid')?.replace('ospf-route-tab-changed-', ''),
  );

// TC-273: the route-table tabs are a tablist whose names differ from the
// topology nodes, which are buttons named "R1" to "R4" too.
describe('the OSPF Convergence route-table tabs', () => {
  it('TC-273: names each tab for its route table and keeps the visible text', () => {
    const tabs = [...panel('en').querySelectorAll('[role="tablist"] > [role="tab"]')];
    expect(tabs.map((tab) => tab.getAttribute('aria-label'))).toEqual([
      'R1 route table',
      'R2 route table',
      'R3 route table',
      'R4 route table',
    ]);
    expect(tabs.map((tab) => tab.textContent)).toEqual(['R1', 'R2', 'R3', 'R4']);
    expect(tabs.map((tab) => tab.getAttribute('data-testid'))).toEqual(
      ['r1', 'r2', 'r3', 'r4'].map((id) => `ospf-route-tab-${id}`),
    );
    expect(panel('ja').querySelector('[role="tab"]')?.getAttribute('aria-label')).toBe(
      'R1 の経路表',
    );
    expect(panel('en').querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe(
      'Route tables',
    );
  });

  it('TC-273: selects one tab and labels the panel by it', () => {
    const root = panel('en');
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual([
      'true',
      'false',
      'false',
      'false',
    ]);
    const tabpanels = root.querySelectorAll('[role="tabpanel"]');
    expect(tabpanels).toHaveLength(1);
    const tabpanel = tabpanels[0]!;
    expect(tabpanel.getAttribute('aria-labelledby')).toBe(tabs[0]!.id);
    expect(tabs[0]!.getAttribute('aria-controls')).toBe(tabpanel.id);
    expect(tabpanel.id.startsWith('sandbox-tabpanel-')).toBe(false);
    // The rows stay a table inside the panel; the panel role is not on it.
    const table = tabpanel.querySelector('[data-testid="ospf-route-table-rows"]');
    expect(table?.tagName).toBe('TABLE');
    expect(table?.getAttribute('role')).toBeNull();
  });
});

// TC-299: once the link has failed, the panel says every router recomputed and
// marks the tabs whose tables differ from before.
describe('the OSPF Convergence route tables after the link fails', () => {
  it('TC-299: shows no cue and no marks while the link is up', () => {
    const root = panel('en');
    expect(root.querySelector(CUE)).toBeNull();
    expect(marks(root)).toEqual([]);
  });

  it('TC-299: invites the learner to the R2 and R4 tabs, in both languages', () => {
    const en = panel('en', true).querySelector(CUE)?.textContent ?? '';
    expect(en).toContain('every router recomputed its routes');
    expect(en).toContain('R2 and R4 tabs');
    const ja = panel('ja', true).querySelector(CUE)?.textContent ?? '';
    expect(ja).toContain('すべてのルータが経路を計算し直しました');
    expect(ja).toContain('R2 と R4 のタブ');
    expect(ja).not.toMatch(/recomputed|tabs|changed/);
  });

  it('TC-299: marks the tabs whose tables differ from before the failure', () => {
    const root = panel('en', true);
    // Every router had a route to the failed link's own network, 10.0.24.0/30.
    expect(marks(root)).toEqual(['r1', 'r2', 'r3', 'r4']);
    const mark = root.querySelector('[data-testid="ospf-route-tab-changed-r2"]')!;
    expect(mark.getAttribute('aria-label')).toBe('changed');
    expect(
      panel('ja', true)
        .querySelector('[data-testid="ospf-route-tab-changed-r2"]')
        ?.getAttribute('aria-label'),
    ).toBe('変化あり');
    // The mark describes the tab; the tab's name and visible text stay as they were.
    const tab = root.querySelector('[data-testid="ospf-route-tab-r2"]')!;
    expect(tab.getAttribute('aria-label')).toBe('R2 route table');
    expect(tab.textContent).toBe('R2');
    expect(tab.getAttribute('aria-describedby')).toBe(mark.id);
  });

  it('TC-299: marks nothing when the tables are the same as before', () => {
    // Compared with themselves, the failed tables have not changed: the marks
    // come from the comparison, not from the link being down.
    const root = panel('en', true, buildOspfConvergenceTopology(true));
    expect(root.querySelector(CUE)).not.toBeNull();
    expect(marks(root)).toEqual([]);
  });

  it('TC-299: leaves the recomputed routes of R2 and R4 as they were', () => {
    const tables = protocolRegistry.resolveRouteTable(buildOspfConvergenceTopology(true));
    expect(tables.get('r2')?.find((route) => route.destination === '10.4.0.0/24')).toMatchObject({
      nextHop: '10.0.12.1',
      metric: 6,
    });
    expect(tables.get('r4')?.find((route) => route.destination === '10.1.0.0/24')).toMatchObject({
      nextHop: '10.0.34.1',
      metric: 3,
    });
  });
});

// TC-308: the card above the tabs is always R1's route to C2's network, and
// its heading says so, so it is not read as the heading of the open tab.
describe("the OSPF Convergence summary of R1's route", () => {
  const summary = (locale: GalleryLocale, linkDown = false): HTMLElement => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(
      <GalleryLocaleProvider locale={locale}>
        <NetlabProvider topology={buildOspfConvergenceTopology(linkDown)}>
          <RouteSummaryPanel runs={[]} />
          <RouterTablesPanel />
        </NetlabProvider>
      </GalleryLocaleProvider>,
    );
    return container;
  };
  const HEADING = '[data-testid="ospf-r1-route-heading"]';
  const NOTE = '[data-testid="ospf-r1-route-note"]';

  it('TC-308: names the router and the destination in its heading, in both languages', () => {
    const en = summary('en');
    expect(en.querySelector(HEADING)?.textContent).toBe('R1’s route to C2’s network (10.4.0.0/24)');
    expect(en.textContent).not.toMatch(/R1 PREFERRED ROUTE/i);
    const ja = summary('ja');
    expect(ja.querySelector(HEADING)?.textContent).toBe(
      'R1 から C2 のネットワーク（10.4.0.0/24）への経路',
    );
    expect(ja.textContent).not.toContain('R1 の優先経路');
  });

  it('TC-308: says the card stays on R1 whichever tab is open', () => {
    expect(summary('en').querySelector(NOTE)?.textContent).toBe(
      'Always R1, whichever tab is open below.',
    );
    const ja = summary('ja').querySelector(NOTE)?.textContent ?? '';
    expect(ja).toBe('下でどのタブを開いても、ここは R1 の経路です。');
  });

  it('TC-308: is a card of its own, outside the route-table tabs', () => {
    const root = summary('en');
    const card = root.querySelector('[data-testid="ospf-r1-route"]')!;
    expect(card.contains(root.querySelector(HEADING))).toBe(true);
    expect(card.querySelector('[role="tablist"]')).toBeNull();
    expect(
      root.querySelector('[data-testid="ospf-route-tables"]')?.querySelector(HEADING),
    ).toBeNull();
  });

  it('TC-308: shows R1’s next hop and metric before and after the link fails', () => {
    const tables = (down: boolean) =>
      protocolRegistry.resolveRouteTable(buildOspfConvergenceTopology(down)).get('r1')!;
    for (const down of [false, true]) {
      const route = tables(down).find((entry) => entry.destination === '10.4.0.0/24')!;
      const text = summary('en', down).querySelector('[data-testid="ospf-r1-route"]')!.textContent;
      expect(text).toContain(`next-hop: ${route.nextHop}`);
      expect(text).toContain(`metric ${route.metric}`);
    }
  });
});
