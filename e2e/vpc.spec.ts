import { VPC_CASES } from '../demo/networking/vpcLesson';
import { expect, test } from './fixtures/harness';

/** REQ-374 — four connections in a VPC: predict, send, read why (TC-1801). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1801: each connection gets through or is stopped as the VPC is built, and the rewrites are shown', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/vpc');
  await expect(page.getByTestId('vpc-terms')).toContainText('NAT gateway');
  for (const [index, situation] of VPC_CASES.entries()) {
    await expect(page.getByTestId('vpc-step')).toHaveAttribute('data-case', situation.id);
    await expect(page.getByTestId('vpc-send')).toBeDisabled();
    // The third prediction is wrong on purpose.
    const arrives = index === 2 ? !situation.arrives : situation.arrives;
    await page.getByTestId(`vpc-guess-${arrives ? 'arrives' : 'stopped'}`).click();
    await page.getByTestId('vpc-send').click();
    const result = page.getByTestId('vpc-result');
    await expect(result).toHaveAttribute('data-arrived', String(situation.arrives));
    await expect(result).toHaveAttribute('data-right', String(index !== 2));
    if (situation.id === 'db-out') {
      await expect(page.getByTestId('vpc-rewrites')).toContainText('10.0.2.10 → 10.0.1.30');
      await expect(page.getByTestId('vpc-rewrites')).toContainText('10.0.1.30 → 198.51.100.1');
    }
    if (situation.id === 'ssh-in') await expect(result).toHaveAttribute('data-reason', 'acl-deny');
    await page.getByTestId('vpc-next').click();
  }
  await expect(page.getByTestId('vpc-summary')).toContainText(
    `${VPC_CASES.length - 1} / ${VPC_CASES.length}`,
  );
});
