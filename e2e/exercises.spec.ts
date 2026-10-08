import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import type { Exercise, SettingChange } from '../demo/exercises/model/types';
import { explain, levelSummary } from '../demo/exercises/store/estimate';
import { buildPool, exerciseById } from '../demo/exercises/templates';
import { refOf } from '../demo/exercises/templates/shared/exercise';
import { addressCandidates } from '../demo/exercises/ui/candidates';
import { settingTestId } from '../demo/exercises/ui/describe';
import { expect, test } from './fixtures/harness';
import type { DemoPage } from './pages/DemoPage';
import { SEL } from './selectors';

/**
 * TC-513 to TC-524, TC-532 to TC-535 and TC-537 — hands-on exercises, as a learner meets them: from the
 * gallery to a level, one exercise from brief to pass, the ways out (hints,
 * the answer), a switch exercise and a choose-a-design exercise, the record
 * surviving a reload, both languages, placement and export.
 *
 * The exercises are pinned by id. An id always generates the same exercise
 * (TC-470), so what a test needs to know about one — its goals, the setting it
 * allows, its reference — is read from the generator, not written here twice.
 */
const X = SEL.exercises;

type Locale = 'ja' | 'en';

const HOST = 'l1-host-address~0';
const VLAN = 'l2-vlan-separate~0';
const DESIGN = 'l1-choose-address~0';

function exercise(id: string): Exercise {
  const found = exerciseById(id);
  if (!found) throw new Error(`no exercise ${id}`);
  return found;
}

async function useLocale(page: Page, locale: Locale) {
  await page.addInitScript((chosen) => {
    try {
      window.localStorage.setItem('netlab-locale', chosen);
    } catch {
      /* without storage the page is in English, and the test says so by failing */
    }
  }, locale);
}

async function open(page: Page, demoPage: DemoPage, id: string) {
  await demoPage.goto(`/exercises/do/${id}`);
  await expect(page.getByTestId(X.panel)).toHaveAttribute('data-exercise-id', id);
  await expect(page.getByTestId(X.check)).toBeVisible();
}

async function check(page: Page, passed: boolean) {
  await page.getByTestId(X.check).click();
  await expect(page.getByTestId(X.result)).toHaveAttribute('data-passed', String(passed));
  await expect(page.getByTestId(X.result)).not.toHaveAttribute('data-stale', '');
}

/** The host exercise's chips: the index of the one that works, and of one that does not. */
function hostChips(): { right: number; wrong: number; hostId: string } {
  const { start, seed, reference, allowed } = exercise(HOST);
  const [ref] = allowed;
  const [answer] = reference;
  if (ref?.kind !== 'host-ip' || answer?.kind !== 'host-ip' || answer.ip === null) {
    throw new Error('the pinned exercise is not a host-address exercise any more');
  }
  const network = answer.ip.split('.').slice(0, 3).join('.');
  const taken = new Set(
    start.nodes.flatMap((node) => [
      ...(typeof node.data.ip === 'string' ? [node.data.ip] : []),
      ...(node.data.interfaces ?? []).map((side) => side.ipAddress),
    ]),
  );
  const works = (ip: string) => ip.startsWith(`${network}.`) && !taken.has(ip);
  const chips = addressCandidates(start, ref.nodeId, seed);
  const right = chips.findIndex(works);
  const wrong = chips.findIndex((ip) => !works(ip));
  if (right === -1 || wrong === -1) throw new Error('the chips offer no right or no wrong address');
  return { right, wrong, hostId: ref.nodeId };
}

async function solveHost(page: Page) {
  await page.getByTestId(X.chip(hostChips().right)).click();
  await check(page, true);
}

/** Put a reference solution into the form by hand, one setting after another. */
async function typeReference(page: Page, changes: readonly SettingChange[]) {
  for (const change of changes) {
    const id = settingTestId(refOf(change));
    switch (change.kind) {
      case 'host-ip':
        await page.getByTestId(`${id}-input`).fill(change.ip ?? '');
        break;
      case 'iface-address':
        await page.getByTestId(`${id}-input`).fill(change.ipAddress);
        await page.getByTestId(`${id}-prefix`).selectOption(String(change.prefixLength));
        break;
      case 'link-state': {
        const toggle = page.getByTestId(`${id}-toggle`);
        const want = String(change.state === 'up');
        if ((await toggle.getAttribute('aria-checked')) !== want) await toggle.click();
        break;
      }
      case 'port-vlan':
        if (change.accessVlan === undefined) throw new Error('a trunk is not typed here');
        await page.getByTestId(`${id}-vlan-input`).fill(String(change.accessVlan));
        break;
      default:
        throw new Error(`this helper does not type a ${change.kind}`);
    }
  }
}

