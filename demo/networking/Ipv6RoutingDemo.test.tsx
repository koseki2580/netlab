import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Ipv6RoutingDemo from './Ipv6RoutingDemo';

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
});
