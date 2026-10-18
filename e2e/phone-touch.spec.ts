import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures/harness';

/**
 * TC-721..TC-727 — a phone held in the hand (390×844, touch).
 *
 * A nurse trying the lessons on her phone found device names drawn 4–7px
 * high, canvases squeezed to a sliver beside a fixed column, targets smaller
 * than a fingertip, and a help card that listed keyboard shortcuts.
 */
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

/** The smallest text drawn on any device of the diagram, in CSS pixels on screen. */
async function smallestDeviceText(page: Page): Promise<number> {
  const nodes = page.getByTestId('topology-node');
  await expect(nodes.first()).toBeVisible();
  // Let the canvas settle on its final fit.
  await page.waitForTimeout(600);
  const sizes = await nodes.evaluateAll((elements) =>
    elements.flatMap((node) =>
      [...node.querySelectorAll<HTMLElement>('*')]
        .filter((el) => el.children.length === 0 && (el.textContent ?? '').trim().length > 2)
        .map((el) => {
          const shown = el.getBoundingClientRect().height;
          const scale = el.offsetHeight ? shown / el.offsetHeight : 1;
          return parseFloat(getComputedStyle(el).fontSize) * scale;
        }),
    ),
  );
  return Math.min(...sizes);
}

/** Every visible control under `root` smaller than 44×44, by its test id or name. */
async function smallTargets(root: Locator): Promise<string[]> {
  return root.evaluate((element) =>
    [
      ...element.querySelectorAll<HTMLElement>(
        'button, a[href], summary, select, [role="tab"], input:not([type="checkbox"]):not([type="radio"]):not([type="range"])',
      ),
    ]
      .filter((el) => {
        // The devices drawn on the diagram are sized by its zoom, not here.
        if (el.closest('[data-testid="topology-node"]')) return false;
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (box.width === 0 || box.height === 0 || box.bottom <= 0) return false;
        if (style.visibility === 'hidden' || style.display === 'none') return false;
        return box.width < 43.5 || box.height < 43.5;
      })
      .map((el) => {
        const box = el.getBoundingClientRect();
        const name =
          el.dataset['testid'] ??
          el.getAttribute('aria-label') ??
          (el.textContent ?? el.tagName).trim().slice(0, 20);
        return `${name} ${Math.round(box.width)}×${Math.round(box.height)}`;
      }),
  );
}

const READABLE_PX = 7.5;

const LESSONS = [
  '/basic/three-tier',
  '/basic/star',
  '/routing/client-server',
  '/routing/ospf-convergence',
  '/routing/dynamic',
  '/networking/vlan',
  '/networking/stp',
  '/networking/multicast',
  '/networking/ecmp',
  '/networking/link-qos',
  '/networking/tunneling/mpls-l3vpn',
  '/networking/tunneling/vxlan-evpn',
  '/networking/ha',
  '/services/dhcp-dns',
  '/simulation/step',
  '/simulation/trace-inspector',
  '/simulation/failure',
  '/simulation/nat',
  '/simulation/acl',
] as const;

for (const path of LESSONS) {
  test(`TC-721: device names and addresses on ${path} are drawn at a readable size`, async ({
    page,
    demoPage,
  }) => {
    await demoPage.goto(path);
    await demoPage.dismissBrief();
    expect(await smallestDeviceText(page)).toBeGreaterThanOrEqual(READABLE_PX);
  });
}

test('TC-722: a lesson laid out beside a fixed column gives its canvas the phone’s width', async ({
  page,
  demoPage,
}) => {
  for (const path of ['/networking/ha', '/networking/ecmp', '/networking/observability']) {
    await demoPage.goto(path);
    const canvas = await page.getByTestId('netlab-canvas').boundingBox();
    expect(canvas?.width, path).toBeGreaterThanOrEqual(370);
    expect(canvas?.height, path).toBeGreaterThanOrEqual(240);
  }
});

test('TC-723: the client–server lesson keeps its devices open and the page still as it steps', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/routing/client-server');
  const nodes = page.getByTestId('topology-node');
  await expect(nodes).toHaveCount(5);
  for (const box of await nodes.evaluateAll((all) =>
    all.map((node) => node.getBoundingClientRect().width),
  )) {
    expect(box).toBeGreaterThanOrEqual(44);
  }
  await page.getByTestId('demo-primary-action').tap();
  const canvas = page.getByTestId('netlab-canvas');
  const before = (await canvas.boundingBox())?.y;
  await page.getByTestId('sim-step').tap();
  await page.getByTestId('sim-step').tap();
  expect((await canvas.boundingBox())?.y).toBe(before);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
});

test('TC-724: the ARP diagram keeps its size while a packet is looked at', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/arp');
  const before = await smallestDeviceText(page);
  await page.getByTestId('demo-primary-action').tap();
  await page.getByTestId('trace-hop').nth(1).tap();
  await page.getByTestId('lesson-step').tap();
  expect(await smallestDeviceText(page)).toBeGreaterThanOrEqual(before - 0.5);
});

test('TC-725: the gallery gives its lessons the whole width of a phone', async ({ page }) => {
  await page.goto('/#/');
  const card = page.getByTestId('gallery-card').first();
  await expect(card).toBeVisible();
  expect((await card.boundingBox())?.width).toBeGreaterThanOrEqual(300);
  const sidebar = await page.getByTestId('gallery-sidebar').boundingBox();
  expect((sidebar?.x ?? 0) + (sidebar?.width ?? 0)).toBeLessThanOrEqual(0);
});

test('TC-726: every control a finger presses is at least 44px each way', async ({
  page,
  demoPage,
}) => {
  for (const path of ['/routing/client-server', '/networking/arp', '/routing/ospf-convergence']) {
    await demoPage.goto(path);
    await demoPage.dismissBrief();
    const start = page.getByTestId('demo-primary-action').first();
    if ((await start.isVisible()) && (await start.isEnabled())) await start.tap();
    expect(await smallTargets(page.getByTestId('netlab-root')), path).toEqual([]);
  }
  await page.goto('/#/');
  await expect(page.getByTestId('gallery-card').first()).toBeVisible();
  expect(await smallTargets(page.getByTestId('gallery-root')), 'gallery').toEqual([]);
});

test('TC-727: help on a touch screen says what to tap', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/arp');
  await page.getByTestId('nav-rail-help').tap();
  const help = page.getByTestId('touch-help');
  await expect(help).toBeVisible();
  await expect(help).toContainText('Tap a device');
  await expect(page.getByTestId('keyboard-help-overlay')).toHaveCount(0);
  await page.getByTestId('touch-help-close').tap();
  await expect(help).toHaveCount(0);

  // What it says works: a tapped device opens, and its ✕ is a finger's size.
  await page.getByTestId('topology-node').first().tap();
  const close = page.getByTestId('node-detail-close');
  await expect(close).toBeVisible();
  const box = await close.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(43.5);
  expect(box?.height).toBeGreaterThanOrEqual(43.5);
  await close.tap();
  await expect(close).toHaveCount(0);
});
