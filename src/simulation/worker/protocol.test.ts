import { describe, expect, it } from 'vitest';
import {
  isSimulationWorkerCommand,
  isSimulationWorkerEvent,
  isSimulationWorkerHookEvent,
  makeRequestId,
} from './protocol';

describe('simulation worker protocol validators', () => {
  it('accepts seed commands with topology, state, and play interval payloads', () => {
    expect(
      isSimulationWorkerCommand({
        type: 'seed',
        id: 'req-1',
        topology: { nodes: [], edges: [] },
        state: { status: 'idle', traces: [], currentStep: -1 },
        playIntervalMs: 100,
      }),
    ).toBe(true);
  });

  it('accepts stateless control commands', () => {
    expect(isSimulationWorkerCommand({ type: 'step', id: 'req-1' })).toBe(true);
    expect(isSimulationWorkerCommand({ type: 'reset', id: 'req-2' })).toBe(true);
    expect(isSimulationWorkerCommand({ type: 'clear', id: 'req-3' })).toBe(true);
    expect(isSimulationWorkerCommand({ type: 'dispose', id: 'req-4' })).toBe(true);
  });

  it('accepts state replacement commands', () => {
    expect(
      isSimulationWorkerCommand({
        type: 'setState',
        id: 'req-1',
        state: { status: 'paused', traces: [], currentStep: 3 },
      }),
    ).toBe(true);
  });

  it('accepts command-specific scalar payloads', () => {
    expect(isSimulationWorkerCommand({ type: 'selectTrace', id: 'req-1', packetId: 'pkt-1' })).toBe(
      true,
    );
    expect(isSimulationWorkerCommand({ type: 'selectHop', id: 'req-2', step: 2 })).toBe(true);
    expect(isSimulationWorkerCommand({ type: 'setPlayInterval', id: 'req-3', ms: 250 })).toBe(true);
    expect(isSimulationWorkerCommand({ type: 'setHighlightMode', id: 'req-4', mode: 'hop' })).toBe(
      true,
    );
  });

  it('accepts packet and service commands with structured payloads', () => {
    expect(isSimulationWorkerCommand({ type: 'send', id: 'req-1', packet: { id: 'pkt-1' } })).toBe(
      true,
    );
    expect(
      isSimulationWorkerCommand({ type: 'ping', id: 'req-2', srcNodeId: 'a', dstIp: 'b' }),
    ).toBe(true);
    expect(
      isSimulationWorkerCommand({
        type: 'simulateDns',
        id: 'req-3',
        clientNodeId: 'client',
        hostname: 'example.test',
      }),
    ).toBe(true);
  });

  it('rejects missing request ids', () => {
    expect(isSimulationWorkerCommand({ type: 'step' })).toBe(false);
    expect(isSimulationWorkerEvent({ type: 'result' })).toBe(false);
  });

  it('rejects unknown command and event types', () => {
    expect(isSimulationWorkerCommand({ type: 'unknown', id: 'req-1' })).toBe(false);
    expect(isSimulationWorkerEvent({ type: 'unknown', id: 'req-1' })).toBe(false);
  });

  it('rejects invalid scalar payloads', () => {
    expect(isSimulationWorkerCommand({ type: 'selectHop', id: 'req-1', step: '2' })).toBe(false);
    expect(isSimulationWorkerCommand({ type: 'setPlayInterval', id: 'req-2', ms: 0 })).toBe(false);
    expect(isSimulationWorkerCommand({ type: 'setHighlightMode', id: 'req-3', mode: 'wide' })).toBe(
      false,
    );
  });

  it('accepts state, result, error, and disposed events', () => {
    expect(isSimulationWorkerEvent({ type: 'ready', id: 'req-1' })).toBe(true);
    expect(
      isSimulationWorkerEvent({
        type: 'state',
        id: 'req-2',
        state: { status: 'idle', traces: [], currentStep: -1 },
        runtime: { runtimeNodeIps: {}, dhcpLeaseStates: {}, dnsCaches: {}, udpBindings: {} },
      }),
    ).toBe(true);
    expect(isSimulationWorkerEvent({ type: 'result', id: 'req-3', result: null })).toBe(true);
    expect(isSimulationWorkerEvent({ type: 'error', id: 'req-4', code: 'x', detail: 'bad' })).toBe(
      true,
    );
    expect(isSimulationWorkerEvent({ type: 'disposed', id: 'req-5' })).toBe(true);
  });

  it('accepts hook events with serializable hook point names', () => {
    expect(
      isSimulationWorkerHookEvent({
        type: 'hook',
        id: 'req-1',
        point: 'packet:create',
        context: { sourceNodeId: 'node', packet: { id: 'pkt' } },
      }),
    ).toBe(true);
  });

  it('generates monotonic request ids', () => {
    expect(makeRequestId()).toBe('req-1');
    expect(makeRequestId()).toBe('req-2');
  });
});
