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
    expect(html).toContain('Enterprise Edge');
    expect(html).toContain('/simulation/enterprise');
    expect(html).toContain('Spanning Tree');
    expect(html).toContain('/networking/stp');
  });

  it('Gallery highlights sandbox-ready demos in an Interactive Sandbox section', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Gallery />
      </MemoryRouter>,
    );

    expect(html).toContain('Interactive Sandbox');
    expect(html).toContain('?sandbox=1&amp;sandboxTab=node#/networking/mtu-fragmentation');
    expect(html).toContain('?sandbox=1&amp;sandboxTab=packet#/simulation/tcp-handshake');
    expect(html).toContain('?sandbox=1&amp;sandboxTab=node#/routing/ospf-convergence');
    expect(html).toContain('?sandbox=1&amp;sandboxTab=traffic#/comprehensive/all-in-one');
  });

  it('Gallery exposes the sandbox intro as the first onboarding entry', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Gallery />
      </MemoryRouter>,
    );

    expect(html).toContain('Start here: Sandbox intro');
    expect(html).toContain(
      '?sandbox=1&amp;sandboxTab=node&amp;intro=sandbox-intro-mtu#/networking/mtu-fragmentation',
    );
  });
});
