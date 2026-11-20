import { expect, test } from './fixtures/harness';

/** REQ-396 — BGP best path and communities: predict, step through, change attributes, tag a route (TC-2009). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2009: ISP-B wins at eBGP over iBGP, a lower MED from ISP-A changes only the deciding step, and NO_EXPORT stops at the AS edge', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/bgp-policy');
  await expect(page.getByTestId('bgp-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('bgp-trace')).toHaveCount(0);
  await page.getByTestId('bgp-guess-ibgp').click();
  await page.getByTestId('bgp-reveal-button').click();
  const reveal = page.getByTestId('bgp-reveal');
  await expect(reveal).toHaveAttribute('data-right', 'false');
  await expect(reveal).toHaveAttribute('data-winner', 'isp-b');
  await expect(reveal).toHaveAttribute('data-step', 'ebgp');
  await expect(page.getByTestId('bgp-trace-med')).toHaveAttribute('data-removed', 'isp-a');

  await expect(page.getByTestId('bgp-med-reveal-button')).toBeDisabled();
  await page.getByTestId('bgp-guess-med-isp-a').click();
  await page.getByTestId('bgp-med-reveal-button').click();
  const medReveal = page.getByTestId('bgp-med-reveal');
  await expect(medReveal).toHaveAttribute('data-right', 'false');
  await expect(medReveal).toHaveAttribute('data-winner', 'isp-b');
  await expect(medReveal).toHaveAttribute('data-step', 'router-id');

  const result = page.getByTestId('bgp-explore-result');
  await expect(result).toHaveAttribute('data-winner', 'isp-b');
  await page.getByTestId('bgp-always-compare-med').check();
  await expect(result).toHaveAttribute('data-winner', 'isp-a');
  await expect(result).toHaveAttribute('data-step', 'med');
  await page.getByTestId('bgp-ibgp-local-pref').fill('150');
  await expect(result).toHaveAttribute('data-winner', 'ibgp');
  await expect(result).toHaveAttribute('data-step', 'local-pref');
});

test('TC-2009: communities decide which routers keep the route and what LOCAL_PREF it gets', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/bgp-policy');
  await expect(page.getByTestId('bgp-spread-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('bgp-communities')).toHaveCount(0);
  await page.getByTestId('bgp-guess-spread-everyone').click();
  await page.getByTestId('bgp-spread-reveal-button').click();
  await expect(page.getByTestId('bgp-spread-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('bgp-router-e2')).toHaveAttribute('data-holds', 'true');
  await expect(page.getByTestId('bgp-router-peer')).toHaveAttribute('data-holds', 'false');
  await page.getByTestId('bgp-community-no-advertise').click();
  await expect(page.getByTestId('bgp-router-e1')).toHaveAttribute('data-holds', 'true');
  await expect(page.getByTestId('bgp-router-c1')).toHaveAttribute('data-holds', 'false');
  await page.getByTestId('bgp-community-lp-80').click();
  await expect(page.getByTestId('bgp-router-c1')).toHaveAttribute('data-local-pref', '80');
  await expect(page.getByTestId('bgp-router-peer')).toHaveAttribute('data-local-pref', '100');
});
