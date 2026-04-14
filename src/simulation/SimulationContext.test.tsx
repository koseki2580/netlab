/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { NetlabContext } from '../components/NetlabContext';
import { FailureContext, type FailureContextValue } from './FailureContext';
import {
  SimulationProvider,
  useSimulation,
  type SimulationContextValue,
} from './SimulationContext';
import { EMPTY_FAILURE_STATE, type FailureState } from '../types/failure';
import { directTopology } from './__fixtures__/topologies';
import { makePacket } from './__fixtures__/helpers';

const TOPOLOGY = directTopology();
const HOOK_ENGINE = new HookEngine();

function CaptureSimulation() {
  latestSimulation = useSimulation();
  return null;
}

function makeFailureState(overrides: {
  downNodeIds?: string[];
  downEdgeIds?: string[];
  downInterfaceIds?: string[];
} = {}): FailureState {
  return {
    downNodeIds: new Set(overrides.downNodeIds ?? []),
    downEdgeIds: new Set(overrides.downEdgeIds ?? []),
    downInterfaceIds: new Set(overrides.downInterfaceIds ?? []),
  };
}

function makeFailureContextValue(failureState: FailureState): FailureContextValue {
  return {
    failureState,
    toggleNode: vi.fn(),
    toggleEdge: vi.fn(),
    toggleInterface: vi.fn(),
    resetFailures: vi.fn(),
    isNodeDown: (nodeId: string) => failureState.downNodeIds.has(nodeId),
    isEdgeDown: (edgeId: string) => failureState.downEdgeIds.has(edgeId),
    isInterfaceDown: (nodeId: string, interfaceId: string) =>
      failureState.downInterfaceIds.has(`${nodeId}:${interfaceId}`),
  };
}

interface RenderOptions {
  autoRecompute?: boolean;
  animationSpeed?: number;
  failureState?: FailureState;
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let latestSimulation: SimulationContextValue | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function render(options: RenderOptions = {}) {
  const {
    autoRecompute = false,
    animationSpeed,
    failureState = EMPTY_FAILURE_STATE,
  } = options;

  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

  act(() => {
    root?.render(
      <NetlabContext.Provider
        value={{
          topology: TOPOLOGY,
          routeTable: TOPOLOGY.routeTables,
          areas: TOPOLOGY.areas,
          hookEngine: HOOK_ENGINE,
        }}
      >
        <FailureContext.Provider value={makeFailureContextValue(failureState)}>
          <SimulationProvider
            autoRecompute={autoRecompute}
            animationSpeed={animationSpeed}
          >
            <CaptureSimulation />
          </SimulationProvider>
        </FailureContext.Provider>
      </NetlabContext.Provider>,
    );
  });

  return {
    rerender(nextOptions: RenderOptions = {}) {
      render({
        autoRecompute,
        animationSpeed,
        failureState,
        ...nextOptions,
      });
    },
  };
}

function currentSimulation(): SimulationContextValue {
  if (!latestSimulation) {
    throw new Error('Simulation context was not captured');
  }

  return latestSimulation;
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  latestSimulation = null;
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  latestSimulation = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;

  if (container) {
    container.remove();
    container = null;
  }

  vi.restoreAllMocks();
});

describe('SimulationProvider autoRecompute', () => {
  it('does not recompute when autoRecompute is false', async () => {
    const view = render();
    const packet = makePacket('ctx-auto-off', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');

    await act(async () => {
      await currentSimulation().sendPacket(packet);
    });

    const resendSpy = vi.spyOn(currentSimulation().engine, 'resend').mockResolvedValue(undefined);
    view.rerender({
      failureState: makeFailureState({ downEdgeIds: ['e1'] }),
    });

    expect(resendSpy).not.toHaveBeenCalled();
  });

  it('recomputes when failure state changes and autoRecompute is true', async () => {
    const initialFailureState = makeFailureState();
    const nextFailureState = makeFailureState({ downEdgeIds: ['e1'] });
    const view = render({ autoRecompute: true, failureState: initialFailureState });
    const packet = makePacket('ctx-auto-on', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');

    await act(async () => {
      await currentSimulation().sendPacket(packet);
    });

    const resendSpy = vi.spyOn(currentSimulation().engine, 'resend').mockResolvedValue(undefined);
    view.rerender({
      autoRecompute: true,
      failureState: nextFailureState,
    });

    expect(resendSpy).toHaveBeenCalledTimes(1);
    expect(resendSpy).toHaveBeenCalledWith(nextFailureState);
  });

  it('does not recompute when no packet has been sent', () => {
    const initialFailureState = makeFailureState();
    const nextFailureState = makeFailureState({ downEdgeIds: ['e1'] });
    const view = render({ autoRecompute: true, failureState: initialFailureState });
    const resendSpy = vi.spyOn(currentSimulation().engine, 'resend').mockResolvedValue(undefined);

    view.rerender({
      autoRecompute: true,
      failureState: nextFailureState,
    });

    expect(resendSpy).not.toHaveBeenCalled();
  });

  it('sets isRecomputing while auto-recompute is in flight', async () => {
    const initialFailureState = makeFailureState();
    const nextFailureState = makeFailureState({ downEdgeIds: ['e1'] });
    const view = render({ autoRecompute: true, failureState: initialFailureState });
    const packet = makePacket('ctx-recomputing', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');

    await act(async () => {
      await currentSimulation().sendPacket(packet);
    });

    let resolveResend: (() => void) | null = null;
    const resendPromise = new Promise<void>((resolve) => {
      resolveResend = resolve;
    });

    vi.spyOn(currentSimulation().engine, 'resend').mockReturnValue(resendPromise);

    view.rerender({
      autoRecompute: true,
      failureState: nextFailureState,
    });

    expect(currentSimulation().isRecomputing).toBe(true);

    await act(async () => {
      resolveResend?.();
      await resendPromise;
    });

    expect(currentSimulation().isRecomputing).toBe(false);
  });
});

describe('SimulationProvider animationSpeed', () => {
  it('sets the engine play interval from the animationSpeed prop', () => {
    render({ animationSpeed: 300 });

    expect(currentSimulation().engine.getPlayInterval()).toBe(300);
    expect(currentSimulation().animationSpeed).toBe(300);
  });

  it('exposes animationSpeed and setAnimationSpeed through context', () => {
    render();

    expect(currentSimulation().animationSpeed).toBe(500);

    act(() => {
      currentSimulation().setAnimationSpeed(25);
    });

    expect(currentSimulation().engine.getPlayInterval()).toBe(50);
    expect(currentSimulation().animationSpeed).toBe(50);
  });
});
