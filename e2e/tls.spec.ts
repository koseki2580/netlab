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
  // TC-243: in TLS 1.3 the server's ALPN choice travels in EncryptedExtensions,
  // after the ServerHello and before the certificate.
  await expect(traceLog).toHaveText(
    /tls:client-hello\s*tls:server-hello\s*tls:encrypted-extensions\s*tls:certificate\s*tls:certificate-verify\s*tls:finished/,
  );
  const messages = page.getByTestId(SEL.demo.tlsHandshakeMessages);
  await expect(messages).toContainText('EncryptedExtensions selected=http/1.1');
  await expect(messages).not.toContainText('ServerHello selected');

  await page.getByTestId(SEL.demo.tlsForceAlpnMismatch).click();
  await expect(page.getByTestId(SEL.demo.tlsAlpn)).toContainText('no_application_protocol');
  await expect(traceLog).toHaveText(
    /^\s*tls:client-hello\s*tls:alert \(no_application_protocol\)\s*$/,
  );
  await expect(messages).not.toContainText('ServerHello');

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});
