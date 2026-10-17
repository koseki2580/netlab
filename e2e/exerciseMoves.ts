import type { Page } from '@playwright/test';
import { SEL } from './selectors';

const X = SEL.exercises;

/**
 * A change that cannot be the answer, for a test that needs a Check that
 * misses: a Check with nothing changed is not judged (TC-663). The first
 * text field gets the first value it accepts of: an address on a network no
 * exercise uses (192.0.2.0/24, kept for documentation), a priority 61440, a VLAN
 * number 4000; a route destination gets that network; else the first switch of
 * the form is pressed.
 */
export async function changeSomethingWrong(page: Page): Promise<void> {
  const input = page.getByTestId(X.settings).locator('input[type="text"]:visible').first();
  if ((await input.count()) > 0) {
    const id = (await input.getAttribute('data-testid')) ?? '';
    const tries = id.endsWith('-destination') ? ['192.0.2.0/24'] : ['192.0.2.10', '61440', '4000'];
    for (const value of tries) {
      await input.fill(value);
      // A value the field takes; one it cannot take stays a draft and Check would not judge.
      if ((await input.getAttribute('aria-invalid')) !== 'true') return;
    }
    return;
  }
  // A priority list: the highest number, which makes no switch the centre.
  const select = page.getByTestId(X.settings).locator('select:visible').first();
  if ((await select.count()) > 0) {
    const values = await select
      .locator('option')
      .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
    const now = await select.inputValue();
    const other = [...values].reverse().find((value) => value !== now);
    await select.selectOption(other ?? '');
    return;
  }
  await page.getByTestId(X.settings).locator('[role="switch"]').first().click();
}
