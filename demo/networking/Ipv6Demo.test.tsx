import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Ipv6Demo from './Ipv6Demo';

describe('Ipv6Demo', () => {
  it('renders the dual-stack demo controls', () => {
    const html = renderToString(
      <MemoryRouter>
        <Ipv6Demo />
      </MemoryRouter>,
    );

    expect(html).toContain('IPv6 Dual-Stack');
    expect(html).toContain('Send IPv6 Echo');
    expect(html).toContain('2001:db8:2::20');
  });
});
