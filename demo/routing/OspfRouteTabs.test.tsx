/* @vitest-environment jsdom */
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
// The app's entry registers the routing protocols; a test rendering the
// panel on its own has to do the same.
import '../../src/layers/l3-network/index';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { buildOspfConvergenceTopology } from '../../src/scenarios/ospf-convergence';
import { GalleryLocaleProvider, type GalleryLocale } from '../localeContext';
import { RouterTablesPanel } from './OspfConvergenceDemo';

function panel(locale: GalleryLocale): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = renderToString(
    <GalleryLocaleProvider locale={locale}>
      <NetlabProvider topology={buildOspfConvergenceTopology(false)}>
        <RouterTablesPanel />
      </NetlabProvider>
    </GalleryLocaleProvider>,
  );
  return container;
}

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
