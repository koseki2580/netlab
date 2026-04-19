/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { NetlabContext } from '../components/NetlabContext';
import type { PacketTrace } from '../types/simulation';
import type { NetworkTopology } from '../types/topology';
import {
  SessionProvider,
  useOptionalSession,
  useOptionalSessionTracker,
  useSession,
  type SessionContextValue,
} from './SessionContext';
import { SessionTracker } from './SessionTracker';

const TOPOLOGY: NetworkTopology = {
  nodes: [],
  edges: [],
  areas: [],
  routeTables: new Map(),
};

const HOOK_ENGINE = new HookEngine();

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let latestSession: SessionContextValue | null = null;
let latestTracker: SessionTracker | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function makeTrace(packetId = 'pkt-1'): PacketTrace {
  return {
    packetId,
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    hops: [],
    status: 'delivered',
  };
}

function CaptureSession() {
  latestSession = useSession();
  latestTracker = useOptionalSessionTracker();
  return null;
}

function OptionalSessionOutsideConsumer() {
  return <div>{String(useOptionalSession() === null)}</div>;
}

function OptionalTrackerOutsideConsumer() {
  return <div>{String(useOptionalSessionTracker() === null)}</div>;
}

function RequiredSessionOutsideConsumer() {
  useSession();
  return null;
}

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

function renderProvider() {
  render(
    <NetlabContext.Provider
      value={{
        topology: TOPOLOGY,
        routeTable: TOPOLOGY.routeTables,
        areas: TOPOLOGY.areas,
        hookEngine: HOOK_ENGINE,
      }}
    >
      <SessionProvider>
        <CaptureSession />
      </SessionProvider>
    </NetlabContext.Provider>,
  );
}

function currentSession() {
  if (!latestSession) {
    throw new Error('Session context was not captured');
  }

  return latestSession;
}

function currentTracker() {
  if (!latestTracker) {
    throw new Error('Session tracker was not captured');
  }

  return latestTracker;
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  latestSession = null;
  latestTracker = null;
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  latestSession = null;
  latestTracker = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;

  if (container) {
    container.remove();
    container = null;
  }

  vi.restoreAllMocks();
});

describe('SessionProvider', () => {
  describe('session lifecycle', () => {
    it('starts with empty sessions list', () => {
      renderProvider();

      expect(currentSession().sessions).toEqual([]);
      expect(currentSession().selectedSessionId).toBeNull();
      expect(currentSession().selectedSession).toBeNull();
    });

    it('startSession adds a new session', () => {
      renderProvider();

      act(() => {
        currentSession().startSession('session-1', {
          srcNodeId: 'client-1',
          dstNodeId: 'server-1',
          protocol: 'HTTP',
        });
      });

      expect(currentSession().sessions).toHaveLength(1);
      expect(currentSession().sessions[0]).toMatchObject({
        sessionId: 'session-1',
        srcNodeId: 'client-1',
        dstNodeId: 'server-1',
        protocol: 'HTTP',
      });
    });

    it('attachTrace delegates to tracker', () => {
      renderProvider();
      act(() => {
        currentSession().startSession('session-1', {
          srcNodeId: 'client-1',
          dstNodeId: 'server-1',
        });
      });
      const trace = makeTrace();
      const spy = vi.spyOn(currentTracker(), 'attachTrace');

      act(() => {
        currentSession().attachTrace('session-1', trace, 'request');
      });

      expect(spy).toHaveBeenCalledWith('session-1', trace, 'request');
    });

    it('clearSessions removes all sessions and resets selection', () => {
      renderProvider();

      act(() => {
        currentSession().startSession('session-1', {
          srcNodeId: 'client-1',
          dstNodeId: 'server-1',
        });
        currentSession().selectSession('session-1');
      });

      act(() => {
        currentSession().clearSessions();
      });

      expect(currentSession().sessions).toEqual([]);
      expect(currentSession().selectedSessionId).toBeNull();
      expect(currentSession().selectedSession).toBeNull();
    });
  });

  describe('selected session', () => {
    it('selectSession sets selectedSession', () => {
      renderProvider();

      act(() => {
        currentSession().startSession('session-1', {
          srcNodeId: 'client-1',
          dstNodeId: 'server-1',
        });
      });
      act(() => {
        currentSession().selectSession('session-1');
      });

      expect(currentSession().selectedSessionId).toBe('session-1');
      expect(currentSession().selectedSession?.sessionId).toBe('session-1');
    });

    it('selectSession(null) clears selection', () => {
      renderProvider();

      act(() => {
        currentSession().startSession('session-1', {
          srcNodeId: 'client-1',
          dstNodeId: 'server-1',
        });
        currentSession().selectSession('session-1');
      });

      act(() => {
        currentSession().selectSession(null);
      });

      expect(currentSession().selectedSessionId).toBeNull();
      expect(currentSession().selectedSession).toBeNull();
    });

    it('clears selection when selected session no longer exists', () => {
      renderProvider();

      act(() => {
        currentSession().startSession('session-1', {
          srcNodeId: 'client-1',
          dstNodeId: 'server-1',
        });
        currentSession().selectSession('session-1');
      });

      act(() => {
        currentTracker().clear();
      });

      expect(currentSession().selectedSessionId).toBeNull();
      expect(currentSession().selectedSession).toBeNull();
    });
  });

  describe('useSession', () => {
    it('throws when used outside SessionProvider', () => {
      expect(() => renderToStaticMarkup(<RequiredSessionOutsideConsumer />)).toThrow(
        '[netlab] useSession must be used within <SessionProvider>',
      );
    });
  });

  describe('useOptionalSession', () => {
    it('returns null outside SessionProvider', () => {
      expect(renderToStaticMarkup(<OptionalSessionOutsideConsumer />)).toContain('true');
    });
  });

  describe('useOptionalSessionTracker', () => {
    it('returns SessionTracker instance inside provider', () => {
      renderProvider();

      expect(currentTracker()).toBeInstanceOf(SessionTracker);
    });

    it('returns null outside provider', () => {
      expect(renderToStaticMarkup(<OptionalTrackerOutsideConsumer />)).toContain('true');
    });
  });
});
