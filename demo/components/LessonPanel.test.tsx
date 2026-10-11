/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  LessonCanvas,
  LessonNote,
  LessonPanel,
  LessonPinned,
  LessonSplit,
  usePhoneTopology,
} from './LessonPanel';

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const WIDE = 1440;
const NARROW = 390;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) {
    act(() => {
      root?.unmount();
    });
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  window.innerWidth = 1024;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

function renderLesson(width: number) {
  window.innerWidth = width;
  act(() => {
    root?.render(
      <LessonSplit>
        <LessonCanvas canvas={<div data-testid="canvas">canvas</div>}>
          <LessonNote data-testid="brief" style={{ position: 'absolute', top: 12, maxWidth: 360 }}>
            brief
          </LessonNote>
          <LessonNote data-testid="footnote" style={{ position: 'absolute', bottom: 16 }}>
            footnote
          </LessonNote>
        </LessonCanvas>
        <LessonPanel defaultWidth={460} maxWidth={760} style={{ background: 'red' }}>
          <button type="button">send</button>
        </LessonPanel>
      </LessonSplit>,
    );
  });
}

function byTestId(id: string): HTMLElement | null {
  return container?.querySelector<HTMLElement>(`[data-testid="${id}"]`) ?? null;
}

function dragHandle(): HTMLElement | null {
  return (
    Array.from(container?.querySelectorAll<HTMLElement>('div') ?? []).find(
      (element) => element.style.cursor === 'col-resize',
    ) ?? null
  );
}

// TC-302
describe('a lesson laid out with LessonSplit', () => {
  it('on a wide screen puts the canvas beside a sidebar that can be dragged', () => {
    renderLesson(WIDE);

    const split = container?.firstElementChild as HTMLElement;
    expect(split.style.flexDirection).toBe('');

    const handle = dragHandle();
    expect(handle).not.toBeNull();
    const sidebar = handle?.parentElement as HTMLElement;
    expect(sidebar.style.width).toBe('460px');
    expect(sidebar.style.background).toBe('red');
    expect(sidebar.textContent).toBe('send');
    expect(byTestId('lesson-panel')).toBeNull();

    // The notes float over the canvas, in the canvas's own box.
    const brief = byTestId('brief') as HTMLElement;
    expect(brief.style.position).toBe('absolute');
    expect(brief.style.maxWidth).toBe('360px');
    expect(brief.parentElement).toBe(byTestId('canvas')?.parentElement);
  });

  it('on a narrow screen stacks a fixed-height canvas above a full-width panel with no drag handle', () => {
    renderLesson(NARROW);

    const split = container?.firstElementChild as HTMLElement;
    expect(split.style.flexDirection).toBe('column');
    expect(split.style.overflowY).toBe('auto');

    expect(dragHandle()).toBeNull();
    const panel = byTestId('lesson-panel') as HTMLElement;
    expect(panel.style.width).toBe('100%');
    expect(panel.style.background).toBe('red');
    expect(panel.textContent).toBe('send');
    // The canvas comes before the panel in the column.
    expect(split.lastElementChild).toBe(panel);

    const canvasBox = byTestId('canvas')?.parentElement as HTMLElement;
    expect(canvasBox.style.height).toBe('280px');
  });

  it('on a narrow screen takes the notes off the canvas and into the column', () => {
    renderLesson(NARROW);

    const canvasBox = byTestId('canvas')?.parentElement as HTMLElement;
    const brief = byTestId('brief') as HTMLElement;
    const footnote = byTestId('footnote') as HTMLElement;
    for (const note of [brief, footnote]) {
      expect(note.style.position).toBe('');
      expect(note.style.maxWidth).toBe('');
      expect(canvasBox.contains(note)).toBe(false);
    }
    // A note pinned to the canvas's bottom is read after it, the rest before.
    expect(brief.style.order).toBe('');
    expect(footnote.style.order).toBe('1');
  });
});

function renderPinned(width: number) {
  window.innerWidth = width;
  act(() => {
    root?.render(
      <LessonSplit pinned>
        <LessonCanvas canvas={<div data-testid="canvas">canvas</div>}>
          <LessonNote data-testid="brief" style={{ position: 'absolute', top: 12 }}>
            brief
            <LessonPinned order={1}>
              <button type="button" data-testid="second">
                two
              </button>
            </LessonPinned>
          </LessonNote>
        </LessonCanvas>
        <LessonPanel defaultWidth={460} maxWidth={760}>
          <div data-testid="card">
            <LessonPinned>
              <button type="button" data-testid="send">
                send
              </button>
            </LessonPinned>
            hint
          </div>
        </LessonPanel>
      </LessonSplit>,
    );
  });
}

// TC-564
describe('a pinned lesson', () => {
  it('on a narrow screen keeps the canvas fixed, its actions under it, and scrolls only the panel', () => {
    renderPinned(NARROW);

    const split = container?.firstElementChild as HTMLElement;
    expect(split.style.overflow).toBe('hidden');
    expect(split.style.flexDirection).toBe('column');

    const diagram = byTestId('lesson-diagram') as HTMLElement;
    expect(diagram.contains(byTestId('canvas'))).toBe(true);
    expect(diagram.style.minHeight).toBe('240px');

    // The actions are in the bar directly under the diagram, in the order
    // asked for, whichever part of the lesson they were written in.
    const actions = byTestId('lesson-actions') as HTMLElement;
    expect(diagram.nextElementSibling).toBe(actions);
    const send = byTestId('send') as HTMLElement;
    const second = byTestId('second') as HTMLElement;
    expect(actions.contains(send)).toBe(true);
    expect(actions.contains(second)).toBe(true);
    expect(Number(send.parentElement?.style.order)).toBeLessThan(
      Number(second.parentElement?.style.order),
    );

    // The panel is what scrolls, and the notes are read at its top.
    const panel = byTestId('lesson-panel') as HTMLElement;
    expect(panel.style.overflowY).toBe('auto');
    expect(panel.contains(byTestId('brief'))).toBe(true);
    expect(byTestId('card')?.textContent).toBe('hint');
    expect(
      byTestId('brief')!.compareDocumentPosition(byTestId('card')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('on a wide screen leaves every action where it was written', () => {
    renderPinned(WIDE);

    expect(byTestId('lesson-actions')).toBeNull();
    expect(byTestId('lesson-diagram')).toBeNull();
    expect(byTestId('send')?.parentElement).toBe(byTestId('card'));
    expect(byTestId('second')?.parentElement).toBe(byTestId('brief'));
  });
});

// TC-572
describe('a lesson network arranged for the screen', () => {
  const topology = {
    nodes: [
      { id: 'a', position: { x: 80, y: 180 } },
      { id: 'b', position: { x: 640, y: 180 } },
    ],
  };
  const places = { b: { x: 125, y: 0 } };

  function Probe() {
    const arranged = usePhoneTopology(topology, places);
    return (
      <output data-testid="probe" data-layout={arranged.layout}>
        {JSON.stringify(arranged.topology.nodes.map((node) => node.position))}
      </output>
    );
  }

  function positionsAt(width: number): string {
    window.innerWidth = width;
    act(() => {
      root?.render(<Probe />);
    });
    return `${byTestId('probe')?.dataset.layout}:${byTestId('probe')?.textContent}`;
  }

  it('moves the devices it has a place for on a narrow screen, and none on a wide one', () => {
    expect(positionsAt(NARROW)).toBe('narrow:[{"x":80,"y":180},{"x":125,"y":0}]');
  });

  it("is the lesson's own arrangement on a wide screen", () => {
    expect(positionsAt(WIDE)).toBe('wide:[{"x":80,"y":180},{"x":640,"y":180}]');
  });
});
