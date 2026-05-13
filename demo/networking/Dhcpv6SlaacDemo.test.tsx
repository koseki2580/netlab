import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Dhcpv6SlaacDemo from './Dhcpv6SlaacDemo';

describe('Dhcpv6SlaacDemo', () => {
  it('renders the DHCPv6 and SLAAC demo controls', () => {
    const html = renderToString(
      <MemoryRouter>
        <Dhcpv6SlaacDemo />
      </MemoryRouter>,
    );

    expect(html).toContain('DHCPv6 And Stateful SLAAC');
    expect(html).toContain('M=1 DHCPv6 Address');
    expect(html).toContain('Host IPv6');
  });
});
