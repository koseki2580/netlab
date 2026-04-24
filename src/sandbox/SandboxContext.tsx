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
}

export function SandboxProvider({ children, initialMode = 'alpha' }: SandboxProviderProps) {
  const simulation = useSimulation();
  const tutorialPresent = useContext(TutorialPresenceContext);
  const initialSnapshotRef = useRef<SimulationSnapshot | null>(null);
  const initialSessionRef = useRef<EditSession | null>(null);

  if (!initialSnapshotRef.current) {
    initialSnapshotRef.current = fromEngine(simulation.engine);
  }

  if (!initialSessionRef.current) {
    initialSessionRef.current = decodeSandboxEdits(window.location.search).reduce(
      (current, edit) => current.push(edit),
      EditSession.empty(),
    );
  }

  const [session, setSession] = useState(() => initialSessionRef.current ?? EditSession.empty());
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

  const pushEdit = useCallback(
    (edit: Edit) => {
      const next = sessionRef.current.push(edit);
      sessionRef.current = next;
      setSession(next);
      engine.applyEdits(next);
      void hookEngine.emit('sandbox:edit-applied', { edit });
    },
    [engine],
  );

  const switchMode = useCallback(
    (mode: SandboxMode) => {
      engine.switchMode(mode);
      void hookEngine.emit('sandbox:mode-changed', { mode });
      setVersion((current) => current + 1);
    },
    [engine],
  );

  const resetBaseline = useCallback(() => {
    const snapshot = initialSnapshotRef.current;
    if (!snapshot) return;

    const emptySession = EditSession.empty();
    sessionRef.current = emptySession;
    setSession(emptySession);
    setActiveEditor(null);
    setDiffFilter('all');
    setEngine((current) => {
      const next = new BranchedSimulationEngine(snapshot, { mode: current.mode });
      current.dispose();
      return next;
    });
    setVersion((current) => current + 1);
  }, []);

  const mode = engine.mode;
  const value = useMemo<SandboxContextValue>(
    () => ({
      mode,
      session,
      engine,
      activeEditor,
      diffFilter,
      pushEdit,
      switchMode,
      resetBaseline,
      openEditPopover: setActiveEditor,
      closeEditPopover: () => setActiveEditor(null),
      setDiffFilter,
    }),
    [activeEditor, diffFilter, engine, mode, pushEdit, resetBaseline, session, switchMode],
  );

  return <SandboxContext.Provider value={value}>{children}</SandboxContext.Provider>;
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
