/* @vitest-environment jsdom */

import { StrictMode, act, useContext } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hookEngine } from '../../hooks/HookEngine';
import { TutorialPresenceContext } from '../../tutorials/TutorialContext';
import type { BranchedSimulationEngine } from '../BranchedSimulationEngine';
import { EditSession } from '../EditSession';
import { SandboxContext, type SandboxContextValue } from '../SandboxContext';
import { DEFAULT_PARAMETERS } from '../types';
import { SandboxIntroProvider } from './SandboxIntroProvider';
import { useSandboxIntro } from './useSandboxIntro';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function render(ui: React.ReactElement) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

  act(() => {
    root?.render(ui);
  });
}

function makeSandboxValue(): SandboxContextValue {
  return {
    mode: 'alpha',
    session: EditSession.empty(),
    engine: {
      whatIf: {
        getState: () => ({
          status: 'idle',
          traces: [],
          currentTraceId: null,
          currentStep: -1,
          activeEdgeIds: [],
          activePathEdgeIds: [],
          highlightMode: 'path',
          traceColors: {},
          selectedHop: null,
          selectedPacket: null,
          nodeArpTables: {},
          natTables: [],
          connTrackTables: [],
        }),
        getTopology: () => ({ nodes: [], edges: [], areas: [], routeTables: new Map() }),
      },
      subscribe: () => () => undefined,
      parameters: DEFAULT_PARAMETERS,
    } as unknown as BranchedSimulationEngine,
    activeEditor: null,
    diffFilter: 'all',
    pushEdit: () => undefined,
    switchMode: () => undefined,
    resetBaseline: () => undefined,
    openEditPopover: () => undefined,
    closeEditPopover: () => undefined,
    setDiffFilter: () => undefined,
  };
}

function Probe() {
  const intro = useSandboxIntro();
  const tutorialPresence = useContext(TutorialPresenceContext);

  return (
    <div>
      <button type="button" onClick={intro.start}>
        start intro
      </button>
      <div data-testid="intro-status">{intro.status}</div>
      <div data-testid="intro-step">{intro.currentStep?.title ?? 'none'}</div>
      <div data-testid="tutorial-presence">{String(tutorialPresence)}</div>
    </div>
  );
}

describe('SandboxIntroProvider', () => {
  beforeEach(() => {
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });

    root = null;
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;

    if (container) {
      container.remove();
      container = null;
    }
  });

  it('useSandboxIntro requires a provider', () => {
    expect(() => render(<Probe />)).toThrowError(/useSandboxIntro/i);
  });

  it('keeps TutorialPresenceContext false while exposing the intro state', () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <SandboxIntroProvider introId="sandbox-intro-mtu">
          <Probe />
        </SandboxIntroProvider>
      </SandboxContext.Provider>,
    );

    expect(container?.querySelector('[data-testid="intro-status"]')?.textContent).toBe('pending');
    expect(container?.querySelector('[data-testid="intro-step"]')?.textContent).toContain('Open');
    expect(container?.querySelector('[data-testid="tutorial-presence"]')?.textContent).toBe(
      'false',
    );
  });

  it('advances after sandbox events without mounting TutorialProvider', async () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <SandboxIntroProvider introId="sandbox-intro-mtu">
          <Probe />
        </SandboxIntroProvider>
      </SandboxContext.Provider>,
    );

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('button')?.click();
      await hookEngine.emit('sandbox:panel-tab-opened', { axis: 'node' });
    });

    expect(container?.querySelector('[data-testid="intro-status"]')?.textContent).toBe('active');
    expect(container?.querySelector('[data-testid="intro-step"]')?.textContent).toContain('MTU');
  });

  it('stays pending under StrictMode effect replay', () => {
    render(
      <StrictMode>
        <SandboxContext.Provider value={makeSandboxValue()}>
          <SandboxIntroProvider introId="sandbox-intro-mtu">
            <Probe />
          </SandboxIntroProvider>
        </SandboxContext.Provider>
      </StrictMode>,
    );

    expect(container?.querySelector('[data-testid="intro-status"]')?.textContent).toBe('pending');
    expect(container?.querySelector('[data-testid="intro-step"]')?.textContent).toContain('Open');
  });
});
