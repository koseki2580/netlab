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

  it('DemoShell marks the simulator route as a fixed-viewport sim shell', () => {
    // The simulator must stay a 100vh region even after the gallery is freed
    // from the body height trap — the shell wrapper is the marker for that.
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DemoShell title="Example" desc="Shared shell">
          <div>demo body</div>
        </DemoShell>
      </MemoryRouter>,
    );
    expect(html).toContain('data-netlab-sim-shell');
    expect(html).toContain('netlab-sim-shell');
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

  it('Gallery renders the routing track as a CategoryLanding (hero + recommended order)', () => {
    const html = renderGallery();

    // The category landing marker replaces the legacy section header.
    expect(html).toContain('data-category-landing="routing"');
    // Recommended-order list keeps every routing demo discoverable.
    expect(html).toContain('OSPF Convergence');
    expect(html).toContain('Multi-Hop');
    expect(html).toContain('Dynamic Routing');
    // Hero progress bar surfaces a11y semantics.
    expect(html).toContain('role="progressbar"');
    // Open action is rendered as the recommended-order CTA.
    expect(html).toContain('Open →');
  });

  it('Non-track categories still render the legacy card grid', () => {
    const html = renderGallery();

    // 'basic' is not in TRACK_LANDING_IDS, so its grid stays.
    expect(html).toContain('data-gallery-section="basic"');
    expect(html).toContain('Three-Tier LAN');
  });
});

describe('Gallery — canvas-first layout (P3)', () => {
  it('exposes a sticky sidebar via data hook with sticky positioning', () => {
    const html = renderGallery();

    // The sidebar should keep its sticky placement so it stays visible while
    // the document scrolls past the viewport.
    expect(html).toContain('data-netlab-sidebar');
    const sidebarOpen = html.indexOf('data-netlab-sidebar');
    expect(sidebarOpen).toBeGreaterThan(-1);
    const sidebarSlice = html.slice(sidebarOpen, sidebarOpen + 800);
    expect(sidebarSlice).toContain('position:sticky');
    expect(sidebarSlice).toContain('top:0');
  });

  it('wraps the search/control row in a sticky element with backdrop blur', () => {
    const html = renderGallery();

    expect(html).toContain('data-netlab-search-bar');
    const open = html.indexOf('data-netlab-search-bar');
    expect(open).toBeGreaterThan(-1);
    const slice = html.slice(open, open + 800);
    expect(slice).toContain('position:sticky');
    expect(slice).toContain('top:0');
    // Translucent backdrop so canvas content peeks through while the bar
    // remains pinned to the top of the main column.
    expect(slice).toContain('backdrop-filter:blur');
  });

  it('does not put overflow:auto on the main column (so document scrolls naturally)', () => {
    const html = renderGallery();

    // Tag the main column so we can scope the assertion.
    expect(html).toContain('data-netlab-gallery-main');
    const open = html.indexOf('data-netlab-gallery-main');
    const slice = html.slice(open, open + 800);
    expect(slice).not.toMatch(/overflow-y:\s*auto/);
    expect(slice).not.toMatch(/overflow:\s*auto/);
    expect(slice).not.toMatch(/overflow:\s*hidden/);
  });

  it('keeps the gallery root at min-height 100vh with no overflow trap', () => {
    const html = renderGallery();

    // Root opens with a known data attribute already (palette) — anchor on it.
    const open = html.indexOf('data-netlab-palette');
    const slice = html.slice(open, open + 1200);
    expect(slice).toContain('min-height:100vh');
    expect(slice).not.toMatch(/overflow:\s*hidden/);
  });
});
