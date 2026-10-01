/* @vitest-environment jsdom */
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
// The app's entry registers the routing protocols; a test rendering the
// lesson on its own has to do the same.
import '../../src/layers/l3-network/index';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { GalleryLocaleProvider, type GalleryLocale } from '../localeContext';
import { buildDynamicRoutingTopology, DynamicRouteTable } from './DynamicRoutingDemo';

type Protocol = 'rip' | 'ospf' | 'bgp';

function table(protocol: Protocol, locale: GalleryLocale): HTMLElement {
  const html = renderToString(
    <GalleryLocaleProvider locale={locale}>
      <NetlabProvider topology={buildDynamicRoutingTopology(protocol)}>
        <DynamicRouteTable protocol={protocol} />
      </NetlabProvider>
    </GalleryLocaleProvider>,
  );
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

function rowText(protocol: Protocol, locale: GalleryLocale, router: string, destination: string) {
  const row = table(protocol, locale).querySelector(
    `[data-testid="dynamic-route-${router}-${destination}"]`,
  );
  return row?.textContent ?? null;
}

describe('the Dynamic Routing lesson route tables', () => {
  // TC-251: OSPF installs both equal-cost next hops and the table shows both.
  it('TC-251: shows both of R4’s equal-cost next hops to 10.1.0.0/24', () => {
    const row = rowText('ospf', 'en', 'r4', '10.1.0.0/24');
    expect(row).toContain('10.0.24.1');
    expect(row).toContain('10.0.34.1');
    expect(row).toContain('equal cost');
    expect(row).toContain('metric 3');
    expect(rowText('ospf', 'ja', 'r4', '10.1.0.0/24')).toContain('等コスト');
  });

  it('TC-251: keeps R2’s single next hop to 10.0.13.0/30 at metric 3', () => {
    const row = rowText('ospf', 'en', 'r2', '10.0.13.0/30');
    expect(row).toContain('next-hop: 10.0.24.2');
    expect(row).toContain('metric 3');
    expect(row).not.toContain('equal cost');
  });

  // TC-252: a BGP route's number is its AS path length, and is named so.
  it('TC-252: names a BGP route’s number the AS path length, in both languages', () => {
    const english = rowText('bgp', 'en', 'r1', '10.4.0.0/24');
    expect(english).toContain('AS path length 2');
    expect(english).not.toContain('metric');

    const japanese = rowText('bgp', 'ja', 'r1', '10.4.0.0/24');
    expect(japanese).toContain('AS パス長 2');
    expect(japanese).not.toContain('メトリック');
  });

  it('TC-252: still calls a connected or OSPF route’s number a metric', () => {
    expect(rowText('bgp', 'en', 'r1', '10.1.0.0/24')).toContain('metric 0');
    expect(rowText('ospf', 'ja', 'r2', '10.0.13.0/30')).toContain('メトリック 3');
  });

  it('TC-251: says what the RIP table shows: both 2-hop paths are installed', () => {
    const rip = table('rip', 'en');
    expect(rip.textContent).toContain('installs both');
    expect(rip.textContent).not.toContain('first 2-hop path');
    expect(rowText('rip', 'en', 'r1', '10.4.0.0/24')).toContain(
      '10.0.12.2, 10.0.13.2 (equal cost)',
    );
  });

  it('gives R2 no BGP route to 10.0.13.0/30', () => {
    expect(rowText('bgp', 'en', 'r2', '10.0.13.0/30')).toBeNull();
    expect(rowText('bgp', 'en', 'r2', '10.4.0.0/24')).not.toBeNull();
  });

  // TC-270: the OSPF view lists each link's cost, so metric 3 can be added up.
  it('TC-270: lists each OSPF link cost, per direction where the ends differ', () => {
    const cost = (locale: GalleryLocale, edge: string) =>
      table('ospf', locale).querySelector(`[data-testid="ospf-link-cost-${edge}"]`)?.textContent;
    expect(cost('en', 'e-r1-r3')).toBe('R1 → R3: cost 3 · R3 → R1: cost 1');
    expect(cost('en', 'e-r1-r2')).toBe('R1 ↔ R2: cost 1');
    expect(cost('en', 'e-r2-r4')).toBe('R2 ↔ R4: cost 1');
    expect(cost('en', 'e-r3-r4')).toBe('R3 ↔ R4: cost 1');
    expect(cost('ja', 'e-r1-r3')).toBe('R1 → R3: コスト 3 · R3 → R1: コスト 1');
  });

  it('TC-270: shows no OSPF cost list in the RIP and BGP views', () => {
    for (const protocol of ['rip', 'bgp'] as const) {
      expect(table(protocol, 'en').querySelector('[data-testid="ospf-link-costs"]')).toBeNull();
    }
  });

  // TC-271: the BGP view says what is advertised, read from the configuration.
  it('TC-271: names the networks each router originates in BGP, and that links are not', () => {
    const note = (locale: GalleryLocale) =>
      table('bgp', locale).querySelector('[data-testid="dynamic-bgp-originated"]')?.textContent;
    expect(note('en')).toContain('R1: 10.1.0.0/24 · R2: none · R3: none · R4: 10.4.0.0/24');
    expect(note('en')).toContain('a link between two other routers does not appear');
    expect(note('ja')).toContain('R1: 10.1.0.0/24 · R2: なし · R3: なし · R4: 10.4.0.0/24');
    expect(note('ja')).toContain('ほかの 2 台の間のリンクは経路表に現れません');
  });

  it('TC-271: the note matches the configuration and the tables it sits above', () => {
    const routers = buildDynamicRoutingTopology('bgp').nodes.filter((node) => node.data.bgpConfig);
    const originated = routers.flatMap((node) => node.data.bgpConfig?.networks ?? []);
    expect(originated).toEqual(['10.1.0.0/24', '10.4.0.0/24']);
    // No inter-router /30 is originated, and no BGP-learned row is to one.
    expect(originated.filter((network) => network.endsWith('/30'))).toEqual([]);
    const rows = [...table('bgp', 'en').querySelectorAll('[data-testid^="dynamic-route-"]')];
    const learned = rows.filter((row) => row.textContent?.includes('bgp/'));
    expect(learned.length).toBeGreaterThan(0);
    for (const row of learned) {
      expect(originated.some((network) => row.textContent?.startsWith(network))).toBe(true);
    }
  });

  it('TC-271: shows no origination note in the RIP and OSPF views', () => {
    for (const protocol of ['rip', 'ospf'] as const) {
      expect(
        table(protocol, 'en').querySelector('[data-testid="dynamic-bgp-originated"]'),
      ).toBeNull();
    }
  });

  // TC-272: a connected route's next hop is a word, so it is translated.
  it('TC-272: reads a connected route as 直結 in Japanese, in every protocol view', () => {
    for (const protocol of ['rip', 'ospf', 'bgp'] as const) {
      expect(rowText(protocol, 'ja', 'r1', '10.1.0.0/24')).toContain('次ホップ: 直結');
      expect(table(protocol, 'ja').textContent).not.toContain('direct');
      expect(rowText(protocol, 'en', 'r1', '10.1.0.0/24')).toContain('next-hop: direct');
    }
  });
});
