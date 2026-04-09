import { describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { SessionTracker } from './SessionTracker';
import type { InFlightPacket } from '../types/packets';
import type { PacketTrace } from '../types/simulation';

function makePacket(
  overrides: Partial<InFlightPacket> = {},
): InFlightPacket {
  return {
    id: 'pkt-1',
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: '192.168.1.10',
        dstIp: '10.0.0.10',
        ttl: 64,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort: 12345,
          dstPort: 80,
          seq: 0,
          ack: 0,
          flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
          payload: { layer: 'raw', data: 'GET /api/data HTTP/1.1' },
        },
      },
    },
    currentDeviceId: 'client-1',
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeTrace(packetId = 'pkt-1'): PacketTrace {
  return {
    packetId,
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    hops: [],
    status: 'delivered',
  };
}

function setup() {
  const hookEngine = new HookEngine();
  const tracker = new SessionTracker(hookEngine);

  tracker.startSession('session-1', {
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    protocol: 'HTTP',
    requestType: 'GET /api/data',
  });

  return { hookEngine, tracker };
}

describe('SessionTracker.startSession', () => {
  it('creates a session in pending state', () => {
    const tracker = new SessionTracker(new HookEngine());

    tracker.startSession('session-1', {
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
      protocol: 'HTTP',
      requestType: 'GET /api/data',
    });

    expect(tracker.getSessions()).toHaveLength(1);
    expect(tracker.getSession('session-1')).toMatchObject({
      sessionId: 'session-1',
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
      status: 'pending',
      protocol: 'HTTP',
      requestType: 'GET /api/data',
    });
  });

  it('is idempotent for duplicate ids', () => {
    const tracker = new SessionTracker(new HookEngine());

    tracker.startSession('session-1', {
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
    });
    tracker.startSession('session-1', {
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
    });

    expect(tracker.getSessions()).toHaveLength(1);
  });

  it('notifies listeners when a new session is created', () => {
    const tracker = new SessionTracker(new HookEngine());
    const listener = vi.fn();

    tracker.subscribe(listener);
    tracker.startSession('session-1', {
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
    });

    expect(listener).toHaveBeenCalledOnce();
  });
});

describe('SessionTracker hook correlation - request leg', () => {
  it('records request:routing on packet:create', async () => {
    const { hookEngine, tracker } = setup();

    await hookEngine.emit('packet:create', {
      packet: makePacket({ sessionId: 'session-1' }),
      sourceNodeId: 'client-1',
    });

    expect(tracker.getSession('session-1')?.events[0]?.phase).toBe('request:routing');
  });

  it('records request:routing only once', async () => {
    const { hookEngine, tracker } = setup();
    const packet = makePacket({ sessionId: 'session-1' });

    await hookEngine.emit('packet:create', { packet, sourceNodeId: 'client-1' });
    await hookEngine.emit('packet:create', { packet, sourceNodeId: 'router-1' });

    const events = tracker.getSession('session-1')?.events ?? [];
    expect(events.filter((event) => event.phase === 'request:routing')).toHaveLength(1);
  });

  it('records request:delivered and keeps the session pending', async () => {
    const { hookEngine, tracker } = setup();

    await hookEngine.emit('packet:deliver', {
      packet: makePacket({ sessionId: 'session-1' }),
      destinationNodeId: 'server-1',
    });

    expect(tracker.getSession('session-1')?.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ phase: 'request:delivered' }),
      ]),
    );
    expect(tracker.getSession('session-1')?.status).toBe('pending');
  });

  it('ignores packet hooks without sessionId', async () => {
    const { hookEngine, tracker } = setup();

    await hookEngine.emit('packet:create', {
      packet: makePacket(),
      sourceNodeId: 'client-1',
    });
    await hookEngine.emit('packet:deliver', {
      packet: makePacket(),
      destinationNodeId: 'server-1',
    });

    expect(tracker.getSession('session-1')?.events).toEqual([]);
  });
});

