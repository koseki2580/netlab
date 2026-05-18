import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('wireless demo shows RSSI loss, WPA2 messages, and hidden-node collision', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/wireless');

  await expect(page.getByTestId(SEL.demo.wirelessAssociation)).toContainText('connected');
  await expect(page.getByTestId(SEL.demo.wpaMessages)).toContainText('M1 M2 M3 M4');

  const before = await page.getByTestId(SEL.demo.wirelessLoss).textContent();
  await page.getByTestId(SEL.demo.stationDistance).fill('300');
  await expect(page.getByTestId(SEL.demo.wirelessLoss)).not.toHaveText(before ?? '');

  await page.getByTestId(SEL.demo.hiddenNodeToggle).click();
  await expect(page.getByTestId(SEL.demo.hiddenNode)).toContainText('Collision: sta-a, sta-b');
});