test.describe('in Japanese', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await useLocale(page, 'ja');
  });

  /** TC-513 — the gallery leads to the hub, and a level's button to its first exercise. */
  test('the gallery card opens the hub, and "start level 1" opens an exercise', async ({
    page,
  }) => {
    await page.goto('/#/');
    await page.getByTestId(X.galleryCard).click();
    for (const level of [1, 2, 3, 4]) await expect(page.getByTestId(X.level(level))).toBeVisible();
    // Nothing done yet: the sentence says so instead of showing an empty score.
    await expect(page.getByTestId(X.levelStatus(1))).toHaveText(explain(levelSummary([], 1), 'ja'));

    await page.getByTestId(X.start(1)).click();
    await expect(page.getByTestId(X.panel)).toHaveAttribute(
      'data-exercise-id',
      buildPool(1)[0] ?? '',
    );
    await expect(page.getByTestId(X.diagram)).toBeVisible();
    await expect(page.getByTestId(X.check)).toBeVisible();
  });

  /** TC-524 — levels without a verified pool say what they are, and cannot be mistaken for cleared. */
  test('level 4 says it has no exercises yet, and level 3 is not shown as cleared', async ({
    page,
    demoPage,
  }) => {
    await demoPage.goto('/exercises');
    await expect(page.getByTestId(X.empty(4))).toBeVisible();
    await expect(page.getByTestId(X.start(4))).toHaveCount(0);
    for (const level of [3, 4] as const) {
      await expect(page.getByTestId(X.levelStatus(level))).toHaveText(
        explain(levelSummary([], level), 'ja'),
      );
    }
  });

  /**
   * TC-514 — one exercise from brief to pass: the goals, a Check that says
   * which goal is not met and why, a wrong address that still fails, a right
   * one that passes, and the attempt counted on the hub.
   */
  test('an exercise is checked by running it: wrong stays wrong, right passes, and it is recorded', async ({
    page,
    demoPage,
  }) => {
    const { checks, title, brief } = exercise(HOST);
    const { right, wrong, hostId } = hostChips();
    const failing = `reach-${hostId}-srv`;
    await open(page, demoPage, HOST);

    await expect(page.getByTestId(X.brief)).toContainText(title.ja);
    await expect(page.getByTestId(X.brief)).toContainText(brief.ja);
    // Before any Check a goal is neither met nor missed.
    for (const goal of checks) {
      await expect(page.getByTestId(X.goal(goal.id))).toHaveAttribute('data-mark', 'neutral');
    }

    // The network as it was handed over does not work, and the page says which goal and why.
    await check(page, false);
    await expect(page.getByTestId(X.goal(failing))).toHaveAttribute('data-mark', 'not-yet');
    const missed = page.getByTestId(X.resultGoal(failing));
    await expect(missed).toHaveAttribute('data-passed', 'false');
    await expect(missed).toHaveAttribute('data-code', 'not-delivered');
    // The goal, and under it a reason in the learner's language.
    await expect(missed).toContainText(/[ぁ-ん]{2,}.*\n?.*[ぁ-ん]{2,}/);
    for (const goal of checks.filter((entry) => entry.id !== failing)) {
      await expect(page.getByTestId(X.goal(goal.id))).toHaveAttribute('data-mark', 'done');
    }
    await expect(page.getByTestId(X.next)).toHaveCount(0);

    // A wrong address is still wrong: nothing but the simulator decides.
    await page.getByTestId(X.chip(wrong)).click();
    await expect(page.getByTestId(X.resultStale)).toBeVisible();
    await check(page, false);
    await expect(page.getByTestId(X.next)).toHaveCount(0);

    await page.getByTestId(X.chip(right)).click();
    await check(page, true);
    await expect(page.getByTestId(X.resultSummary)).toContainText('できました');
    // What the learner did is said back, with no note about help.
    await expect(page.getByTestId(X.resultDone)).not.toContainText('ヒント');
    await expect(page.getByTestId(X.resultDone)).not.toContainText('答え');
    for (const goal of checks) {
      await expect(page.getByTestId(X.goal(goal.id))).toHaveAttribute('data-mark', 'done');
    }
    await expect(page.getByTestId(X.check)).toHaveCount(0);
    await expect(page.getByTestId(X.next)).toBeVisible();

    // The hub counts it, in the sentence it shows under the level.
    await demoPage.goto('/exercises');
    await expect(page.getByTestId(X.levelStatus(1))).toContainText('まだ 1 問');
    await demoPage.goto('/exercises/level/1');
    await expect(page.getByTestId(X.kind('l1-host-address'))).toHaveAttribute('data-solved', '1');
    await expect(page.getByTestId(X.recent)).toContainText('解けた');
  });

  /**
   * TC-533 — the result can be watched: the packet the judgement was made on
   * is replayed on the diagram, until a setting changes.
   */
  test('"watch it on the diagram" replays the packet that was stopped', async ({
    page,
    demoPage,
  }) => {
    const { hostId, wrong } = hostChips();
    const failing = `reach-${hostId}-srv`;
    await open(page, demoPage, HOST);
    const packet = page.getByTestId(X.diagram).getByTestId(SEL.canvas.packet);
    await check(page, false);
    await expect(packet).toHaveCount(0);

    await page.getByTestId(X.replay(failing)).click();
    await expect(packet).toBeVisible();

    // Another setting: the old packet no longer describes the network, and is not offered.
    await page.getByTestId(X.chip(wrong)).click();
    await expect(page.getByTestId(X.replay(failing))).toHaveCount(0);
    await expect(packet).toHaveCount(0);
  });

  /**
   * TC-534 — the diagram is a picture of the network, not a second way to
   * change it: a device cannot be dragged somewhere else.
   */
  test('a device on the diagram cannot be dragged', async ({ page, demoPage }) => {
    await open(page, demoPage, HOST);
    const device = page.getByTestId(X.diagram).getByTestId(SEL.canvas.node).first();
    await expect(device).toBeVisible();
    const before = await device.boundingBox();
    if (!before) throw new Error('the device is not drawn');
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + 200, before.y + 160, { steps: 8 });
    await page.mouse.up();
    const after = await device.boundingBox();
    expect(after?.x).toBeCloseTo(before.x, 0);
    expect(after?.y).toBeCloseTo(before.y, 0);
  });

  /** TC-515 — a hint says what it costs before it is opened, and the pass is recorded as helped. */
  test('opening a hint makes the pass "solved with help"', async ({ page, demoPage }) => {
    await open(page, demoPage, HOST);
    await expect(page.getByTestId(X.hintCost)).toContainText('ヒントを使って解けた');
    await page.getByTestId(X.hint).click();
    await expect(page.getByTestId(X.hintText(1))).toContainText(
      exercise(HOST).hints[0]?.text.ja ?? '-',
    );
    await expect(page.getByTestId(X.hintText(2))).toHaveCount(0);

    await solveHost(page);
    await expect(page.getByTestId(X.resultDone)).toContainText('ヒントを使って解けた');

    await demoPage.goto('/exercises/level/1');
    await expect(page.getByTestId(X.recent)).toContainText('ヒントを使って解けた');
    // Not among the exercises solved without help.
    await expect(page.getByTestId(X.kind('l1-host-address'))).toHaveAttribute('data-solved', '0');
  });

  /** TC-516 — giving up shows one way to solve it, and the exercise no longer counts as solved. */
  test('giving up shows the reference, and a pass after it is not counted', async ({
    page,
    demoPage,
  }) => {
    const [answer] = exercise(HOST).reference;
    await open(page, demoPage, HOST);
    await page.getByTestId(X.giveUp).click();
    // Asked first: the answer is not shown by one stray press.
    await expect(page.getByTestId(X.reference)).toHaveCount(0);
    await page.getByTestId(X.giveUpYes).click();
    await expect(page.getByTestId(X.reference)).toContainText(
      answer?.kind === 'host-ip' ? (answer.ip ?? '-') : '-',
    );
    await expect(page.getByTestId(X.reference)).toContainText('数えません');

    await page.getByTestId(X.referenceApply).click();
    await check(page, true);
    await expect(page.getByTestId(X.resultDone)).toContainText('数えません');

    await demoPage.goto('/exercises/level/1');
    await expect(page.getByTestId(X.recent)).toContainText('答えを見た');
    await expect(page.getByTestId(X.kind('l1-host-address'))).toHaveAttribute('data-solved', '0');
  });

  /** TC-517 — a level 2 exercise of another kind, solved by typing into its form. */
  test('a switch exercise is solved through its form', async ({ page, demoPage }) => {
    const { checks, reference, allowed } = exercise(VLAN);
    await open(page, demoPage, VLAN);
    // One card per setting the exercise allows.
    for (const ref of allowed) await expect(page.getByTestId(settingTestId(ref))).toBeVisible();

    await check(page, false);
    const apart = checks.filter((goal) => goal.kind === 'must-not-reach');
    for (const goal of apart) {
      await expect(page.getByTestId(X.resultGoal(goal.id))).toHaveAttribute('data-passed', 'false');
    }

    await typeReference(page, reference);
    await check(page, true);
    for (const goal of checks) {
      await expect(page.getByTestId(X.goal(goal.id))).toHaveAttribute('data-mark', 'done');
    }
  });

  /** TC-518 — a design is run only after it is chosen and its outcome predicted, and a wrong one says why. */
  test('a choose-a-design exercise asks for a prediction, runs the choice and explains a wrong one', async ({
    page,
    demoPage,
  }) => {
    const options = exercise(DESIGN).options ?? [];
    const wrong = options.find((option) => option.id === 'duplicate');
    const right = options.find((option) => option.id === 'fits');
    if (!wrong?.explain || !right) throw new Error('the pinned design exercise changed');
    await open(page, demoPage, DESIGN);
    await expect(page.getByTestId(X.settings)).toHaveCount(0);

    // Nothing chosen: Check asks for a choice instead of grading.
    await page.getByTestId(X.check).click();
    await expect(page.getByTestId(X.designNeeded)).toBeVisible();
    await expect(page.getByTestId(X.result)).not.toHaveAttribute('data-passed');

    // Chosen but not predicted: still not run.
    await page.getByTestId(X.option(wrong.id)).click();
    await page.getByTestId(X.check).click();
    await expect(page.getByTestId(X.designNeeded)).toBeVisible();
    await expect(page.getByTestId(X.result)).not.toHaveAttribute('data-passed');

    await page.getByTestId(X.predict('reach')).click();
    await check(page, false);
    await expect(page.getByTestId(X.predictionOutcome)).toHaveAttribute('data-correct', 'false');
    await expect(page.getByTestId(X.optionExplain)).toHaveText(wrong.explain.ja);

    await page.getByTestId(X.option(right.id)).click();
    await page.getByTestId(X.predict('reach')).click();
    await check(page, true);
    await expect(page.getByTestId(X.predictionOutcome)).toHaveAttribute('data-correct', 'true');
  });

  /** TC-519 — the record is kept on the device: a reload does not lose it. */
  test('a reload keeps the recorded attempts', async ({ page, demoPage }) => {
    await open(page, demoPage, HOST);
    await solveHost(page);
    // A second exercise, opened and left: that is recorded too.
    await open(page, demoPage, 'l1-host-blank~0');

    await demoPage.goto('/exercises');
    const status = page.getByTestId(X.levelStatus(1));
    await expect(status).toContainText('まだ 2 問');
    const before = await status.innerText();

    await page.reload();
    await expect(page.getByTestId(X.levelStatus(1))).toHaveText(before);
    await demoPage.goto('/exercises/level/1');
    await expect(page.getByTestId(X.kind('l1-host-address'))).toHaveAttribute('data-solved', '1');
    await expect(page.getByTestId(X.recent)).toContainText('開いただけ');
  });
});

