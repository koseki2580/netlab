import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { NetlabError } from '../errors';
import { hookEngine } from '../hooks/HookEngine';
import { useSimulation } from '../simulation/SimulationContext';
import { TutorialPresenceContext } from '../tutorials/TutorialContext';
import { BranchedSimulationEngine } from './BranchedSimulationEngine';
import { EditSession } from './EditSession';
import { fromEngine } from './SimulationSnapshot';
import type { Edit } from './edits';
import { decodeSandboxEdits, updateSandboxSearch } from './urlCodec';
import { useSandboxShortcuts } from './useUndoRedo';
import type {
  EdgeRef,
  InterfaceRef,
  NodeRef,
  PacketRef,
  SandboxMode,
  SimulationSnapshot,
} from './types';

export type SandboxDiffFilter = 'route' | 'link' | 'packet' | 'parameter' | 'traffic' | 'all';

export interface SandboxEditorAnchor {
  readonly target: NodeRef | InterfaceRef | EdgeRef | PacketRef;
  readonly anchorElement: HTMLElement;
}

export interface SandboxContextValue {
  readonly mode: SandboxMode;
  readonly session: EditSession;
  readonly engine: BranchedSimulationEngine;
  readonly activeEditor: SandboxEditorAnchor | null;
  readonly diffFilter: SandboxDiffFilter;
  readonly pushEdit: (edit: Edit) => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly revertAt: (index: number) => void;
  readonly resetAll: () => void;
  readonly setSession: (session: EditSession) => void;
  readonly setUndoFloor?: (head: number) => void;
  readonly switchMode: (mode: SandboxMode) => void;
  readonly resetBaseline: () => void;
  readonly openEditPopover: (payload: SandboxEditorAnchor) => void;
  readonly closeEditPopover: () => void;
  readonly setDiffFilter: (filter: SandboxDiffFilter) => void;
}

export const SandboxContext = createContext<SandboxContextValue | null>(null);

export interface SandboxProviderProps {
  readonly children: ReactNode;
  readonly initialMode?: SandboxMode;
  readonly enableShortcuts?: boolean;
}

