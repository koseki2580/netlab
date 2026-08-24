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
        // right, and wrong in the one way the lesson is about.
        await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();
        await expect(page.locator('.netlab-edge').first()).toBeAttached();
      }

      expect(complaints, 'the demo mounts without complaining').toEqual([]);
    });
  }
}
