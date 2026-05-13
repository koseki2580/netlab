import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LinkQosDemo from './LinkQosDemo';

describe('LinkQosDemo', () => {
  it('renders the QoS demo shell and controls', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LinkQosDemo />
      </MemoryRouter>,
    );

    expect(html).toContain('Per-Link QoS');
    expect(html).toContain('Send QoS burst');
    expect(html).toContain('LINK QOS');
  });
});
