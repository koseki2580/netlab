import type { Page } from '@playwright/test';
import type { BuildExercise, FragmentExercise } from '../demo/packet-lab/model';
import { exerciseById } from '../demo/packet-lab/templates';
import { expect, test } from './fixtures/harness';
import type { DemoPage } from './pages/DemoPage';

/**
 * TC-770 to TC-775 — the packet exercises as a learner meets them: from the
 * exercises hub to the packet track, a packet filled in and checked on the
 * simulator, a classic mistake told by its message, a split stated in the
 * fragment table at a desk and on a phone, and the level counting the solve.
 *
 * Exercises are pinned by id; what a test needs to know of one (its answer) is
 * read from the generator, not written here twice.
 */

function packet<T>(id: string): T {
  const found = exerciseById(id);
  if (!found) throw new Error(`no packet exercise ${id}`);
  return found as T;
}

async function inJapanese(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* without storage the page is in English, and the text checks fail and say so */
    }
  });
}

async function open(page: Page, demoPage: DemoPage, id: string) {
  await demoPage.goto(`/exercises/packet/do/${id}`);
  await expect(page.getByTestId('packet-exercise')).toHaveAttribute('data-exercise-id', id);
}

async function check(page: Page, passed: boolean) {
  await page.getByTestId('packet-check').click();
  await expect(page.getByTestId('packet-result')).toHaveAttribute('data-passed', String(passed));
}

async function stateSplit(page: Page, exercise: FragmentExercise) {
  for (const [index, row] of exercise.reference.entries()) {
    await page.getByTestId('fragment-add').click();
    await page.getByTestId(`fragment-size-${index + 1}`).fill(String(row.size));
  }
}

test.beforeEach(async ({ page }) => {
  await inJapanese(page);
});

test('TC-770: the packet exercises are reached from the exercises hub', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/exercises');
  await page.getByTestId('exercises-packet-link').click();
  for (const level of [1, 2, 3, 4]) {
    await expect(page.getByTestId(`packet-level-${level}`)).toBeVisible();
  }
  await page.getByTestId('packet-start-1').click();
  await expect(page.getByTestId('packet-check')).toBeVisible();
});

test('TC-771: a build exercise is solved by writing the address read off the diagram', async ({
  page,
  demoPage,
}) => {
  const exercise = packet<BuildExercise>('p1-send-to~0');
  await open(page, demoPage, exercise.id);
  await page.getByTestId('packet-field-dstIp').fill(String(exercise.reference.dstIp));
  await check(page, true);
  await expect(page.getByTestId('packet-hops')).toBeVisible();
  await expect(page.getByTestId('packet-next')).toBeVisible();
});

test('TC-772: a TTL one short is told by its own message', async ({ page, demoPage }) => {
  const exercise = Array.from({ length: 20 }, (_, seed) =>
    packet<BuildExercise>(`p2-smallest-ttl~${seed}`),
  ).find((entry) =>
    entry.fields[0]?.candidates?.some((option) => option.value === Number(entry.reference.ttl) - 1),
  );
  if (!exercise) throw new Error('no instance offering a TTL one short');
  await open(page, demoPage, exercise.id);
  await page.getByTestId(`packet-field-ttl-option-${Number(exercise.reference.ttl) - 1}`).click();
  await check(page, false);
  const message = page.getByTestId('packet-result-message').first();
  await expect(message).toContainText('TTL が足りず');
  await expect(message).toContainText('ルータを 1 台越えるたびに 1 ずつ減ります');
});

test('TC-773: a split is stated in the fragment table and solved at a desk', async ({
  page,
  demoPage,
}) => {
  const exercise = packet<FragmentExercise>('p3-fragment~0');
  await open(page, demoPage, exercise.id);
  await stateSplit(page, exercise);
  await check(page, true);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('TC-774: each piece is a card of its own, and the split is solved', async ({
    page,
    demoPage,
  }) => {
    const exercise = packet<FragmentExercise>('p3-fragment~0');
    await open(page, demoPage, exercise.id);
    await stateSplit(page, exercise);
    const size = await page.getByTestId('fragment-size-1').boundingBox();
    const remove = await page.getByTestId('fragment-remove-1').boundingBox();
    const card = await page.getByTestId('fragment-row-1').boundingBox();
    // A card: its parts stand one under the other, and it fits the screen.
    expect(remove && size ? remove.y : 0).toBeGreaterThan(size ? size.y + size.height - 1 : 0);
    expect(card ? card.x + card.width : 999).toBeLessThanOrEqual(390);
    const scrolls = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(scrolls).toBe(false);
    await check(page, true);
  });
});

test('TC-775: the level counts a solve', async ({ page, demoPage }) => {
  await demoPage.goto('/exercises/packet/level/1');
  await expect(page.getByTestId('packet-level-headline-1')).toHaveAttribute('data-solved', '0');
  const exercise = packet<BuildExercise>('p1-send-to~0');
  await open(page, demoPage, exercise.id);
  await page.getByTestId('packet-field-dstIp').fill(String(exercise.reference.dstIp));
  await check(page, true);
  await page.getByTestId('packet-back-to-level').click();
  await expect(page.getByTestId('packet-level-headline-1')).toHaveAttribute('data-solved', '1');
  await expect(page.getByTestId('packet-level-record-item')).toHaveCount(1);
});
