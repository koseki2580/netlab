import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import HighAvailabilityDemo from './HighAvailabilityDemo';

describe('HighAvailabilityDemo', () => {
  it('renders VRRP and LACP teaching panels', () => {
    const html = renderToString(
      <MemoryRouter>
        <HighAvailabilityDemo />
      </MemoryRouter>,
    );

    expect(html).toContain('Gateway HA And Link Aggregation');
    expect(html).toContain('VRRP first-hop gateway');
    expect(html).toContain('LACP port-channel');
  });
});
