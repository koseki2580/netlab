import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import DemoShell from './DemoShell';
import Gallery, { CATEGORIES } from './Gallery';

function renderGallery(props?: ComponentProps<typeof Gallery>) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Gallery {...props} />
    </MemoryRouter>,
  );
}

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

  it('DemoShell hides Gallery navigation in embedded mode', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DemoShell title="Example" desc="Shared shell" embedded>
          <div>demo body</div>
        </DemoShell>
      </MemoryRouter>,
    );

    expect(html).not.toContain('Gallery');
    expect(html).not.toContain('GitHub');
    expect(html).toContain('demo body');
  });

  it('Gallery includes a GitHub source link and key demo cards', () => {
    const html = renderGallery();

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
    expect(html).toContain('TCP Congestion Control');
    expect(html).toContain('/simulation/tcp-congestion');
  });

  it('Gallery highlights sandbox-ready demos in the featured strip', () => {
    const html = renderGallery();

    // FeaturedStrip renders all sandbox intro hrefs
    expect(html).toContain(
      '?sandbox=1&amp;sandboxTab=node&amp;intro=sandbox-intro-mtu#/networking/mtu-fragmentation',
    );
    expect(html).toContain(
      '?sandbox=1&amp;sandboxTab=packet&amp;intro=sandbox-intro-tcp#/simulation/tcp-handshake',
    );
    expect(html).toContain(
      '?sandbox=1&amp;sandboxTab=node&amp;intro=sandbox-intro-ospf#/routing/ospf-convergence',
    );
    expect(html).toContain(
      '?sandbox=1&amp;sandboxTab=node&amp;intro=sandbox-intro-nat#/simulation/nat',
    );
    // DemoCard renders sandbox hrefs
    expect(html).toContain('?sandbox=1&amp;sandboxTab=traffic#/comprehensive/all-in-one');
  });

  it('Gallery exposes sandbox intros before non-intro sandbox demos', () => {
    const html = renderGallery();

    expect(html).toContain('Start here: Sandbox intro');
    expect(html).toContain(
      '?sandbox=1&amp;sandboxTab=node&amp;intro=sandbox-intro-mtu#/networking/mtu-fragmentation',
    );

    const expectedOrder = [
      'intro=sandbox-intro-mtu',
      'intro=sandbox-intro-tcp',
      'intro=sandbox-intro-ospf',
      'intro=sandbox-intro-nat',
      'Sandbox →',
    ];
    const positions = expectedOrder.map((fragment) => html.indexOf(fragment));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('Gallery exposes assessment scenarios in a dedicated section', () => {
    const html = renderGallery();

    expect(html).toContain('Assessments');
    expect(html).toContain('Assessment →');
    expect(html).toContain(
      '?assessment=ospf-convergence&amp;sandbox=1&amp;sandboxTab=assessment#/routing/ospf-convergence',
    );
  });

  it('Gallery sidebar renders one nav link per category section', () => {
    const html = renderGallery();

    // Each CATEGORIES id appears as a browse control in the sidebar.
    for (const cat of CATEGORIES) {
      expect(html).toContain(`data-section-id="${cat.id}"`);
    }
  });

  it('Gallery demo cards render difficulty tags', () => {
    const html = renderGallery();

    expect(html).toContain('Beginner');
    expect(html).toContain('Intermediate');
    expect(html).toContain('Advanced');
  });

  it('Gallery search box is present with correct placeholder', () => {
    const html = renderGallery();

    expect(html).toContain('Search demos, protocols, layers');
  });

  it('Gallery avoids hard-coded dark-only heading colors in light-mode chrome', () => {
    const html = renderGallery();

    expect(html).not.toContain('color:#f1f5f9');
    expect(html).toContain('color:var(--netlab-text-primary)');
  });

  it('Gallery renders theme mode controls', () => {
    const html = renderGallery();

    expect(html).toContain('Theme');
    expect(html).toContain('Light');
    expect(html).toContain('Dark');
  });

  it('Gallery can render Japanese chrome from an initial locale', () => {
    const html = renderGallery({ initialLocale: 'ja' });

    expect(html).toContain('デモギャラリー');
    expect(html).toContain('日本語');
    expect(html).toContain('言語');
  });

  it('Gallery can start in dark mode', () => {
    const html = renderGallery({ initialThemeMode: 'dark' });

    expect(html).toContain('Dark-mode demo index');
  });

  it('Gallery filters demos from an initial query', () => {
    const html = renderGallery({ initialQuery: 'ospf' });

    expect(html).toContain('OSPF Convergence');
    expect(html).toContain('Dynamic Routing');
    expect(html).not.toContain('Three-Tier LAN');
  });

  it('Gallery can mark an initial active sidebar section', () => {
    const html = renderGallery({ initialActiveSectionId: 'routing' });

    expect(html).toContain('data-section-id="routing" data-active="true"');
  });
});
