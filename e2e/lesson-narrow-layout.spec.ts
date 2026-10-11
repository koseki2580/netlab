import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

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

/**
 * The second round on a phone. A nurse studying on a 390×844 touch screen
 * pressed "next step" in the ARP lesson and the diagram shrank to a thumbnail
 * (13×14px devices) while every card below it grew to 550px wide; and in four
 * lessons the button she was pressing was a screen or more away from the
 * diagram it drives.
 */
test.describe('on a phone, with touch', () => {
  test.use({ viewport: { width: WIDTH, height: HEIGHT }, hasTouch: true });

  const japanese = async (page: Page) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('netlab-locale', 'ja');
      } catch {
        /* English is as measurable */
      }
    });
  };

  /** TC-563 — stepping the ARP lesson leaves the diagram its size and the panel its width. */
  test('the ARP diagram keeps its size and nothing grows past the screen while stepping', async ({
    page,
    demoPage,
  }) => {
    await japanese(page);
    await demoPage.goto('/networking/arp');
    await page.getByTestId(SEL.demo.primaryAction).first().tap();
    const step = page.getByTestId('lesson-step');
    for (let press = 0; press < 5; press += 1) {
      await step.tap();
      // After every press, not only the last: the cards were wide at one step
      // of the ten and back to their width at the next.
      const past = await page.getByTestId('lesson-panel').evaluate((panel, width) => {
        // What is cut off or pushes the page wide. A wide table that scrolls
        // inside a card which itself fits is neither.
        const scrollsInside = (element: Element): boolean => {
          for (let box = element.parentElement; box && box !== panel; box = box.parentElement) {
            const clips = getComputedStyle(box).overflowX;
            if (
              (clips === 'auto' || clips === 'scroll') &&
              box.getBoundingClientRect().right <= width + 1
            ) {
              return true;
            }
          }
          return false;
        };
        const all = [panel, ...Array.from(panel.querySelectorAll('*'))];
        return all.filter(
          (element) => element.getBoundingClientRect().right > width + 1 && !scrollsInside(element),
        ).length;
      }, WIDTH);
      expect(past, `elements past the right edge after press ${press + 1}`).toBe(0);
    }
    await expect(page.getByTestId('lesson-step-status')).toContainText('5 番目');

    const devices = page.getByTestId('topology-node');
    await expect(devices).toHaveCount(3);
    for (const box of await devices.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().toJSON() as DOMRect),
    )) {
      expect(box.width).toBeGreaterThanOrEqual(36);
      expect(box.height).toBeGreaterThanOrEqual(36);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(WIDTH);
    }
  });

  interface PinnedLesson {
    path: string;
    /** What the learner presses, in order. */
    presses: string[];
    /** Every action that has to be beside the diagram afterwards. */
    actions: string[];
  }

  const PINNED: PinnedLesson[] = [
    {
      path: '/networking/arp',
      presses: ['demo-primary-action', 'lesson-step'],
      actions: ['demo-primary-action', 'lesson-step'],
    },
    {
      path: '/simulation/tcp-handshake',
      presses: ['tcp-connect', 'tcp-jump-1'],
      actions: ['tcp-connect', 'tcp-jump-1', 'tcp-jump-2', 'tcp-jump-3', 'lesson-step'],
    },
    {
      path: '/services/dhcp-dns',
      presses: ['dhcp-run', 'dns-run'],
      actions: ['dhcp-run', 'dns-run', 'lesson-step'],
    },
    {
      path: '/simulation/nat',
      presses: ['nat-send-client-a'],
      actions: ['nat-send-client-a', 'nat-send-client-b', 'nat-send-inbound'],
    },
  ];

  for (const { path, presses, actions } of PINNED) {
    /** TC-564 — the diagram, what is pressed and what it reports are on one screen. */
    test(`${path} keeps the diagram, its actions and the status on screen together`, async ({
      page,
      demoPage,
    }) => {
      await japanese(page);
      await demoPage.goto(path);
      for (const id of presses) await page.getByTestId(id).first().tap();

      const canvas = page.getByTestId('netlab-canvas');
      const status = page.getByTestId('lesson-step-status');
      await expect(status).not.toBeEmpty();
      await expect(canvas).toBeInViewport({ ratio: 1 });
      await expect(status).toBeInViewport({ ratio: 1 });

      const bar = await page.getByTestId('demo-shell-bottom-bar').boundingBox();
      const canvasBox = await canvas.boundingBox();
      expect(bar).not.toBeNull();
      expect(canvasBox).not.toBeNull();
      expect(canvasBox!.height).toBeGreaterThanOrEqual(240);
      for (const id of [...actions, 'lesson-step-status']) {
        const box = await page.getByTestId(id).first().boundingBox();
        expect(box, id).not.toBeNull();
        // Below the diagram, above the bar: beside neither, under neither.
        expect(box!.y, id).toBeGreaterThanOrEqual(canvasBox!.y + canvasBox!.height - 1);
        expect(box!.y + box!.height, id).toBeLessThanOrEqual(bar!.y + 1);
        if (id !== 'lesson-step-status') expect(box!.height, id).toBeGreaterThanOrEqual(44);
      }

      // Nothing that can be pressed, anywhere in the lesson, lies under the bar.
      const under = await page.getByTestId('netlab-root').evaluate((root, top) => {
        const pressable = Array.from(root.querySelectorAll('main button, main a, main input'));
        return pressable.filter((element) => {
          const box = element.getBoundingClientRect();
          if (box.width === 0 || box.top >= window.innerHeight) return false;
          const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
          return box.bottom > top + 1 && hit !== null && element.contains(hit);
        }).length;
      }, bar!.y);
      expect(under).toBe(0);
    });
  }

  /** TC-566 — the client–server lesson opens with its five devices drawn, not folded away. */
  test('the client–server lesson shows its five devices and says "copy" in Japanese', async ({
    page,
    demoPage,
  }) => {
    await japanese(page);
    await demoPage.goto('/routing/client-server');
    await expect(page.getByTestId('topology-node')).toHaveCount(5);
    await expect(page.getByTestId('area-cluster')).toHaveCount(0);
    for (const box of await page
      .getByTestId('topology-node')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().toJSON() as DOMRect),
      )) {
      expect(box.width).toBeGreaterThanOrEqual(40);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(WIDTH);
    }
    await expect(page.getByTestId('client-server-copy-link')).toHaveAttribute(
      'aria-label',
      'このネットワークへのリンクをコピー',
    );
  });

  /** TC-567 — a tap on a device opens what the lesson says a press opens. */
  test('a tap on a device of the DHCP lesson opens its settings', async ({ page, demoPage }) => {
    await japanese(page);
    await demoPage.goto('/services/dhcp-dns');
    await page.getByTestId('dhcp-run').tap();
    await expect(page.getByTestId('dhcp-result')).toBeVisible();
    await page.getByTestId('topology-node').first().tap();
    await expect(page.getByTestId('dp-host-setting-ip')).toContainText('192.168.1.');
  });

  /** TC-571 — the small shared controls are a thumb's size. */
  test("the zoom buttons, the way back and a lesson's fields are at least 44px", async ({
    page,
    demoPage,
  }) => {
    await demoPage.goto('/networking/udp');
    for (const id of ['maxgraph-zoom-in', 'maxgraph-zoom-out', 'maxgraph-fit', 'demo-shell-back']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box?.width ?? 0, id).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0, id).toBeGreaterThanOrEqual(44);
    }
    for (const id of ['udp-port', 'udp-payload']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box?.height ?? 0, id).toBeGreaterThanOrEqual(44);
    }
  });

  /** TC-572 — the devices are drawn large enough for their addresses to be read. */
  for (const [path, count, minimum] of [
    ['/networking/arp', 3, 70],
    ['/simulation/tcp-handshake', 3, 70],
    ['/simulation/nat', 6, 50],
  ] as const) {
    test(`${path} arranges its devices to fill a phone's width`, async ({ page, demoPage }) => {
      await demoPage.goto(path);
      const devices = page.getByTestId('topology-node');
      await expect(devices).toHaveCount(count);
      for (const box of await devices.evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().toJSON() as DOMRect),
      )) {
        expect(box.width).toBeGreaterThanOrEqual(minimum);
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(WIDTH);
      }
    });
  }
});
