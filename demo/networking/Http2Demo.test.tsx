import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Http2Demo from './Http2Demo';

describe('Http2Demo', () => {
  it('renders the HTTP/2 multiplexing demo controls', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Http2Demo />
      </MemoryRouter>,
    );

    expect(html).toContain('HTTP/2 Multiplexing');
    expect(html).toContain('Enable TCP Loss');
    expect(html).toContain('h2:frame(DATA)');
  });
});
