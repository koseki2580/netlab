import { useSimulation } from '../../simulation/SimulationContext';
import type { SimulationState } from '../../types/simulation';
import type { ShortcutHandlers } from '../../keyboard/shortcuts';

/** The engine calls playback makes. Looked up on every call, never kept. */
export interface PlaybackEngine {
  play(): void;
  pause(): void;
  step(): void;
  reset(): void;
  selectHop(step: number): void;
  selectTrace(packetId: string): void;
}

export type PlaybackState = Pick<
  SimulationState,
  'status' | 'currentStep' | 'traces' | 'currentTraceId'
>;

export interface PlaybackOptions {
  /**
   * Whether `step()` carries on into the next recorded trace once the current
   * one has played through — a lesson that records one exchange as several
   * traces (DHCP's four messages, TCP's three segments).
   */
  continueAcrossTraces?: boolean;
}

/**
 * Every control's way into the engine's playback: play, pause, step, jump and
 * reset, and what the controls read to decide which of those to offer.
 *
 * Pure over an engine and a state, so the rules are tested without a DOM;
 * `usePlayback` binds it to the simulation the component sits in.
 */
export function playbackOf(
  engine: PlaybackEngine,
  state: PlaybackState,
  { continueAcrossTraces = false }: PlaybackOptions = {},
) {
  const { status } = state;
  const traceIndex = state.traces.findIndex((trace) => trace.packetId === state.currentTraceId);
  const trace = traceIndex >= 0 ? state.traces[traceIndex] : undefined;
  const totalHops = trace?.hops.length ?? 0;
  const nextTrace = continueAcrossTraces && trace ? state.traces[traceIndex + 1] : undefined;
  /** The current trace has played through and the next one is waiting. */
  const continuesToNext = status === 'done' && nextTrace !== undefined;
  /** The step a scrub position counts from: the first one before anything is shown. */
  const scrubIndex = state.currentStep >= 0 ? state.currentStep : 0;

  /** Show hop `step`, clamped to the trace; nothing without a trace. */
  const jump = (step: number) => {
    if (totalHops === 0) return;
    engine.selectHop(Math.max(0, Math.min(totalHops - 1, step)));
  };
  /** Play from where it is. The engine does nothing once the trace is done. */
  const play = () => engine.play();
  const pause = () => engine.pause();
  const togglePlay = () => {
    if (totalHops === 0) return;
    if (status === 'running') pause();
    else play();
  };

  return {
    status,
    trace,
    traceIndex,
    totalHops,
    nextTrace,
    continuesToNext,
    scrubIndex,
    play,
    pause,
    togglePlay,
    /** Play; a trace that has played through starts over from its first device. */
    replay: () => {
      if (status === 'done') engine.reset();
      engine.play();
    },
    /** Reveal the next hop, moving on to the next trace when this one is done. */
    step: () => {
      if (continuesToNext && nextTrace) engine.selectTrace(nextTrace.packetId);
      engine.step();
    },
    reset: () => engine.reset(),
    /** Show another recorded trace, from before its first hop. */
    selectTrace: (packetId: string) => engine.selectTrace(packetId),
    jump,
    /** The playback keys (`SHORTCUTS`), as a scrub track handles them. */
    keys: {
      playPause: togglePlay,
      stepBackward: (steps) => jump(scrubIndex - steps),
      stepForward: (steps) => jump(scrubIndex + steps),
      jumpStart: () => jump(0),
      jumpEnd: () => jump(totalHops - 1),
    } satisfies ShortcutHandlers,
  };
}

export type Playback = ReturnType<typeof playbackOf>;

/** `playbackOf` for the simulation this component sits in. */
export function usePlayback(options?: PlaybackOptions): Playback {
  const { engine, state } = useSimulation();
  return playbackOf(engine, state, options);
}