/** TC-520 — the same exercise in English: its text, its goals and its device names. */
test('an exercise is in one language at a time, and English names its devices in English', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await useLocale(page, 'en');
  const { title, brief, nodeLabels, hints } = exercise(HOST);
  await open(page, demoPage, HOST);

  await expect(page.getByTestId(X.brief)).toContainText(title.en);
  await expect(page.getByTestId(X.brief)).toContainText(brief.en);
  await expect(page.getByTestId(X.check)).toHaveText('Check');
  const names = await page.getByTestId(X.diagram).getByTestId(SEL.canvas.node).allInnerTexts();
  for (const label of Object.values(nodeLabels ?? {})) {
    expect(names.some((name) => name.replace(/\s+/g, ' ').includes(label.en))).toBe(true);
  }
  await expect(page.getByTestId(X.panel)).not.toContainText(/[ぁ-んァ-ヶ]/);

  await page.getByTestId(X.hint).click();
  await expect(page.getByTestId(X.hintText(1))).toContainText(hints[0]?.text.en ?? '-');
  await solveHost(page);
  await expect(page.getByTestId(X.resultSummary)).toContainText('It works');
  await expect(page.getByTestId(X.resultDone)).toContainText('solved with help');

  await demoPage.goto('/exercises');
  await expect(page.getByTestId(X.levelStatus(1))).toContainText('You have tried 1 exercise');
});

