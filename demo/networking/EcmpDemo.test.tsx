import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import EcmpDemo from './EcmpDemo';

describe('EcmpDemo', () => {
  it('renders the ECMP demo shell and controls', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EcmpDemo />
      </MemoryRouter>,
    );

    expect(html).toContain('ECMP Multipath');
    expect(html).toContain('Send ECMP flows');
    expect(html).toContain('ECMP Decisions');
  });
});
