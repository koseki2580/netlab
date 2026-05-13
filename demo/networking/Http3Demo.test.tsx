import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Http3Demo from './Http3Demo';

describe('Http3Demo', () => {
  it('renders the HTTP/3 QUIC demo controls', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Http3Demo />
      </MemoryRouter>,
    );

    expect(html).toContain('HTTP/3 over QUIC');
    expect(html).toContain('Enable QUIC Stream Loss');
    expect(html).toContain('h3:frame(SETTINGS)');
  });
});
