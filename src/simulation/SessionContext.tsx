import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNetlabContext } from '../components/NetlabContext';
import { NetlabError } from '../errors';
import type { NetworkSession } from '../types/session';
import type { PacketTrace } from '../types/simulation';
import { SessionTracker } from './SessionTracker';

export interface SessionContextValue {
  sessions: NetworkSession[];
  selectedSessionId: string | null;
  selectedSession: NetworkSession | null;
  selectSession: (id: string | null) => void;
  startSession: (
    sessionId: string,
    opts: {
      srcNodeId: string;
      dstNodeId: string;
      protocol?: string;
      requestType?: string;
      transferId?: string;
    },
  ) => void;
  attachTrace: (sessionId: string, trace: PacketTrace, role: 'request' | 'response') => void;
  clearSessions: () => void;
}

interface SessionContextInternalValue extends SessionContextValue {
  tracker: SessionTracker;
}

export const SessionContext = createContext<SessionContextInternalValue | null>(null);

export interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const { hookEngine } = useNetlabContext();
  const tracker = useMemo(() => new SessionTracker(hookEngine), [hookEngine]);
  const [sessions, setSessions] = useState<NetworkSession[]>(() => tracker.getSessions());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    setSessions(tracker.getSessions());
    return tracker.subscribe(() => {
      setSessions([...tracker.getSessions()]);
    });
  }, [tracker]);

  useEffect(() => {
    if (!selectedSessionId) return;
    if (sessions.some((session) => session.sessionId === selectedSessionId)) return;
    setSelectedSessionId(null);
  }, [sessions, selectedSessionId]);

  const startSession = useCallback<SessionContextValue['startSession']>(
    (sessionId, opts) => {
      tracker.startSession(sessionId, opts);
    },
    [tracker],
  );

  const attachTrace = useCallback<SessionContextValue['attachTrace']>(
    (sessionId, trace, role) => {
      tracker.attachTrace(sessionId, trace, role);
    },
    [tracker],
  );

  const clearSessions = useCallback(() => {
    tracker.clear();
    setSelectedSessionId(null);
  }, [tracker]);

  const selectedSession =
    sessions.find((session) => session.sessionId === selectedSessionId) ?? null;

  const value = useMemo<SessionContextInternalValue>(
    () => ({
      tracker,
      sessions,
      selectedSessionId,
      selectedSession,
      selectSession: setSelectedSessionId,
      startSession,
      attachTrace,
      clearSessions,
    }),
    [
      tracker,
      sessions,
      selectedSessionId,
      selectedSession,
      startSession,
      attachTrace,
      clearSessions,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new NetlabError({
      code: 'config/missing-provider',
      message: '[netlab] useSession must be used within <SessionProvider>',
    });
  }
  return ctx;
}

export function useOptionalSession(): SessionContextValue | null {
  return useContext(SessionContext);
}

export function useOptionalSessionTracker(): SessionTracker | null {
  return useContext(SessionContext)?.tracker ?? null;
}
