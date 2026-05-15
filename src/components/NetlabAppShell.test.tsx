/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetlabAppShell } from './NetlabAppShell';
import { ToolGroup, ToolGroupButton } from './ToolGroup';

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

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
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

describe('NetlabAppShell', () => {
  it('renders the body content inside the canvas frame', () => {
    act(() => {
      root?.render(
        <NetlabAppShell>
          <div data-testid="body">hello</div>
        </NetlabAppShell>,
      );
    });
    expect(container?.querySelector('[data-testid="body"]')?.textContent).toBe('hello');
  });

  it('shows a back button only when onBackToGallery is provided and fires the callback', () => {
    const onBack = vi.fn();
    act(() => {
      root?.render(<NetlabAppShell>body</NetlabAppShell>);
    });
    expect(container?.querySelector('button[aria-label*="back" i]')).toBeNull();
    act(() => {
      root?.render(
        <NetlabAppShell onBackToGallery={onBack} backLabel="Gallery">
          body
        </NetlabAppShell>,
      );
    });
    const backBtn = container?.querySelector('button') as HTMLButtonElement | null;
    expect(backBtn).not.toBeNull();
    expect(backBtn?.textContent).toContain('Gallery');
    act(() => {
      backBtn?.click();
    });
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('renders the scenario chip when scenarioId is provided', () => {
    act(() => {
      root?.render(
        <NetlabAppShell scenarioId="ospf-convergence" scenarioLayer="L3">
          body
        </NetlabAppShell>,
      );
    });
    expect(container?.textContent).toContain('ospf-convergence');
    expect(container?.textContent).toContain('L3');
  });

  it('lays out the four zones in toolbar order: topology / run / inspect / sandbox', () => {
    act(() => {
      root?.render(
        <NetlabAppShell
          topologyZone={
            <ToolGroup title="TOPOLOGY" accent="var(--netlab-accent-blue)">
              <ToolGroupButton active>View</ToolGroupButton>
            </ToolGroup>
          }
          runZone={
            <ToolGroup title="RUN" accent="var(--netlab-accent-green)">
              <ToolGroupButton>Play</ToolGroupButton>
            </ToolGroup>
          }
          inspectZone={
            <ToolGroup title="INSPECT" accent="var(--netlab-accent-cyan)">
              <ToolGroupButton>Packets</ToolGroupButton>
            </ToolGroup>
          }
          sandboxZone={
            <ToolGroup title="SANDBOX" accent="var(--netlab-accent-yellow)">
              <ToolGroupButton>Edit</ToolGroupButton>
            </ToolGroup>
          }
        >
          body
        </NetlabAppShell>,
      );
    });
    const zones = Array.from(container?.querySelectorAll('[data-tool-group]') ?? []);
    expect(zones.map((z) => z.getAttribute('data-tool-group'))).toEqual([
      'TOPOLOGY',
      'RUN',
      'INSPECT',
      'SANDBOX',
    ]);
  });

  it('renders the status pill with the supplied label + tone', () => {
    act(() => {
      root?.render(
        <NetlabAppShell status={{ label: 'running', tone: 'running' }}>body</NetlabAppShell>,
      );
    });
    expect(container?.textContent).toContain('running');
  });

  it('renders the hint pill with the pulse class when supplied', () => {
    act(() => {
      root?.render(<NetlabAppShell hint="Tip · click R1 to inspect →">body</NetlabAppShell>);
    });
    const hint = container?.querySelector('[data-netlab-shell-hint]') as HTMLElement | null;
    expect(hint).not.toBeNull();
    expect(hint?.className).toContain('netlab-hint-pulse');
    expect(hint?.textContent).toContain('click R1');
  });
});
