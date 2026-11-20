import { expect, test } from './fixtures/harness';

/** REQ-398 — anycast: predict the site, withdraw one, compare with DNS steering (TC-2027, TC-2028). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2027: the Singapore user reaches Frankfurt, not the nearer Tokyo, and moves to Tokyo when Frankfurt withdraws', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/anycast');
  await expect(page.getByTestId('any-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('any-withdraw')).toHaveCount(0);
  await page.getByTestId('any-guess-tyo').click();
  await page.getByTestId('any-reveal-button').click();
  const reveal = page.getByTestId('any-reveal');
  await expect(reveal).toHaveAttribute('data-right', 'false');
  await expect(reveal).toHaveAttribute('data-site', 'site-fra');
  await expect(reveal).toHaveAttribute('data-rtt', '162');
  await expect(page.getByTestId('any-row-isp-osaka')).toHaveAttribute('data-site', 'site-tyo');
  await page.getByTestId('any-down-site-fra').click();
  await expect(page.getByTestId('any-row-isp-sg')).toHaveAttribute('data-site', 'site-tyo');
  await expect(page.getByTestId('any-row-isp-sg')).toHaveAttribute('data-rtt', '74');
  await expect(page.getByTestId('any-row-isp-london')).toHaveAttribute('data-site', 'site-nyc');
  await expect(page.getByTestId('any-row-isp-london')).toHaveAttribute('data-rtt', '102');
});

test('TC-2028: DNS steering through a London resolver sends Osaka to Frankfurt; ECS sends it to Tokyo', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/anycast');
  await page.getByTestId('any-guess-fra').click();
  await page.getByTestId('any-reveal-button').click();
  await expect(page.getByTestId('any-reveal')).toHaveAttribute('data-right', 'true');
  const osaka = page.getByTestId('any-dns-isp-osaka');
  await expect(osaka).toHaveAttribute('data-server', 'site-fra');
  await expect(osaka).toHaveAttribute('data-rtt', '252');
  await expect(page.getByTestId('any-dns-isp-chicago')).toHaveAttribute('data-rtt', '106');
  await page.getByTestId('any-resolver-public-london-ecs').click();
  await expect(osaka).toHaveAttribute('data-server', 'site-tyo');
  await expect(osaka).toHaveAttribute('data-rtt', '12');
});
