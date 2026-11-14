/* @vitest-environment jsdom */
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { GalleryLocaleProvider, type GalleryLocale } from '../localeContext';
import MplsL3vpnDemo, { mplsTopology } from './MplsL3vpnDemo';

/** The LDP paragraph of the brief, as the lesson opens (PHP on). */
function ldpBrief(): string {
  const container = document.createElement('div');
  container.innerHTML = renderToString(
    <MemoryRouter>
      <MplsL3vpnDemo />
    </MemoryRouter>,
  );
  return container.querySelector('[data-testid="mpls-ldp-brief"]')?.textContent ?? '';
}

// TC-704: the brief agrees with the stack the default screen shows.
describe('the MPLS brief with PHP on (TC-704)', () => {
  it('says P pops the transport label, and never that it always swaps', () => {
    const brief = ldpBrief();
    expect(brief).toContain('P pops the transport label');
    expect(brief).toContain('label 3 (implicit null)');
    expect(brief).not.toMatch(/always/);
    expect(brief).not.toContain('swaps 16001 for 16002');
  });
});

/** The lesson's text in a language, as it opens (PHP on). `DemoShell` reads it from storage. */
function lessonText(locale: GalleryLocale, testId: string): string {
  window.localStorage.setItem('netlab-locale', locale);
  const container = document.createElement('div');
  container.innerHTML = renderToString(
    <MemoryRouter>
      <GalleryLocaleProvider locale={locale}>
        <MplsL3vpnDemo />
      </GalleryLocaleProvider>
    </MemoryRouter>,
  );
  return container.querySelector(`[data-testid="${testId}"]`)?.textContent ?? '';
}

// TC-1464 (REQ-351): LDP binds the transport label to PE2's loopback, not to the customer route.
describe("LDP's FEC is the egress PE's loopback (TC-1464)", () => {
  it('the model: PE1 pushes the LDP label for 192.0.2.2/32 over the VPN label for 10.0.2.0/24', () => {
    for (const php of [true, false]) {
      const pe1 = mplsTopology(php).nodes.find((node) => node.id === 'pe1')!;
      const pe2 = mplsTopology(php).nodes.find((node) => node.id === 'pe2')!;
      expect(pe1.data.mpls?.ftn?.map((entry) => entry.prefix)).toEqual(['192.0.2.2/32']);
      expect(pe1.data.mpls?.vpn).toEqual([
        { prefix: '10.0.2.0/24', label: 24010, egress: '192.0.2.2' },
      ]);
      expect(pe2.data.mpls?.ftn?.map((entry) => entry.prefix)).toEqual(['192.0.2.1/32']);
      expect(pe2.data.interfaces?.map((side) => side.ipAddress)).toContain('192.0.2.2');
    }
  });

  it('the text says so, in English and Japanese', () => {
    const en = lessonText('en', 'mpls-ldp-brief');
    expect(en).toContain('PE2’s loopback, 192.0.2.2/32');
    expect(en).toContain('10.0.2.0/24 rides on the VPN label');
    expect(en).not.toContain('a label for the route to 10.0.2.0/24');
    const ja = lessonText('ja', 'mpls-ldp-brief');
    expect(ja).toContain('PE2 のループバック 192.0.2.2/32');
    expect(ja).toContain('10.0.2.0/24 は VPN ラベル');
    expect(ja).not.toContain('10.0.2.0/24 への経路にラベル');
    expect(lessonText('en', 'mpls-mapping')).toContain('FEC 192.0.2.2/32');
    expect(lessonText('ja', 'mpls-mapping')).toContain('FEC 192.0.2.2/32');
  });
});
