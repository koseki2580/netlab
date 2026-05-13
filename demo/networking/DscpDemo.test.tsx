import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import DscpDemo from './DscpDemo';

describe('DscpDemo', () => {
  it('renders the DSCP demo shell and controls', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DscpDemo />
      </MemoryRouter>,
    );

    expect(html).toContain('DSCP Shaping');
    expect(html).toContain('Send shaped packets');
    expect(html).toContain('Shaper Decisions');
  });
});
