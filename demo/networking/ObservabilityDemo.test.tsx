import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ObservabilityDemo from './ObservabilityDemo';

describe('ObservabilityDemo', () => {
  it('renders the observability demo shell and controls', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ObservabilityDemo />
      </MemoryRouter>,
    );

    expect(html).toContain('Flow Observability');
    expect(html).toContain('Send observed flow');
    expect(html).toContain('Flow collector');
  });
});
