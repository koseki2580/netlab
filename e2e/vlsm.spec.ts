import { generateVlsm, largestFirstPlan } from '../demo/learning/vlsm';
import { expect, test } from './fixtures/harness';

/** REQ-366 — VLSM practice: a plan that follows the rules passes; a wrong subnet says why (TC-1743). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1743: a rule-following plan passes, and a subnet too small is explained', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/learning/vlsm?seed=42');
  const problem = generateVlsm(42);
  const plan = largestFirstPlan(problem);
  await expect(page.getByTestId('vlsm-block')).toContainText(`${problem.block.network}/24`);
  for (const [index, allocation] of plan.entries()) {
    await page.getByTestId(`vlsm-network-${index}`).fill(allocation.network);
    await page.getByTestId(`vlsm-prefix-${index}`).selectOption(String(allocation.prefix));
  }
  await page.getByTestId('vlsm-check').click();
  await expect(page.getByTestId('vlsm-verdict')).toHaveAttribute('data-ok', 'true');

  await page.getByTestId('vlsm-prefix-0').selectOption('30');
  await page.getByTestId('vlsm-check').click();
  await expect(page.getByTestId('vlsm-verdict')).toHaveAttribute('data-ok', 'false');
  await expect(page.getByTestId('vlsm-why-0')).toContainText('小さすぎます');

  await page.getByTestId('vlsm-show').click();
  await expect(page.getByTestId('vlsm-solution')).toContainText(
    `${plan[0]?.network}/${plan[0]?.prefix}`,
  );
});
