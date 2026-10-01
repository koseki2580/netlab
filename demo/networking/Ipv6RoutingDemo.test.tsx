import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Ipv6RoutingDemo, { ipv6RoutingTopology } from './Ipv6RoutingDemo';

describe('Ipv6RoutingDemo', () => {
  it('renders the IPv6 routing demo controls', () => {
    const html = renderToString(
      <MemoryRouter>
        <Ipv6RoutingDemo />
      </MemoryRouter>,
    );

    expect(html).toContain('IPv6 Routing Ecosystem');
    expect(html).toContain('OSPFv3 ECMP');
    expect(html).toContain('MP-BGP IPv6');
  });

  // TC-240: once R1-R2 fails, no route may use a next hop on that link.
  it('TC-240: leaves R1 no route through the failed R1-R2 link', () => {
    const before = ipv6RoutingTopology(false).routeTables.get('r1') ?? [];
    expect(before.find((route) => route.destination === '2001:db8:2::/64')).toMatchObject({
      protocol: 'bgp',
      nextHop: '2001:db8:12::2',
    });

    const after = ipv6RoutingTopology(true).routeTables.get('r1') ?? [];
    expect(after.filter((route) => route.nextHop.startsWith('2001:db8:12:'))).toEqual([]);
    expect(after.filter((route) => route.destination === '2001:db8:12::/64')).toEqual([]);
    expect(after.filter((route) => route.protocol === 'bgp' && route.nextHop !== 'direct')).toEqual(
      [],
    );
  });
});
