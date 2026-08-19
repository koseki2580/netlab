import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('HTTPS demo shows TLS handshake annotations and ALPN alert path', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/https');

  await page.getByTestId(SEL.demo.tlsRunHandshake).click();
  const traceLog = page.getByTestId(SEL.demo.traceLog).first();
  await expect(traceLog).toContainText('tls:client-hello');
  await expect(traceLog).toContainText('tls:finished');
  // ALPN is reported by the handshake view, not the trace log — the log lists
  // the handshake messages, the view states what was negotiated.
  await expect(page.getByTestId(SEL.demo.tlsAlpn)).toContainText('ALPN: http/1.1');

  await page.getByTestId(SEL.demo.tlsForceAlpnMismatch).click();
  await expect(page.getByTestId(SEL.demo.tlsAlpn)).toContainText('no_application_protocol');

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});
