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
import { NetlabError } from '../../errors';
import type { SimulationSnapshot } from '../types';
import { ReplayPlayer, type ReplaySpeed, type ReplayStatus } from './player';
import type { RecordedEvent, RecordedSession } from './types';

export interface ReplayContextValue {
  readonly isActive: boolean;
  readonly status: ReplayStatus;
  readonly currentSeq: number;
  readonly totalEvents: number;
  readonly speed: ReplaySpeed;
  readonly recording: RecordedSession;
  readonly currentSnapshot: SimulationSnapshot;
  readonly desyncEvent: RecordedEvent | null;
  readonly dismissDesync: () => void;
  readonly play: () => void;
  readonly pause: () => void;
  readonly stepForward: () => void;
  readonly stepBackward: () => void;
  readonly seek: (seq: number) => void;
  readonly setSpeed: (speed: ReplaySpeed) => void;
  readonly fork: () => SimulationSnapshot;
  readonly forkedSnapshot: SimulationSnapshot | null;
}

export const SandboxReplayContext = createContext<ReplayContextValue | null>(null);

export interface SandboxReplayProviderProps {
  readonly recording: RecordedSession;
  readonly children: ReactNode;
  readonly onFork?: (snapshot: SimulationSnapshot) => void;
  readonly stripReplayUrlParam?: boolean;
}

const REPLAY_URL_PARAM = 'replay';

function stripReplayParam(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(REPLAY_URL_PARAM)) return;
  url.searchParams.delete(REPLAY_URL_PARAM);
  window.history.replaceState({}, '', url.toString());
}

export function SandboxReplayProvider({
  recording,
  children,
  onFork,
  stripReplayUrlParam = true,
}: SandboxReplayProviderProps) {
  const playerRef = useRef<ReplayPlayer | null>(null);
  if (!playerRef.current) {
    playerRef.current = new ReplayPlayer(recording);
  }
  const player = playerRef.current;

  const [playerSnapshot, setPlayerSnapshot] = useState(() => ({
    status: player.status,
    currentSeq: player.currentSeq,
    speed: player.speed,
    currentSnapshot: player.currentSnapshot,
  }));
  const [forkedSnapshot, setForkedSnapshot] = useState<SimulationSnapshot | null>(null);
  const [desyncEvent, setDesyncEvent] = useState<RecordedEvent | null>(null);

  useEffect(() => {
    const sync = () =>
      setPlayerSnapshot({
        status: player.status,
        currentSeq: player.currentSeq,
        speed: player.speed,
        currentSnapshot: player.currentSnapshot,
      });
    sync();
    const off = player.subscribe(sync);
    const offDesync = player.onDesync((event) => setDesyncEvent(event));
    return () => {
      off();
      offDesync();
      // Stop any active timer; the player itself is GC'd with the component.
      if (player.status === 'playing') {
        player.pause();
      }
    };
  }, [player]);

  const dismissDesync = useCallback(() => {
    setDesyncEvent(null);
  }, []);

  const fork = useCallback((): SimulationSnapshot => {
    const snapshot = player.fork();
    setForkedSnapshot(snapshot);
    if (stripReplayUrlParam) {
      stripReplayParam();
    }
    onFork?.(snapshot);
    return snapshot;
  }, [onFork, player, stripReplayUrlParam]);

  const value = useMemo<ReplayContextValue>(
    () => ({
      isActive: forkedSnapshot === null,
      status: playerSnapshot.status,
      currentSeq: playerSnapshot.currentSeq,
      totalEvents: player.totalEvents,
      speed: playerSnapshot.speed,
      recording,
      currentSnapshot: playerSnapshot.currentSnapshot,
      desyncEvent,
      dismissDesync,
      play: () => player.play(),
      pause: () => player.pause(),
      stepForward: () => player.stepForward(),
      stepBackward: () => player.stepBackward(),
      seek: (seq) => player.seek(seq),
      setSpeed: (speed) => player.setSpeed(speed),
      fork,
      forkedSnapshot,
    }),
    [desyncEvent, dismissDesync, forkedSnapshot, fork, player, playerSnapshot, recording],
  );

  return <SandboxReplayContext.Provider value={value}>{children}</SandboxReplayContext.Provider>;
}

export function useReplay(): ReplayContextValue {
  const context = useContext(SandboxReplayContext);
  if (!context) {
    throw new NetlabError({
      code: 'sandbox-recording/missing-sandbox',
      message: '[netlab] useReplay must be used within <SandboxReplayProvider>',
    });
  }
  return context;
}

export function useOptionalReplay(): ReplayContextValue | null {
  return useContext(SandboxReplayContext);
}
