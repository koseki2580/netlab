import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import WirelessDemo from './WirelessDemo';

describe('WirelessDemo', () => {
  it('renders wireless radio, association, and hidden-node panels', () => {
    const html = renderToString(
      <MemoryRouter>
        <WirelessDemo />
      </MemoryRouter>,
    );

    expect(html).toContain('Wireless 802.11');
    expect(html).toContain('Radio model');
    expect(html).toContain('Association');
    expect(html).toContain('CSMA/CA');
  });
});