describe('SessionTracker hook correlation - response leg', () => {
  it('records response:routing on response packet:create', async () => {
    const { hookEngine, tracker } = setup();

    await hookEngine.emit('packet:create', {
      packet: makePacket({
        sessionId: 'session-1',
        srcNodeId: 'server-1',
        dstNodeId: 'client-1',
        currentDeviceId: 'server-1',
      }),
      sourceNodeId: 'server-1',
    });

    expect(tracker.getSession('session-1')?.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ phase: 'response:routing' }),
      ]),
    );
  });

  it('marks the session successful when the response is delivered', async () => {
    const { hookEngine, tracker } = setup();

    await hookEngine.emit('packet:deliver', {
      packet: makePacket({
        sessionId: 'session-1',
        srcNodeId: 'server-1',
        dstNodeId: 'client-1',
        currentDeviceId: 'server-1',
      }),
      destinationNodeId: 'client-1',
    });

    expect(tracker.getSession('session-1')).toMatchObject({
      status: 'success',
      completedAt: expect.any(Number),
    });
  });
});

describe('SessionTracker hook correlation - drop', () => {
  it('marks the session failed on packet:drop', async () => {
    const { hookEngine, tracker } = setup();

    await hookEngine.emit('packet:drop', {
      packet: makePacket({ sessionId: 'session-1' }),
      nodeId: 'router-2',
      reason: 'node-down',
    });

    expect(tracker.getSession('session-1')).toMatchObject({
      status: 'failed',
      completedAt: expect.any(Number),
      error: {
        reason: 'node-down',
        nodeId: 'router-2',
      },
    });
  });

  it('does not overwrite the first drop outcome', async () => {
    const { hookEngine, tracker } = setup();

    await hookEngine.emit('packet:drop', {
      packet: makePacket({ sessionId: 'session-1' }),
      nodeId: 'router-2',
      reason: 'node-down',
    });
    await hookEngine.emit('packet:drop', {
      packet: makePacket({ sessionId: 'session-1' }),
      nodeId: 'router-3',
      reason: 'ttl-exceeded',
    });

    expect(tracker.getSession('session-1')?.error).toEqual({
      reason: 'node-down',
      nodeId: 'router-2',
    });
    expect(
      tracker.getSession('session-1')?.events.filter((event) => event.phase === 'drop'),
    ).toHaveLength(1);
  });
});

describe('SessionTracker fetch hooks', () => {
  it('records request:initiated on fetch:intercept', async () => {
    const { hookEngine, tracker } = setup();

    await hookEngine.emit('fetch:intercept', {
      request: new Request('https://example.test/api/data'),
      nodeId: 'client-1',
      sessionId: 'session-1',
    });

    expect(tracker.getSession('session-1')?.events[0]?.phase).toBe('request:initiated');
  });

  it('records response:generated on fetch:respond', async () => {
    const { hookEngine, tracker } = setup();

    await hookEngine.emit('fetch:respond', {
      request: new Request('https://example.test/api/data'),
      response: new Response(JSON.stringify({ ok: true }), { status: 200 }),
      nodeId: 'server-1',
      sessionId: 'session-1',
    });

    expect(tracker.getSession('session-1')?.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          phase: 'response:generated',
          meta: { status: 200 },
        }),
      ]),
    );
  });
});

describe('SessionTracker.attachTrace', () => {
  it('attaches a request trace', () => {
    const { tracker } = setup();
    const trace = makeTrace('pkt-request');

    tracker.attachTrace('session-1', trace, 'request');

    expect(tracker.getSession('session-1')?.requestTrace).toBe(trace);
  });

  it('attaches a response trace', () => {
    const { tracker } = setup();
    const trace = makeTrace('pkt-response');

    tracker.attachTrace('session-1', trace, 'response');

    expect(tracker.getSession('session-1')?.responseTrace).toBe(trace);
  });

  it('notifies listeners when a trace is attached', () => {
    const { tracker } = setup();
    const listener = vi.fn();

    tracker.subscribe(listener);
    tracker.attachTrace('session-1', makeTrace('pkt-request'), 'request');

    expect(listener).toHaveBeenCalledOnce();
  });
});

describe('SessionTracker.clear', () => {
  it('removes all sessions', () => {
    const tracker = new SessionTracker(new HookEngine());

    tracker.startSession('session-1', { srcNodeId: 'client-1', dstNodeId: 'server-1' });
    tracker.startSession('session-2', { srcNodeId: 'client-2', dstNodeId: 'server-2' });
    tracker.startSession('session-3', { srcNodeId: 'client-3', dstNodeId: 'server-3' });

    tracker.clear();

    expect(tracker.getSessions()).toEqual([]);
  });

  it('notifies listeners when sessions are cleared', () => {
    const { tracker } = setup();
    const listener = vi.fn();

    tracker.subscribe(listener);
    tracker.clear();

    expect(listener).toHaveBeenCalledOnce();
  });
});
