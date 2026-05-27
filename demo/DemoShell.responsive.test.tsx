/* @vitest-environment jsdom */

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import DemoShell from './DemoShell';

const originalWidth = window.innerWidth;

function setWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
}

afterEach(() => {
  setWidth(originalWidth);
});

function render(path = '/routing/ospf-convergence') {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <DemoShell title="Example" desc="Shared shell">
        <div>demo body</div>
      </DemoShell>
    </MemoryRouter>,
  );
}

describe('DemoShell responsive layout (S1)', () => {
  it('uses the left rail on wide viewports', () => {
    setWidth(1200);
    const html = render();
    expect(html).toContain('data-variant="rail"');
    expect(html).not.toContain('data-variant="bottom"');
    expect(html).not.toContain('data-narrow');
  });

  it('switches to a bottom bar below 900px', () => {
    setWidth(375);
    const html = render();
    expect(html).toContain('data-variant="bottom"');
    expect(html).not.toContain('data-variant="rail"');
    expect(html).toContain('data-narrow');
    // Same nav items survive the variant switch.
    expect(html).toContain('aria-label="Run"');
    expect(html).toContain('aria-label="Browse"');
  });

  it('uses a dynamic viewport height to dodge the iOS Safari toolbar', () => {
    setWidth(375);
    const html = render();
    expect(html).toContain('height:100dvh');
  });
});
