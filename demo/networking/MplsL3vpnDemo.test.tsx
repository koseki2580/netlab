/* @vitest-environment jsdom */
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import MplsL3vpnDemo from './MplsL3vpnDemo';

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
