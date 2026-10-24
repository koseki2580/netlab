import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/harness';
import { boxesOf, settled } from './fixtures/settle';
import { SEL } from './selectors';

/**
 * TC-841, TC-842 — a lesson's notes leave its devices clear and readable.
 *
 * A note floating over a lesson's canvas is marked as covering it, and the
 * canvas frames its devices clear of every marked note (TC-840). Floating
 * where the diagram is, the ARP and VLAN briefs then left the devices a
 * corner of the canvas, drawn 6–7px high. Each brief now sits where the
 * diagram is not, or beside it, so the devices keep their size.
 */
test.use({ viewport: { width: 1280, height: 720 } });

/** Lessons with a note over their canvas on a 1280×720 screen. */
const WITH_NOTES = [
  '/comprehensive/all-in-one',
  '/networking/arp',
  '/networking/http',
  '/networking/mtu-fragmentation',
  '/networking/multicast',
  '/networking/stp',
  '/networking/vlan',
  '/routing/ospf-convergence',
  '/simulation/session',
  '/simulation/step',
  '/simulation/tcp-handshake',
  '/simulation/trace-inspector',
] as const;

/** Lessons whose devices were drawn 9px or larger before any note was marked. */
const READABLE = [
  '/comprehensive/all-in-one',
  '/networking/arp',
  '/networking/http',
  '/networking/multicast',
  '/networking/vlan',
  '/simulation/tcp-handshake',
] as const;

const READABLE_PX = 9;

async function openSettled(
  page: Page,
  demoPage: { goto(path: string): Promise<void>; dismissBrief(): Promise<void> },
  path: string,
) {
  await demoPage.goto(path);
  await demoPage.dismissBrief();
  const devices = page.getByTestId(SEL.canvas.node);
  await expect(devices.first()).toBeVisible();
  await settled(() => boxesOf(devices), { what: 'the canvas fit' });
}

/** Devices whose box meets a note marked as covering the canvas. */
async function devicesUnderNotes(page: Page): Promise<string[]> {
  return page.getByTestId(SEL.canvas.node).evaluateAll((devices) => {
    const notes = [...document.querySelectorAll('[data-canvas-overlay]')]
      .filter((note) => !note.closest('[data-testid="netlab-canvas"]'))
      .map((note) => note.getBoundingClientRect());
    return devices
      .filter((device) => {
        const a = device.getBoundingClientRect();
        return notes.some(
          (o) => a.left < o.right && o.left < a.right && a.top < o.bottom && o.top < a.bottom,
        );
      })
      .map((device) => (device.textContent ?? '').trim().slice(0, 16));
  });
}

/** The smallest text drawn on any device, in CSS pixels on screen. */
async function smallestDeviceText(page: Page): Promise<number> {
  const sizes = await page.getByTestId(SEL.canvas.node).evaluateAll((devices) =>
    devices.flatMap((device) =>
      [...device.querySelectorAll<HTMLElement>('*')]
        .filter((el) => el.children.length === 0 && (el.textContent ?? '').trim().length > 2)
        .map((el) => {
          const scale = el.offsetHeight ? el.getBoundingClientRect().height / el.offsetHeight : 1;
          return parseFloat(getComputedStyle(el).fontSize) * scale;
        }),
    ),
  );
  return Math.min(...sizes);
}

for (const locale of ['en', 'ja'] as const) {
  test.describe(`at 1280×720 in ${locale}`, () => {
    test.use({ appLocale: locale });

    for (const path of WITH_NOTES) {
      test(`TC-841: no device of ${path} lies under a note`, async ({ page, demoPage }) => {
        await openSettled(page, demoPage, path);
        expect(await devicesUnderNotes(page)).toEqual([]);
      });
    }

    for (const path of READABLE) {
      test(`TC-842: the devices of ${path} are drawn ${READABLE_PX}px or larger`, async ({
        page,
        demoPage,
      }) => {
        await openSettled(page, demoPage, path);
        expect(await smallestDeviceText(page)).toBeGreaterThanOrEqual(READABLE_PX);
      });
    }
  });
}
