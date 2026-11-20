import { expect, test } from './fixtures/harness';

/** REQ-400 — NETCONF/YANG: predict R2's running config, push three ways, confirmed commit (TC-2047, TC-2048). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2047: an invalid MTU leaves R2 unchanged under NETCONF but half-configured under CLI', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/netconf');
  await expect(page.getByTestId('nc-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('nc-push')).toHaveCount(0);
  await page.getByTestId('nc-guess-before-error').click();
  await page.getByTestId('nc-reveal-button').click();
  await expect(page.getByTestId('nc-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('nc-reveal')).toHaveAttribute('data-committed', 'false');

  await expect(page.getByTestId('nc-row-R1')).toHaveAttribute('data-status', 'committed');
  await expect(page.getByTestId('nc-row-R2')).toHaveAttribute('data-status', 'rejected');
  await expect(page.getByTestId('nc-row-R2')).toHaveAttribute('data-mtu', '1500');
  await expect(page.getByTestId('nc-row-R2')).toHaveAttribute('data-addresses', '1');

  await page.getByTestId('nc-method-netconf-all-or-none').click();
  await expect(page.getByTestId('nc-row-R1')).toHaveAttribute('data-status', 'aborted');
  await expect(page.getByTestId('nc-row-R1')).toHaveAttribute('data-mtu', '1500');

  await page.getByTestId('nc-method-cli').click();
  await expect(page.getByTestId('nc-row-R2')).toHaveAttribute('data-status', 'half-applied');
  await expect(page.getByTestId('nc-row-R2')).toHaveAttribute('data-addresses', '2');
  await expect(page.getByTestId('nc-cli-lines')).toHaveAttribute('data-failed-line', '3');

  await page.getByTestId('nc-method-netconf').click();
  await page.getByTestId('nc-mtu-R2').fill('9000');
  await expect(page.getByTestId('nc-row-R2')).toHaveAttribute('data-status', 'committed');
  await expect(page.getByTestId('nc-row-R2')).toHaveAttribute('data-mtu', '9000');
  await expect(page.getByTestId('nc-xml-text')).toContainText('<mtu>9000</mtu>');

  await page.getByTestId('nc-description').fill('core & edge');
  await expect(page.getByTestId('nc-xml-text')).toContainText(
    '<description>core &amp; edge</description>',
  );
});

test('TC-2048: a confirmed commit that cuts the session rolls back at the timeout', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/netconf');
  await page.getByTestId('nc-guess-nothing').click();
  await page.getByTestId('nc-reveal-button').click();
  await expect(page.getByTestId('nc-reveal')).toHaveAttribute('data-right', 'true');
  const result = page.getByTestId('nc-confirmed-result');
  await expect(result).toHaveAttribute('data-rolled-back', 'true');
  await expect(result).toHaveAttribute('data-rolled-back-at', '600');
  await expect(result).toHaveAttribute('data-eth0-enabled', 'true');
  await page.getByTestId('nc-trial-mtu').click();
  await expect(result).toHaveAttribute('data-rolled-back', 'false');
  await expect(result).toHaveAttribute('data-final-mtu', '9000');
  await page.getByTestId('nc-timeout').fill('20');
  await expect(result).toHaveAttribute('data-rolled-back-at', '20');
  await expect(result).toHaveAttribute('data-final-mtu', '1500');
});
