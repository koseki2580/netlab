import { expect, test } from './fixtures/harness';

/**
 * TC-1233 — the DNS lesson shows the walk from the root, the second lookup
 * answered from the resolver's cache, and NXDOMAIN with its negative cache.
 */
test.describe('English', () => {
  test.use({ appLocale: 'en', viewportPreset: 'desktop' });

  test('the walk, the cache, and an unknown name', async ({ page, demoPage }) => {
    await demoPage.goto('/services/dns-resolution');
    await page.getByTestId('dns-lookup-first').click();
    const steps = page.getByTestId('dns-steps');
    await expect(steps.getByRole('listitem')).toHaveCount(8);
    await expect(page.getByTestId('dns-step-2')).toHaveText(
      'Resolver → Root: query www.example.com A? (RD 0)',
    );
    await expect(page.getByTestId('dns-step-3')).toContainText('referral: ask com');
    await expect(page.getByTestId('dns-step-7')).toContainText('authoritative answer');
    await expect(page.getByTestId('dns-step-count')).toHaveText('The resolver asked 3 servers.');

    await page.getByTestId('dns-lookup-cached').click();
    await expect(steps.getByRole('listitem')).toHaveCount(2);
    await expect(page.getByTestId('dns-step-2')).toContainText('Resolver → PC-B: answer');
    await expect(page.getByTestId('dns-step-count')).toContainText('answered from its cache');

    await page.getByTestId('dns-lookup-missing').click();
    await expect(page.getByTestId('dns-steps').getByRole('listitem').last()).toHaveText(
      'Resolver → PC: NXDOMAIN: no such name (SOA example.com, keep for 60 s)',
    );
    await page.getByTestId('dns-lookup-missing-cached').click();
    await expect(steps.getByRole('listitem')).toHaveCount(2);
    await expect(page.getByTestId('dns-step-2')).toContainText('NXDOMAIN');
  });
});

test.describe('Japanese', () => {
  test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

  test('the steps read in Japanese', async ({ page, demoPage }) => {
    await demoPage.goto('/services/dns-resolution');
    await page.getByTestId('dns-lookup-first').click();
    await expect(page.getByTestId('dns-step-3')).toContainText('委任：com は');
    await expect(page.getByTestId('dns-step-count')).toHaveText(
      'リゾルバは 3 台のサーバーに聞きました。',
    );
  });
});

test.describe('phone', () => {
  test.use({ appLocale: 'en', viewportPreset: 'phone' });

  test('the lesson fits a phone screen', async ({ page, demoPage }) => {
    await demoPage.goto('/services/dns-resolution');
    await page.getByTestId('dns-lookup-first').tap();
    await expect(page.getByTestId('dns-steps').getByRole('listitem')).toHaveCount(8);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
