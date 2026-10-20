import { expect, type Locator, type Page } from '@playwright/test';
import { SEL } from '../selectors';

/** Which controls drive a lesson's stepping, and what shows where it is. */
export interface LessonControls {
  /** The button that moves the lesson on by one step. */
  next?: Locator;
  /** What a test reads as "where the lesson is now". */
  position?: Locator;
  /**
   * An element whose text changes on every step. A press has been rendered
   * once this text differs from what it was before the press, or once the
   * next button is disabled.
   */
  progress?: Locator;
}

/**
 * POM for stepping through a lesson.
 *
 * A step press disables the next button one render after the click returns,
 * so a loop that checks `isEnabled()` straight after a click can see a stale
 * "enabled" and click a button that is about to go away. Every method here
 * waits for the press to be rendered before it returns, so the next check
 * reads the state the press produced and no click ever needs a retry.
 */
export class LessonPage {
  readonly next: Locator;
  readonly position: Locator;
  private readonly progress: Locator;

  constructor(
    private readonly page: Page,
    controls: LessonControls = {},
  ) {
    this.next = controls.next ?? page.getByTestId(SEL.demo.primaryAction);
    this.position = controls.position ?? page.getByTestId(SEL.steps.readout);
    this.progress = controls.progress ?? page.getByTestId(SEL.steps.controls);
  }

  /** The same lesson, stepped with other controls. */
  using(controls: LessonControls): LessonPage {
    return new LessonPage(this.page, {
      next: this.next,
      position: this.position,
      progress: this.progress,
      ...controls,
    });
  }

  /**
   * The same lesson, stepped with the transport bar above the canvas: its
   * step-forward button, and the "Step N of M" status beside it.
   */
  transport(): LessonPage {
    const status = this.page.getByTestId(SEL.transport.status);
    return this.using({
      next: this.page.getByTestId(SEL.transport.step),
      position: status,
      progress: status,
    });
  }

  /** Open a lesson by its route, e.g. `/routing/client-server`. */
  async open(path: string): Promise<void> {
    await this.page.goto(`/#${path}`);
    await this.page.getByTestId(SEL.app.root).waitFor();
  }

  /** The text that says where the lesson is now. */
  async readPosition(): Promise<string> {
    return (await this.position.textContent()) ?? '';
  }

  /** Whether the next button can be pressed now. */
  async canStep(): Promise<boolean> {
    return this.next.isEnabled();
  }

  /** Press next once, and return when the press has been rendered. */
  async stepOnce(): Promise<void> {
    await expect(this.next, 'the next button is ready').toBeEnabled();
    const before = await this.progressText();
    await this.next.click();
    await expect
      .poll(
        async () => (await this.next.isDisabled()) || (await this.progressText()) !== before,
        // A press renders within a frame or two, so poll at about that pace.
        { message: 'the step press was rendered', intervals: [16, 50, 100] },
      )
      .toBe(true);
  }

  /**
   * Press next until `done` holds or the lesson has nothing left to show.
   *
   * `done` is checked before every press, so a lesson already there is not
   * stepped. The first press waits for the next button to become enabled (a
   * lesson that has just loaded its trace may not be ready yet); after that, a
   * disabled button means the lesson has played through. `onStep` runs after
   * each rendered press. Fails after `max` presses, which would mean the
   * lesson never ends.
   */
  async stepUntil(
    done: () => Promise<boolean> = async () => false,
    { max = 200, onStep }: { max?: number; onStep?: () => Promise<void> } = {},
  ): Promise<void> {
    for (let press = 0; press < max; press += 1) {
      if (await done()) return;
      if (press > 0 && !(await this.canStep())) return;
      await this.stepOnce();
      await onStep?.();
    }
    throw new Error(`the lesson was still stepping after ${max} presses`);
  }

  /** Press next until it is disabled: the lesson has played through. */
  async stepToEnd(options: { max?: number; onStep?: () => Promise<void> } = {}): Promise<void> {
    await this.stepUntil(undefined, options);
  }

  /** The progress text, or '' when it is not on the page; never waits. */
  private async progressText(): Promise<string> {
    return this.progress.evaluateAll((found) => found[0]?.textContent ?? '');
  }
}
