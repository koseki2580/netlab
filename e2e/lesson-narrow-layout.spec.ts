import { expect, test } from './fixtures/harness';

/**
 * TC-302 — every lesson with a side panel can be read on a phone.
 *
 * At 390px the row of canvas and panel never stacked: the panel took the whole
 * width and the canvas beside it was squeezed to nothing (30px in the UDP
 * lesson), so no device could be seen.
 */
const WIDTH = 390;
const HEIGHT = 844;

interface NarrowLesson {
  path: string;
  /** A tab to open first, for a lesson that keeps its canvases behind tabs. */
  tab?: string;
  /** Width the lesson's own frame takes from the canvas, both sides together. */
  frame?: number;
}

const LESSONS: NarrowLesson[] = [
  { path: '/basic/minimal' },
  { path: '/basic/three-tier' },
  { path: '/basic/star' },
  { path: '/routing/client-server' },
  // This lesson's shell draws a frame around it, 15px in from each side.
  { path: '/routing/ospf-convergence', frame: 30 },
  { path: '/networking/arp' },
  { path: '/networking/vlan' },
  { path: '/networking/stp' },
  { path: '/networking/mtu-fragmentation' },
  { path: '/networking/udp' },
  { path: '/networking/http' },
  { path: '/networking/multicast' },
  { path: '/services/dhcp-dns' },
  { path: '/simulation/step' },
  { path: '/simulation/failure' },
  { path: '/simulation/trace-inspector' },
  { path: '/simulation/nat' },
  { path: '/simulation/acl' },
  { path: '/simulation/interface-aware' },
  { path: '/simulation/session' },
  { path: '/simulation/tcp-handshake' },
  { path: '/simulation/enterprise' },
  { path: '/comprehensive/all-in-one', tab: 'all-in-one-tab-simulation' },
  { path: '/comprehensive/all-in-one', tab: 'all-in-one-tab-failure' },
  { path: '/comprehensive/all-in-one', tab: 'all-in-one-tab-trace' },
];

for (const { path, tab, frame = 0 } of LESSONS) {
  test(`at phone width ${path}${tab ? ` (${tab})` : ''} stacks a usable canvas above a panel that fits the screen`, async ({
    page,
    demoPage,
  }) => {
    await page.setViewportSize({ width: WIDTH, height: HEIGHT });
    await demoPage.goto(path);
    if (tab) await page.getByTestId(tab).click();

    const canvas = page.getByTestId('netlab-canvas');
    const panel = page.getByTestId('lesson-panel');
    await expect(canvas).toBeVisible();
    await expect(panel).toBeVisible();

    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(canvasBox!.width).toBeGreaterThanOrEqual(WIDTH - frame - 1);
    expect(canvasBox!.height).toBeGreaterThanOrEqual(240);

    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    expect(panelBox!.x).toBeGreaterThanOrEqual(0);
    expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(WIDTH);
    // Stacked: the panel starts below the canvas, not beside it.
    expect(panelBox!.y).toBeGreaterThanOrEqual(canvasBox!.y + canvasBox!.height - 1);

    const scroll = await page.evaluate(() => {
      const el = document.scrollingElement ?? document.documentElement;
      return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
    });
    expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth);
  });
}
