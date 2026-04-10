import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import DemoShell from './DemoShell';
import Gallery from './Gallery';

describe('demo chrome', () => {
  it('DemoShell includes a GitHub source link in the shared header', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DemoShell title="Example" desc="Shared shell">
          <div>demo body</div>
        </DemoShell>
      </MemoryRouter>,
    );

    expect(html).toContain('https://github.com/koseki2580/netlab');
    expect(html).toContain('GitHub');
    expect(html).toContain('Example');
  });

  it('Gallery includes a GitHub source link and key demo cards', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Gallery />
      </MemoryRouter>,
    );

    expect(html).toContain('https://github.com/koseki2580/netlab');
    expect(html).toContain('Comprehensive');
    expect(html).toContain('All-in-One');
    expect(html).toContain('/comprehensive/all-in-one');
    expect(html).toContain('DHCP &amp; DNS');
    expect(html).toContain('/services/dhcp-dns');
    expect(html).toContain('Firewalls &amp; ACLs');
    expect(html).toContain('/simulation/acl');
  });
});
