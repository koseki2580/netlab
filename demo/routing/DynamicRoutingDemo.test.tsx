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
});
