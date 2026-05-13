import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import HttpsDemo from './HttpsDemo';

describe('HttpsDemo', () => {
  it('renders the HTTPS TLS demo controls', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <HttpsDemo />
      </MemoryRouter>,
    );

    expect(html).toContain('HTTPS TLS 1.3');
    expect(html).toContain('Run HTTPS handshake');
    expect(html).toContain('Force ALPN mismatch');
  });
});
