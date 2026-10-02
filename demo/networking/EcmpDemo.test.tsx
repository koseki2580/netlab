/* @vitest-environment jsdom */
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PacketHop } from '../../src/types/simulation';
import { GalleryLocaleProvider, type GalleryLocale } from '../localeContext';
import EcmpDemo, { EcmpDecisions } from './EcmpDemo';

describe('EcmpDemo', () => {
  it('renders the ECMP demo shell and controls', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EcmpDemo />
      </MemoryRouter>,
    );

    expect(html).toContain('ECMP Multipath');
    expect(html).toContain('Send ECMP flows');
    expect(html).toContain('ECMP Decisions');
  });
});

describe('EcmpDemo brief (TC-263)', () => {
  const render = (locale: 'en' | 'ja') => {
    if (locale === 'ja') window.localStorage.setItem('netlab-locale', 'ja');
    try {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <EcmpDemo />
        </MemoryRouter>,
      );
      const start = html.indexOf('data-testid="lesson-brief"');
      return html.slice(start, html.indexOf('data-testid="ecmp-send"'));
    } finally {
      window.localStorage.removeItem('netlab-locale');
    }
  };

  it('calls the router Leaf A, as the canvas does, in English', () => {
    const brief = render('en');

    expect(brief).toContain('Leaf A has two equally good routes');
    expect(brief).not.toMatch(/\bR1\b/);
  });

  it('calls the router Leaf A in Japanese', () => {
    const brief = render('ja');

    expect(brief).toContain('Leaf A には');
    expect(brief).not.toMatch(/R1/);
  });
});

describe('EcmpDecisions runs (TC-293)', () => {
  const VIA_SPINE_2 = new Set([3, 5, 8]);
  const burst = (viaSpine2 = VIA_SPINE_2): PacketHop[] =>
    Array.from({ length: 8 }, (_, index) => {
      const second = viaSpine2.has(index + 1);
      return {
        step: 1,
        srcPort: 49152 + index,
        ecmpTrace: {
          routerId: 'leaf-a',
          flowHash: index,
          bucket: second ? 1 : 0,
          candidateCount: 2,
          chosen: { nextHop: second ? '10.0.13.2' : '10.0.12.2' },
        },
      } as PacketHop;
    });
  const render = (hops: PacketHop[], locale: GalleryLocale = 'en') =>
    renderToStaticMarkup(
      <GalleryLocaleProvider locale={locale}>
        <EcmpDecisions hops={hops} />
      </GalleryLocaleProvider>,
    );
  const textOf = (html: string, testId: string) => {
    const match = new RegExp(`data-testid="${testId}"[^>]*>(.*?)</(?:h3|p|li)>`).exec(html);
    return match?.[1]?.replace(/<!-- -->/g, '') ?? null;
  };

  it('heads one press as run 1 with a tally per next hop and no repeat note', () => {
    const html = render(burst());

    expect(textOf(html, 'ecmp-run-1-heading')).toBe('Run 1');
    expect(textOf(html, 'ecmp-run-1-tally')).toBe('via 10.0.12.2: 5 · via 10.0.13.2: 3');
    expect(html).not.toContain('ecmp-run-2-heading');
    expect(html).not.toContain('ecmp-run-1-repeat');
    expect(textOf(html, 'ecmp-decision-3')).toBe(
      'flow 3 · source port 49154 · bucket 2/2 via 10.0.13.2',
    );
  });

  it('separates a second press, tallies it and says it repeated the first', () => {
    const html = render([...burst(), ...burst()]);

    expect(textOf(html, 'ecmp-run-2-heading')).toBe('Run 2');
    expect(textOf(html, 'ecmp-run-2-tally')).toBe('via 10.0.12.2: 5 · via 10.0.13.2: 3');
    expect(textOf(html, 'ecmp-run-2-repeat')).toBe(
      'Identical to run 1: the same flow always hashes to the same path.',
    );
    // Run 2's heading sits between row 8 and row 9, and the rows keep counting.
    expect(html.indexOf('ecmp-decision-8"')).toBeLessThan(html.indexOf('ecmp-run-2-heading'));
    expect(html.indexOf('ecmp-run-2-heading')).toBeLessThan(html.indexOf('ecmp-decision-9"'));
    expect(textOf(html, 'ecmp-decision-16')).toBe(
      'flow 8 · source port 49159 · bucket 2/2 via 10.0.13.2',
    );
  });

  it('does not claim a repeat when the second run differs or is still arriving', () => {
    const differs = render([...burst(), ...burst(new Set([2, 4, 7]))]);
    expect(textOf(differs, 'ecmp-run-2-tally')).toBe('via 10.0.12.2: 5 · via 10.0.13.2: 3');
    expect(differs).not.toContain('ecmp-run-2-repeat');

    const partial = render([...burst(), ...burst().slice(0, 2)]);
    expect(textOf(partial, 'ecmp-run-2-tally')).toBe('via 10.0.12.2: 2');
    expect(partial).not.toContain('ecmp-run-2-repeat');
  });

  it('says all of it in Japanese', () => {
    const html = render([...burst(), ...burst()], 'ja');

    expect(textOf(html, 'ecmp-run-1-heading')).toBe('1 回目');
    expect(textOf(html, 'ecmp-run-2-heading')).toBe('2 回目');
    expect(textOf(html, 'ecmp-run-2-tally')).toBe('10.0.12.2 経由: 5 · 10.0.13.2 経由: 3');
    expect(textOf(html, 'ecmp-run-2-repeat')).toBe(
      '1 回目とまったく同じです。同じフローは、ハッシュ値が変わらないので必ず同じ経路を通ります。',
    );
  });
});
