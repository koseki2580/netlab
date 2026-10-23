import { describe, expect, it } from 'vitest';
import type { PacketTrace } from '../../types/simulation';
import { playbackOf, type PlaybackEngine, type PlaybackState } from './playback';

/** An engine that records what playback asked of it, in order. */
function recordingEngine() {
  const calls: string[] = [];
  const engine: PlaybackEngine = {
    play: () => calls.push('play'),
    pause: () => calls.push('pause'),
    step: () => calls.push('step'),
    reset: () => calls.push('reset'),
    selectHop: (step) => calls.push(`selectHop:${step}`),
    selectTrace: (id) => calls.push(`selectTrace:${id}`),
  };
  return { engine, calls };
}

function trace(packetId: string, hops: number): PacketTrace {
  return {
    packetId,
    hops: Array.from({ length: hops }, (_, step) => ({ step })),
  } as unknown as PacketTrace;
}

function state(overrides: Partial<PlaybackState> = {}): PlaybackState {
  return {
    status: 'paused',
    currentStep: -1,
    traces: [trace('a', 4), trace('b', 3)],
    currentTraceId: 'a',
    ...overrides,
  };
}

describe('playback — play, pause and replay', () => {
  it.each([
    ['paused', ['play']],
    ['running', ['pause']],
    ['done', ['play']],
    ['idle', ['play']],
  ] as const)('toggling while %s asks the engine for %j', (status, expected) => {
    const { engine, calls } = recordingEngine();
    playbackOf(engine, state({ status })).togglePlay();
    expect(calls).toEqual(expected);
  });

  it('does not toggle without a trace to play', () => {
    const { engine, calls } = recordingEngine();
    playbackOf(engine, state({ currentTraceId: null })).togglePlay();
    expect(calls).toEqual([]);
  });

  it.each([
    ['done', ['reset', 'play']],
    ['paused', ['play']],
    ['idle', ['play']],
  ] as const)('replaying while %s asks for %j', (status, expected) => {
    const { engine, calls } = recordingEngine();
    playbackOf(engine, state({ status })).replay();
    expect(calls).toEqual(expected);
  });

  it('resets, pauses and selects a trace as asked', () => {
    const { engine, calls } = recordingEngine();
    const playback = playbackOf(engine, state());
    playback.reset();
    playback.pause();
    playback.selectTrace('b');
    expect(calls).toEqual(['reset', 'pause', 'selectTrace:b']);
  });
});

describe('playback — stepping', () => {
  it('steps within a trace', () => {
    const { engine, calls } = recordingEngine();
    playbackOf(engine, state({ currentStep: 1 }), { continueAcrossTraces: true }).step();
    expect(calls).toEqual(['step']);
  });

  it('carries on into the next trace once this one has played through', () => {
    const { engine, calls } = recordingEngine();
    const playback = playbackOf(engine, state({ status: 'done', currentStep: 3 }), {
      continueAcrossTraces: true,
    });
    expect(playback.continuesToNext).toBe(true);
    expect(playback.nextTrace?.packetId).toBe('b');
    playback.step();
    expect(calls).toEqual(['selectTrace:b', 'step']);
  });

  it.each([
    ['without continuing across traces', 'a', false],
    ['on the last trace', 'b', true],
  ] as const)('stays on a finished trace %s', (_name, currentTraceId, continueAcrossTraces) => {
    const { engine, calls } = recordingEngine();
    const playback = playbackOf(engine, state({ status: 'done', currentTraceId }), {
      continueAcrossTraces,
    });
    expect(playback.continuesToNext).toBe(false);
    playback.step();
    expect(calls).toEqual(['step']);
  });
});

describe('playback — jumping and the keys', () => {
  it.each([
    ['inside the trace', 2, 'selectHop:2'],
    ['before the start', -3, 'selectHop:0'],
    ['past the end', 9, 'selectHop:3'],
  ] as const)('jumps %s, clamped', (_name, step, expected) => {
    const { engine, calls } = recordingEngine();
    playbackOf(engine, state()).jump(step);
    expect(calls).toEqual([expected]);
  });

  it('does not jump without a trace', () => {
    const { engine, calls } = recordingEngine();
    playbackOf(engine, state({ currentTraceId: null })).jump(1);
    expect(calls).toEqual([]);
  });

  it.each([
    ['stepForward 1 from hop 1', 1, 'stepForward', 1, 'selectHop:2'],
    ['stepForward 5 from hop 1', 1, 'stepForward', 5, 'selectHop:3'],
    ['stepBackward 1 from hop 1', 1, 'stepBackward', 1, 'selectHop:0'],
    ['stepBackward 5 from hop 2', 2, 'stepBackward', 5, 'selectHop:0'],
    ['stepForward 1 before anything is shown', -1, 'stepForward', 1, 'selectHop:1'],
  ] as const)('%s', (_name, currentStep, key, steps, expected) => {
    const { engine, calls } = recordingEngine();
    playbackOf(engine, state({ currentStep })).keys[key](steps);
    expect(calls).toEqual([expected]);
  });

  it('jumps to the first and last hop', () => {
    const { engine, calls } = recordingEngine();
    const { keys } = playbackOf(engine, state({ currentStep: 1 }));
    keys.jumpStart();
    keys.jumpEnd();
    expect(calls).toEqual(['selectHop:0', 'selectHop:3']);
  });

  it('plays and pauses from the Space key', () => {
    const { engine, calls } = recordingEngine();
    playbackOf(engine, state({ status: 'running' })).keys.playPause();
    expect(calls).toEqual(['pause']);
  });
});

describe('playback — reading the trace', () => {
  it('reads where the trace is', () => {
    const playback = playbackOf(recordingEngine().engine, state({ currentTraceId: 'b' }));
    expect(playback.traceIndex).toBe(1);
    expect(playback.totalHops).toBe(3);
    expect(playback.scrubIndex).toBe(0);
  });

  it('looks the engine up at call time, so a replaced method is the one called', () => {
    const { engine, calls } = recordingEngine();
    const playback = playbackOf(engine, state());
    engine.play = () => calls.push('replaced play');
    playback.play();
    expect(calls).toEqual(['replaced play']);
  });
});
