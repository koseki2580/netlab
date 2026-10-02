/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LessonCanvas, LessonNote, LessonPanel, LessonSplit } from './LessonPanel';

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
