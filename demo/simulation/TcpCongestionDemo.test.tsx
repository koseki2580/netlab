import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import TcpCongestionDemo from './TcpCongestionDemo';

describe('TcpCongestionDemo', () => {
  it('renders the deterministic congestion walkthrough', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TcpCongestionDemo />
      </MemoryRouter>,
    );

    expect(html).toContain('TCP Congestion Control');
    expect(html).toContain('TCP CONGESTION');
    expect(html).toContain('Fast Recovery');
    expect(html).toContain('rto-fire');
  });
});