test.describe('placement and the record', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await useLocale(page, 'en');
  });

  /**
   * TC-522 — placement ends, whatever the first answer, within its eight
   * exercises, and says where to start.
   */
  for (const answer of ['no', 'yes'] as const) {
    test(`placement after "${answer}" ends with a result when every exercise is skipped`, async ({
      page,
      demoPage,
    }) => {
      await demoPage.goto('/exercises/placement');
      await expect(page.getByTestId(X.placementQuestion)).toBeVisible();
      await page.getByTestId(X.placementAnswer(answer)).click();

      const seen: string[] = [];
      for (let turn = 0; turn < 9; turn += 1) {
        await expect(
          page.getByTestId(X.placementResult).or(page.getByTestId(X.skip)),
        ).toBeVisible();
        if ((await page.getByTestId(X.placementResult).count()) > 0) break;
        seen.push((await page.getByTestId(X.panel).getAttribute('data-exercise-id')) ?? '');
        await page.getByTestId(X.skip).click();
      }

      await expect(page.getByTestId(X.placementResult)).toHaveAttribute('data-level', '0');
      expect(seen.length).toBeGreaterThan(0);
      expect(seen.length).toBeLessThanOrEqual(8);
      // No exercise is asked twice.
      expect(new Set(seen).size).toBe(seen.length);

      await page.getByTestId(X.placementStart).click();
      await expect(page.getByTestId(X.level(1))).toBeVisible();
      // The hub remembers the outcome.
      await demoPage.goto('/exercises');
      await expect(page.getByTestId(X.placementLink)).toHaveText('Check my level again');
    });
  }

  /** TC-522 — two level 1 exercises solved without help move the learner up, and the result says so. */
  test('placement moves up after both level 1 exercises are solved, and reports level 1', async ({
    page,
    demoPage,
  }) => {
    await demoPage.goto('/exercises/placement');
    await page.getByTestId(X.placementAnswer('no')).click();

    const asked: Exercise[] = [];
    for (let turn = 0; turn < 2; turn += 1) {
      await expect(page.getByTestId(X.check)).toBeVisible();
      const current = exercise(
        (await page.getByTestId(X.panel).getAttribute('data-exercise-id')) ?? '',
      );
      asked.push(current);
      expect(current.level).toBe(1);
      await typeReference(page, current.reference);
      await check(page, true);
      await page.getByTestId(X.next).click();
      await expect(page.getByTestId(X.panel)).not.toHaveAttribute('data-exercise-id', current.id);
    }
    // Two different kinds of task, so one trick does not place a learner.
    expect(new Set(asked.map((entry) => entry.templateId)).size).toBe(2);

    // Now level 2: left unsolved, placement stops and reports the level that was solved.
    for (let turn = 0; turn < 2; turn += 1) {
      const id = (await page.getByTestId(X.panel).getAttribute('data-exercise-id')) ?? '';
      expect(exercise(id).level).toBe(2);
      await page.getByTestId(X.skip).click();
      await expect(page.getByTestId(X.placementResult).or(page.getByTestId(X.panel))).toBeVisible();
      if ((await page.getByTestId(X.placementResult).count()) > 0) break;
      await expect(page.getByTestId(X.panel)).not.toHaveAttribute('data-exercise-id', id);
    }
    await expect(page.getByTestId(X.placementResult)).toHaveAttribute('data-level', '1');
    await expect(page.getByTestId(X.placementStart)).toHaveText('Go to level 2');
  });

  /**
   * TC-523 — the record can be taken away as a file, and the file is the record.
   * TC-532 — and that is the only way it leaves: the page reads its own files
   * and sends nothing anywhere.
   */
  test('the report downloads the record as JSON that parses', async ({
    page,
    demoPage,
    baseURL,
  }) => {
    const elsewhere: string[] = [];
    page.on('request', (request) => {
      const local = /^(blob|data):/.test(request.url()) || request.url().startsWith(baseURL ?? '-');
      if (!local || request.method() !== 'GET') {
        elsewhere.push(`${request.method()} ${request.url()}`);
      }
    });
    await open(page, demoPage, HOST);
    await solveHost(page);

    await demoPage.goto('/exercises/report');
    await expect(page.getByTestId(X.reportExport)).toContainText('1 attempts');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId(X.reportDownload).click(),
    ]);
    expect(download.suggestedFilename()).toBe('netlab-exercises.json');
    const file = await download.path();
    const record = JSON.parse(await readFile(file, 'utf8')) as {
      version: number;
      attempts: { exerciseId: string; outcome: string; checkPresses: number }[];
    };
    expect(record.version).toBe(1);
    expect(record.attempts).toHaveLength(1);
    expect(record.attempts[0]).toMatchObject({
      exerciseId: HOST,
      outcome: 'passed',
      checkPresses: 1,
      hintsUsed: 0,
      revealed: false,
    });
    expect(elsewhere, 'requests that are not a read of the app itself').toEqual([]);
  });

  /** TC-523 — copying says whether it worked; where the browser allows reading it back, it is the record. */
  test('the report copies the record, and says so', async ({ page, demoPage, browserName }) => {
    test.skip(
      browserName !== 'chromium',
      'only Chromium lets a test grant clipboard access and read the clipboard back',
    );
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page, demoPage, HOST);
    await solveHost(page);

    await demoPage.goto('/exercises/report');
    await page.getByTestId(X.reportCopy).click();
    await expect(page.getByTestId(X.reportCopyStatus)).toContainText('Copied');
    const copied = JSON.parse(await page.evaluate(() => navigator.clipboard.readText())) as {
      attempts: { exerciseId: string }[];
    };
    expect(copied.attempts.map((attempt) => attempt.exerciseId)).toEqual([HOST]);
  });

  /**
   * TC-537 — before and after studying, as one journey: four exercises, the
   * lessons for what was missed, four other exercises of the same kinds, and
   * the two counts side by side. The "before" set does not count for the level.
   */
  test('measuring before and after gives two different sets of the same kinds and compares them', async ({
    page,
    demoPage,
  }) => {
    test.setTimeout(120_000);
    await demoPage.goto('/exercises/level/1');
    await page.getByTestId(X.cycleStart).click();

    const sets: Record<'before' | 'after', string[]> = { before: [], after: [] };
    const workThrough = async (set: 'before' | 'after', solveFirst: boolean) => {
      for (let place = 1; place <= 4; place += 1) {
        await expect(page.getByTestId(X.cycleProgress)).toContainText(`${place} of 4`);
        const id = (await page.getByTestId(X.panel).getAttribute('data-exercise-id')) ?? '';
        sets[set].push(id);
        if (solveFirst && place === 1) {
          await typeReference(page, exercise(id).reference);
          await check(page, true);
          await page.getByTestId(X.next).click();
        } else {
          await page.getByTestId(X.skip).click();
        }
      }
    };

    await workThrough('before', true);
    // Back on the level page: what was solved, the lessons for the rest, and the way on.
    await expect(page.getByTestId(X.cycleBefore)).toContainText('you solved 1 of 4');
    await expect(page.getByTestId(X.cycle).getByTestId(X.lessons)).toBeVisible();
    await page.getByTestId(X.cycleAgain).click();

    await workThrough('after', false);
    await expect(page.getByTestId(X.cycleResult)).toContainText(
      'Before studying: 1 of 4 solved without help. After: 0 of 4.',
    );

    const kinds = (ids: string[]) => ids.map((id) => exercise(id).templateId);
    expect(new Set([...sets.before, ...sets.after]).size, 'eight different exercises').toBe(8);
    expect(kinds(sets.after)).toEqual(kinds(sets.before));

    // Only the four "after" exercises count towards the level.
    await demoPage.goto('/exercises');
    await expect(page.getByTestId(X.levelStatus(1))).toContainText('You have tried 4 exercises');
    await demoPage.goto('/exercises/report');
    await expect(page.getByTestId(X.reportExport)).toContainText('8 attempts');
  });

  /**
   * TC-535 — a browser that will not store the record: every page says so, the
   * exercise can still be done, and the record lasts until the page is closed.
   */
  test('without storage an exercise can still be solved, and the pages say the record is not kept', async ({
    page,
    demoPage,
  }) => {
    await page.addInitScript(() => {
      const refuse = (method: 'getItem' | 'setItem' | 'removeItem') => {
        const original = Storage.prototype[method] as (...args: string[]) => unknown;
        Storage.prototype[method] = function (this: Storage, ...args: string[]) {
          if ((args[0] ?? '').startsWith('netlab-exercises')) throw new Error('storage refused');
          return original.apply(this, args);
        } as never;
      };
      refuse('getItem');
      refuse('setItem');
      refuse('removeItem');
    });
    await open(page, demoPage, HOST);
    await expect(page.getByTestId(X.storageNotice)).toContainText('cannot save your record');
    await solveHost(page);

    for (const path of ['/exercises', '/exercises/level/1', '/exercises/report']) {
      await demoPage.goto(path);
      await expect(page.getByTestId(X.storageNotice)).toBeVisible();
    }
    // Kept for as long as the page is open…
    await demoPage.goto('/exercises');
    await expect(page.getByTestId(X.levelStatus(1))).toContainText('You have tried 1 exercise');
    // …and gone with it.
    await page.reload();
    await expect(page.getByTestId(X.levelStatus(1))).toContainText('You have tried 0 exercises');
  });

  /** TC-523 — clearing asks first, and then the record is gone. */
  test('the report clears the record only after a yes', async ({ page, demoPage }) => {
    await open(page, demoPage, HOST);
    await solveHost(page);
    await demoPage.goto('/exercises/report');
    await page.getByTestId(X.reportClear).click();
    await expect(page.getByTestId(X.reportExport)).toContainText('1 attempts');
    await page.getByTestId(X.reportClearYes).click();
    await expect(page.getByTestId(X.reportExport)).toContainText('0 attempts');
    await page.reload();
    await expect(page.getByTestId(X.reportExport)).toContainText('0 attempts');
  });
});

