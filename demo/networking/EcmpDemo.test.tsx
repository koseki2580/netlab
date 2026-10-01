/* @vitest-environment jsdom */
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import EcmpDemo from './EcmpDemo';

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
