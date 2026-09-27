import { expect, test } from './fixtures/harness';

/**
 * TC-LESSON-UDP-SIZE — the large UDP send says what its size means.
 *
 * 「大きく送る（4000 バイト）」 looked exactly like a normal send. The lesson now
 * states the packet's size against the MTU and how many pieces it arrived in.
 * The simulator only fragments at routers and this network has none, so it
 * says honestly that it was not split here and how a real link would split it.
 */
const TID = {
  send: 'demo-primary-action',
  hint: 'udp-large-hint',
  result: 'udp-size-result',
  bytes: 'udp-size-bytes',
  pieces: 'udp-size-pieces',
  explanation: 'udp-size-explanation',
};

test('a normal and a large UDP send are told apart by size and pieces', async ({
  page,
  demoPage,
}) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* the numbers below are checked either way */
    }
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/networking/udp');
  await expect(page.getByTestId(TID.hint)).toContainText('MTU');

  await page.getByTestId(TID.send).click();
  await expect(page.getByTestId(TID.bytes)).toContainText('33');
  await expect(page.getByTestId(TID.result)).toHaveAttribute('data-pieces', '1');

  // The large send is the sibling button of the normal send.
  await page.getByTestId(TID.send).locator('xpath=following-sibling::button[1]').click();
  await expect(page.getByTestId(TID.bytes)).toContainText('4028');
  await expect(page.getByTestId(TID.result)).toHaveAttribute('data-pieces', '1');
  const explanation = page.getByTestId(TID.explanation);
  await expect(explanation).toContainText('1500');
  await expect(explanation).toContainText('1480');
  await expect(explanation).toContainText('1048');
});
