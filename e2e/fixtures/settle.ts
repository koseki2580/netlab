import { expect, type Locator } from '@playwright/test';

/**
 * Wait until `read` returns the same value on `quiet` reads in a row, about
 * 100ms apart, and return that value.
 *
 * This is for what has no "done" state to wait on: a canvas easing to its
 * fit, a pan coming to rest, a theme colour transitioning. It waits only as
 * long as things are still moving, unlike a fixed sleep that is too long on a
 * fast machine and too short on a loaded one.
 */
export async function settled<T>(
  read: () => Promise<T>,
  { what = 'the page', quiet = 3 }: { what?: string; quiet?: number } = {},
): Promise<T> {
  let last: string | undefined;
  let value: T | undefined;
  let same = 0;
  await expect
    .poll(
      async () => {
        value = await read();
        const now = JSON.stringify(value);
        same = now === last ? same + 1 : 0;
        last = now;
        return same >= quiet - 1;
      },
      { message: `${what} came to rest`, intervals: [100] },
    )
    .toBe(true);
  return value as T;
}

/** Where each element matched by `locator` is drawn, to the pixel; for `settled`. */
export function boxesOf(locator: Locator): Promise<number[][]> {
  return locator.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return [rect.x, rect.y, rect.width, rect.height].map(Math.round);
    }),
  );
}