export function SandboxProvider({
  children,
  initialMode = 'alpha',
  enableShortcuts = true,
}: SandboxProviderProps) {
  const simulation = useSimulation();
  const tutorialPresent = useContext(TutorialPresenceContext);
  const initialSnapshotRef = useRef<SimulationSnapshot | null>(null);
  const initialSessionRef = useRef<EditSession | null>(null);
  const shortcutRootRef = useRef<HTMLElement | null>(null);
  const undoFloorRef = useRef(0);

  if (!initialSnapshotRef.current) {
    initialSnapshotRef.current = fromEngine(simulation.engine);
  }

  if (!initialSessionRef.current) {
    initialSessionRef.current = decodeSandboxEdits(window.location.search).reduce(
      (current, edit) => current.push(edit),
      EditSession.empty(),
    );
  }

  const [session, setSessionState] = useState(
    () => initialSessionRef.current ?? EditSession.empty(),
  );
  const sessionRef = useRef(session);
  const [activeEditor, setActiveEditor] = useState<SandboxEditorAnchor | null>(null);
  const [diffFilter, setDiffFilter] = useState<SandboxDiffFilter>('all');
  const [engine, setEngine] = useState(() => {
    const next = new BranchedSimulationEngine(initialSnapshotRef.current as SimulationSnapshot, {
      mode: initialMode,
    });
    const initialSession = initialSessionRef.current;
    if (initialSession && initialSession.size() > 0) {
      next.applyEdits(initialSession);
    }
    return next;
  });
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (!tutorialPresent) return;

    throw new NetlabError({
      code: 'sandbox/tutorial-conflict',
      message:
        'SandboxProvider cannot mount under TutorialProvider; see docs/ui/sandbox.md#tutorial-conflict',
      context: {
        message:
          'SandboxProvider cannot mount under TutorialProvider; see docs/ui/sandbox.md#tutorial-conflict',
      },
    });
  }, [tutorialPresent]);

  useEffect(() => engine.subscribe(() => setVersion((current) => current + 1)), [engine]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const nextSearch = updateSandboxSearch(window.location.search, session.edits);
    const currentSearch = window.location.search;
    if (nextSearch === currentSearch) {
      return;
    }
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${nextSearch}${window.location.hash}`,
    );
  }, [session]);

  useEffect(
    () => () => {
      engine.dispose();
    },
    [engine],
  );

  const commitSession = useCallback(
    (nextSession: EditSession) => {
      sessionRef.current = nextSession;
      setSessionState(nextSession);
      engine.applyEdits(nextSession);
    },
    [engine],
  );

  const replaceSession = useCallback(
    (nextSession: EditSession) => {
      undoFloorRef.current = 0;
      setActiveEditor(null);
      setDiffFilter('all');
      commitSession(nextSession);
    },
    [commitSession],
  );

  const pushEdit = useCallback(
    (edit: Edit) => {
      const current = sessionRef.current;
      const evictedCount = Math.max(0, current.head + 1 - EditSession.MAX_HISTORY);
      const next = current.push(edit);
      commitSession(next);
      if (evictedCount > 0) {
        void hookEngine.emit('sandbox:history-evicted', { count: evictedCount });
      }
      void hookEngine.emit('sandbox:edit-applied', { edit });
    },
    [commitSession],
  );

  const undo = useCallback(() => {
    const current = sessionRef.current;
    if (!current.canUndo() || current.head <= undoFloorRef.current) {
      void hookEngine.emit('sandbox:undo-blocked', { head: current.head });
      return;
    }

    const edit = current.backing[current.head - 1];
    if (!edit) return;

    const next = current.undo();
    commitSession(next);
    void hookEngine.emit('sandbox:edit-undone', { edit, head: next.head });
  }, [commitSession]);

  const redo = useCallback(() => {
    const current = sessionRef.current;
    if (!current.canRedo()) {
      return;
    }

    const edit = current.backing[current.head];
    if (!edit) return;

    const next = current.redo();
    commitSession(next);
    void hookEngine.emit('sandbox:edit-redone', { edit, head: next.head });
  }, [commitSession]);

  const revertAt = useCallback(
    (index: number) => {
      const current = sessionRef.current;
      const edit = current.backing[index];
      const next = current.revertAt(index);
      if (next === current || !edit) {
        return;
      }

      commitSession(next);
      void hookEngine.emit('sandbox:edit-reverted', { edit, head: next.head });
    },
    [commitSession],
  );

  const switchMode = useCallback(
    (mode: SandboxMode) => {
      engine.switchMode(mode);
      void hookEngine.emit('sandbox:mode-changed', { mode });
      setVersion((current) => current + 1);
    },
    [engine],
  );

  const resetAll = useCallback(() => {
    const snapshot = initialSnapshotRef.current;
    if (!snapshot) return;

    const count = sessionRef.current.size();
    const emptySession = EditSession.empty();
    sessionRef.current = emptySession;
    setSessionState(emptySession);
    undoFloorRef.current = 0;
    setActiveEditor(null);
    setDiffFilter('all');
    setEngine((current) => {
      const next = new BranchedSimulationEngine(snapshot, { mode: current.mode });
      current.dispose();
      return next;
    });
    setVersion((current) => current + 1);
    void hookEngine.emit('sandbox:reset-all', { count });
  }, []);

  const setUndoFloor = useCallback((head: number) => {
    undoFloorRef.current = Math.max(0, Math.floor(head));
  }, []);

  const resetBaseline = useCallback(() => {
    resetAll();
  }, [resetAll]);

  useSandboxShortcuts({
    enabled: enableShortcuts,
    rootRef: shortcutRootRef,
    undo,
    redo,
  });

  const mode = engine.mode;
  const value = useMemo<SandboxContextValue>(
    () => ({
      mode,
      session,
      engine,
      activeEditor,
      diffFilter,
      pushEdit,
      undo,
      redo,
      revertAt,
      resetAll,
      setSession: replaceSession,
      setUndoFloor,
      switchMode,
      resetBaseline,
      openEditPopover: setActiveEditor,
      closeEditPopover: () => setActiveEditor(null),
      setDiffFilter,
    }),
    [
      activeEditor,
      diffFilter,
      engine,
      mode,
      pushEdit,
      redo,
      resetAll,
      resetBaseline,
      replaceSession,
      revertAt,
      setUndoFloor,
      session,
      switchMode,
      undo,
    ],
  );

  return (
    <SandboxContext.Provider value={value}>
      <span ref={shortcutRootRef} style={{ display: 'contents' }}>
        {children}
      </span>
    </SandboxContext.Provider>
  );
}

export function useSandbox(): SandboxContextValue {
  const context = useContext(SandboxContext);
  if (!context) {
    throw new NetlabError({
      code: 'sandbox/missing-provider',
      message: '[netlab] useSandbox must be used within <SandboxProvider>',
    });
  }

  return context;
}
