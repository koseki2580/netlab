import { CATEGORIES, expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * Demos that deliberately have no topology canvas.
 *
 * The protocol walkthroughs render byte-level views, and the three learning
 * drills below are exercises — a subnetting question, a multiple-choice deck, a
 * routing-table decision — none of which has a network to draw. Asserting a
 * canvas on them tests the harness, not the product.
 */
const NON_CANVAS_DEMO_PATHS = new Set([
  '/networking/https',
  '/networking/http2',
  '/networking/http3',
  '/learning/subnetting',
  '/learning/protocols',
  '/learning/routing-decision',
]);

for (const category of CATEGORIES) {
  for (const demo of category.demos) {
    test(`${category.id}/${demo.title} mounts`, async ({ demoPage, page }) => {
      // A lesson that draws its devices but complains while doing it is a
      // lesson with something wrong in it. React Flow refused to create any
      // edge whose endpoints named a router interface and said so only here,
      // so the OSPF convergence demo showed six routers and no cables for as
      // long as nobody read the console.
      const complaints: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
          complaints.push(`${message.type()}: ${message.text()}`);
        }
      });
      page.on('pageerror', (error) => complaints.push(`pageerror: ${error.message}`));

      await demoPage.goto(demo.path);
      await expect(page.locator('[data-testid="netlab-root"]')).toBeVisible();
      if (!NON_CANVAS_DEMO_PATHS.has(demo.path)) {
        // Two canvases exist: the simulator's and the editor's, and the editor
        // draws on a different engine. Either one means this demo mounted a
        // diagram.
        await expect(
          page.getByTestId(SEL.canvas.root).or(page.getByTestId(SEL.editor.canvas)).first(),
        ).toBeAttached();
        // Devices without cables is what the defect above looked like: almost
        // right, and wrong in the one way the lesson is about. A large topology
        // may open with its areas collapsed instead — that is the level of
        // detail feature showing the shape before the detail, and it is still a
        // network on screen.
        const drawn = page
          .getByTestId(SEL.canvas.node)
          .or(page.getByTestId(SEL.canvas.areaCluster));
        await expect(drawn.first()).toBeVisible();
        await expect(page.locator('.netlab-edge').first()).toBeAttached();

        // And what is drawn is on screen when the lesson opens. Framing it is
        // the canvas's job; getting the padding wrong left the last device of a
        // wide topology clipped by the edge, which reads as a diagram that
        // simply stops.
        const canvas = page.getByTestId(SEL.canvas.root).first();
        if ((await canvas.count()) > 0) {
          const frame = await canvas.boundingBox();
          const inside = canvas.getByTestId(SEL.canvas.node);
          const count = await inside.count();
          for (let index = 0; index < count && frame; index += 1) {
            const device = await inside.nth(index).boundingBox();
            if (!device) continue;
            expect(
              device.x >= frame.x - 1 &&
                device.y >= frame.y - 1 &&
                device.x + device.width <= frame.x + frame.width + 1 &&
                device.y + device.height <= frame.y + frame.height + 1,
              `device ${index} is framed by the canvas`,
            ).toBe(true);
          }
        }
      }

      expect(complaints, 'the demo mounts without complaining').toEqual([]);
    });
  }
}
