import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import TcpCongestionDemo from './TcpCongestionDemo';

describe('TcpCongestionDemo', () => {
  it('opens waiting to be run, rather than with the trace already drawn', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TcpCongestionDemo />
      </MemoryRouter>,
    );

    expect(html).toContain('TCP Congestion Control');
    expect(html).toContain('TCP CONGESTION');
    // The walkthrough belongs to the run, not to the page load: the trace is
    // deterministic, so drawing it at mount left the run button with nothing
    // to change. `e2e/tcp-congestion.spec.ts` presses it and reads the chart.
    expect(html).toContain('tcp-congestion-empty');
    expect(html).not.toContain('rto-fire');
  });
});