/**
 * TC-521 — a device's name stays inside its box on the diagram. The library
 * draws a name on one line, and 「教室のパソコン」 ran out of the box.
 */
for (const [id, locale] of [
  [HOST, 'ja'],
  [VLAN, 'ja'],
  [VLAN, 'en'],
  ['l2-static-missing~2', 'en'],
] as const) {
  test(`on ${id} in ${locale} every device name is inside its box`, async ({ page, demoPage }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await useLocale(page, locale);
    await open(page, demoPage, id);
    const nodes = page.getByTestId(X.diagram).getByTestId(SEL.canvas.node);
    await expect(nodes).toHaveCount(exercise(id).start.nodes.length);
    // The canvas keeps a device hidden until it has measured and placed it.
    await expect(nodes.last()).toBeVisible();
    const names = await nodes.evaluateAll((boxes) =>
      boxes.flatMap((box) => {
        const frame = box.getBoundingClientRect();
        const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
        const found: { name: string; inside: boolean }[] = [];
        for (let text = walker.nextNode(); text; text = walker.nextNode()) {
          // The address under a host is drawn below the box on purpose, and
          // the letter in the device's symbol is not its name.
          if (text.parentElement?.closest('[data-testid="topology-node-ip"]')) continue;
          const symbol = text.parentElement?.closest('svg');
          if (symbol && box.contains(symbol)) continue;
          const range = document.createRange();
          range.selectNodeContents(text);
          found.push({
            name: text.textContent ?? '',
            inside: [...range.getClientRects()].every(
              (rect) =>
                rect.left >= frame.left - 0.5 &&
                rect.right <= frame.right + 0.5 &&
                rect.top >= frame.top - 0.5 &&
                rect.bottom <= frame.bottom + 0.5,
            ),
          });
        }
        return found;
      }),
    );
    // Every device's name was measured: the list below is not empty by accident.
    expect(names.map((entry) => entry.name).sort()).toEqual(
      Object.values(exercise(id).nodeLabels ?? {})
        .map((label) => label[locale])
        .sort(),
    );
    expect(
      names.filter((entry) => !entry.inside).map((entry) => entry.name),
      'names drawn outside their device box',
    ).toEqual([]);
    // Two lines of name do not make one device taller than another.
    const heights = await nodes.evaluateAll((boxes) =>
      boxes.map((box) => Math.round((box as HTMLElement).offsetHeight)),
    );
    expect(new Set(heights).size, `device box heights ${heights.join(', ')}`).toBe(1);
  });
}
