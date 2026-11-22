/**
 * REQ-417 — a transfer over an open TCP connection looks like real TCP: its
 * segments carry the connection's sequence and acknowledgment numbers, and the
 * receiver acknowledges them with pure ACK segments (TC-2220..TC-2228), and names them on the timeline. TC-2229: a
 * payload is cut into chunks in one pass.
 */
import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../cli/runtime';
import { HookEngine } from '../hooks/HookEngine';
import { generateISN } from '../layers/l4-transport/tcpPacketBuilder';
import { runCommand } from '../terminal/terminalCommands';
import { TERMINAL_WEB_SITES, terminalNetwork } from '../terminal/terminalNetwork';
import type { InFlightPacket, TcpSegment } from '../types/packets';
import type { TcpConnection } from '../types/tcp';
import { DataTransferController } from './DataTransferController';
import { openTcpStream } from './tcpSegmentation';
import { MainThreadEngine } from './worker/MainThreadEngine';

const CLIENT_PORT = 50000;
const CLIENT_ISN = generateISN('client', CLIENT_PORT);
const SERVER_ISN = generateISN('www', 80);

function setUp() {
  return new MainThreadEngine(enrichTopology(terminalNetwork()), new HookEngine());
}

interface Segment {
  readonly from: string;
  readonly seq: number;
  readonly ack: number;
  readonly bytes: number;
  readonly psh: boolean;
  readonly flagAck: boolean;
  readonly syn: boolean;
  readonly fin: boolean;
  readonly window: number | undefined;
  readonly status: string;
}

/** The TCP segments recorded after `from`, as their first hop shows them. */
function segmentsSince(engine: MainThreadEngine, from: number): Segment[] {
  return engine
    .getState()
    .traces.slice(from)
    .flatMap((trace) => {
      engine.selectTrace(trace.packetId);
      engine.selectHop(0);
      const packet = engine.getState().selectedPacket;
      const l4 = packet?.frame.payload.payload as TcpSegment | undefined;
      if (!packet || packet.frame.payload.protocol !== 6 || !l4 || !('seq' in l4)) return [];
      const data = l4.payload.layer === 'raw' ? l4.payload.data : '';
      return [
        {
          from: packet.srcNodeId,
          seq: l4.seq,
          ack: l4.ack,
          bytes: new TextEncoder().encode(data).length,
          psh: l4.flags.psh,
          flagAck: l4.flags.ack,
          syn: l4.flags.syn,
          fin: l4.flags.fin,
          window: l4.windowSize,
          status: trace.status,
        },
      ];
    });
}

async function connected() {
  const engine = setUp();
  const handshake = await engine.tcpConnect('client', 'www', CLIENT_PORT, 80);
  expect(handshake.success).toBe(true);
  return { engine, connection: handshake.connection as TcpConnection };
}

const request = (engine: MainThreadEngine, bytes: number) =>
  engine.sendTransfer('client', 'www', 'q'.repeat(bytes), {
    srcPort: CLIENT_PORT,
    dstPort: 80,
    chunkDelay: 0,
  });
const response = (engine: MainThreadEngine, bytes: number) =>
  engine.sendTransfer('www', 'client', 'r'.repeat(bytes), {
    srcPort: 80,
    dstPort: CLIENT_PORT,
    chunkDelay: 0,
  });

describe('TC-2220: data segments carry the connection’s sequence numbers', () => {
  it('seq is the client’s ISN + 1 + byte offset and ack is the server’s ISN + 1', async () => {
    const { engine } = await connected();
    const start = engine.getState().traces.length;
    await request(engine, 3000);
    const data = segmentsSince(engine, start).filter((s) => s.bytes > 0);
    expect(data.map((s) => s.from)).toEqual(['client', 'client', 'client']);
    expect(data.map((s) => s.seq)).toEqual([CLIENT_ISN + 1, CLIENT_ISN + 1401, CLIENT_ISN + 2801]);
    expect(data.map((s) => s.ack)).toEqual([SERVER_ISN + 1, SERVER_ISN + 1, SERVER_ISN + 1]);
    expect(data.map((s) => s.bytes)).toEqual([1400, 1400, 200]);
    expect(data.every((s) => s.flagAck && !s.syn && !s.fin)).toBe(true);
    // PSH is set on the segment that ends the transfer only.
    expect(data.map((s) => s.psh)).toEqual([false, false, true]);
  });
});

describe('TC-2221: the receiver acknowledges every second segment and the last one', () => {
  it('shows data, data, ACK, data, ACK with ack = the next byte expected', async () => {
    const { engine } = await connected();
    const start = engine.getState().traces.length;
    const transfer = await request(engine, 3000);
    // The transfer's own record counts its data segments only.
    expect(transfer.expectedChunks).toBe(3);
    expect(transfer.status).toBe('delivered');
    const timeline = segmentsSince(engine, start);
    expect(timeline.map((s) => (s.bytes > 0 ? 'data' : 'ACK'))).toEqual([
      'data',
      'data',
      'ACK',
      'data',
      'ACK',
    ]);
    const acks = timeline.filter((s) => s.bytes === 0);
    expect(acks.map((s) => s.from)).toEqual(['www', 'www']);
    expect(acks.map((s) => s.ack)).toEqual([CLIENT_ISN + 2801, CLIENT_ISN + 3001]);
    expect(acks.map((s) => s.seq)).toEqual([SERVER_ISN + 1, SERVER_ISN + 1]);
    expect(acks.every((s) => s.flagAck && !s.psh && !s.syn && !s.fin)).toBe(true);
    expect(acks.map((s) => s.window)).toEqual([65535, 65535]);
    expect(timeline.every((s) => s.status === 'delivered')).toBe(true);
  });

  it('acknowledges a one-segment transfer once', async () => {
    const { engine } = await connected();
    const start = engine.getState().traces.length;
    await request(engine, 120);
    const timeline = segmentsSince(engine, start);
    expect(timeline.map((s) => [s.from, s.bytes])).toEqual([
      ['client', 120],
      ['www', 0],
    ]);
    expect(timeline[1]?.ack).toBe(CLIENT_ISN + 121);
  });
});

describe('TC-2222: the response continues from the right numbers the other way', () => {
  it('seq is the server’s ISN + 1 + offset and ack covers the whole request', async () => {
    const { engine } = await connected();
    await request(engine, 150);
    const start = engine.getState().traces.length;
    await response(engine, 2000);
    const timeline = segmentsSince(engine, start);
    expect(timeline.map((s) => [s.from, s.bytes])).toEqual([
      ['www', 1400],
      ['www', 600],
      ['client', 0],
    ]);
    expect(timeline.map((s) => s.seq)).toEqual([
      SERVER_ISN + 1,
      SERVER_ISN + 1401,
      CLIENT_ISN + 151,
    ]);
    expect(timeline.map((s) => s.ack)).toEqual([
      CLIENT_ISN + 151,
      CLIENT_ISN + 151,
      SERVER_ISN + 2001,
    ]);
  });
});

describe('TC-2223: the timeline names each segment', () => {
  it('data segments show flags, bytes and i of n; pure ACKs show the number they acknowledge', async () => {
    const { engine } = await connected();
    const start = engine.getState().traces.length;
    await request(engine, 3000);
    expect(
      engine
        .getState()
        .traces.slice(start)
        .map((trace) => trace.label),
    ).toEqual([
      'TCP ACK · 1400 B (1/3)',
      'TCP ACK · 1400 B (2/3)',
      `TCP ACK · ack=${CLIENT_ISN + 2801}`,
      'TCP PSH/ACK · 200 B (3/3)',
      `TCP ACK · ack=${CLIENT_ISN + 3001}`,
    ]);
  });
});

describe('TC-2224: a transfer outside any connection keeps its old numbering', () => {
  it('without a connection: seq counts from 0, ack is 0, and nothing answers', async () => {
    const engine = setUp();
    const start = engine.getState().traces.length;
    await request(engine, 3000);
    const timeline = segmentsSince(engine, start);
    expect(timeline.map((s) => [s.seq, s.ack, s.bytes, s.psh])).toEqual([
      [0, 0, 1400, true],
      [1400, 0, 1400, true],
      [2800, 0, 200, true],
    ]);
  });

  it('with a connection on other ports, the transfer is not part of it', async () => {
    const { engine } = await connected();
    const start = engine.getState().traces.length;
    await engine.sendTransfer('client', 'www', 'q'.repeat(10), {
      srcPort: CLIENT_PORT + 1,
      dstPort: 80,
      chunkDelay: 0,
    });
    expect(segmentsSince(engine, start).map((s) => [s.seq, s.ack, s.bytes])).toEqual([[0, 0, 10]]);
  });
});

describe('TC-2225: a second request on the same connection carries on', () => {
  it('its first segment starts where the first request ended', async () => {
    const { engine } = await connected();
    await request(engine, 100);
    await response(engine, 40);
    const start = engine.getState().traces.length;
    await request(engine, 60);
    const timeline = segmentsSince(engine, start);
    expect(timeline.map((s) => [s.from, s.seq, s.ack, s.bytes])).toEqual([
      ['client', CLIENT_ISN + 101, SERVER_ISN + 41, 60],
      ['www', SERVER_ISN + 41, CLIENT_ISN + 161, 0],
    ]);
  });
});

describe('TC-2226: a new connection on the same ports starts again from its ISN', () => {
  it('after a disconnect, nothing carries over', async () => {
    const { engine, connection } = await connected();
    await request(engine, 100);
    await engine.tcpDisconnect(connection.id);
    await engine.tcpConnect('client', 'www', CLIENT_PORT, 80);
    const start = engine.getState().traces.length;
    await request(engine, 10);
    expect(segmentsSince(engine, start).map((s) => [s.seq, s.ack])).toEqual([
      [CLIENT_ISN + 1, SERVER_ISN + 1],
      [SERVER_ISN + 1, CLIENT_ISN + 11],
    ]);
  });
});

describe('TC-2227: curl’s timeline reads like a capture', () => {
  it('handshake, request, ACK, response, ACK, then the close', async () => {
    const engine = setUp();
    const start = engine.getState().traces.length;
    const result = await runCommand('curl http://www/', {
      engine,
      nodeId: 'client',
      web: TERMINAL_WEB_SITES,
    });
    expect(result.lines.join('\n')).toContain('<h1>Hello from www</h1>');
    const timeline = segmentsSince(engine, start);
    // Every segment reaches the other end: the client's frames go to its router, not to the laptop.
    expect(timeline.every((s) => s.status === 'delivered')).toBe(true);
    const kinds = timeline.map((s) =>
      s.syn ? 'SYN' : s.fin ? 'FIN' : s.bytes > 0 ? `data:${s.from}` : `ACK:${s.from}`,
    );
    expect(kinds.slice(0, 7)).toEqual([
      'SYN',
      'SYN',
      'ACK:client',
      'data:client',
      'ACK:www',
      'data:www',
      'ACK:client',
    ]);
    expect(kinds.slice(7, 8)).toEqual(['FIN']);
  });
});

describe('TC-2228: after a segment is lost, the receiver repeats its last ACK', () => {
  const connection: TcpConnection = {
    id: 'c',
    srcNodeId: 'a',
    dstNodeId: 'b',
    srcIp: '10.0.0.1',
    srcPort: 1000,
    dstIp: '10.0.0.2',
    dstPort: 80,
    state: 'ESTABLISHED',
    localSeq: 101,
    localAck: 501,
    remoteSeq: 501,
    createdAt: 0,
  };
  const dataPacket = (): InFlightPacket => ({
    id: 'p',
    srcNodeId: 'a',
    dstNodeId: 'b',
    currentDeviceId: 'a',
    ingressPortId: '',
    path: [],
    timestamp: 0,
    frame: {
      layer: 'L2',
      srcMac: '02:00:00:00:00:01',
      dstMac: '02:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: '10.0.0.1',
        dstIp: '10.0.0.2',
        ttl: 64,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort: 1000,
          dstPort: 80,
          seq: 0,
          ack: 0,
          flags: { syn: false, ack: true, fin: false, rst: false, psh: true, urg: false },
          payload: { layer: 'raw', data: 'x'.repeat(10) },
        },
      },
    },
  });

  it('a delivered segment after a lost one gets an ACK for the byte still missing', async () => {
    const sent: InFlightPacket[] = [];
    const payload = 'x'.repeat(30);
    const engine = {
      getTcpConnections: () => [connection],
      send: async (packet: InFlightPacket) => {
        sent.push(packet);
      },
    };
    const stream = openTcpStream(
      engine,
      'a',
      'b',
      { srcPort: 1000, dstPort: 80 },
      payload,
      (text, from, maxBytes) => Math.min(text.length, from + maxBytes),
      undefined,
    );
    expect(stream).not.toBeNull();
    const seqs: number[] = [];
    for (const [index, delivered] of [false, true].entries()) {
      const packet = stream!.stamp(dataPacket(), (index + 1) * 10, 10, index);
      seqs.push((packet.frame.payload.payload as TcpSegment).seq);
      await stream!.ack(delivered);
    }
    expect(seqs).toEqual([101, 111]);
    expect(sent).toHaveLength(1);
    const ack = sent[0]!;
    const l4 = ack.frame.payload.payload as TcpSegment;
    expect([ack.srcNodeId, ack.dstNodeId]).toEqual(['b', 'a']);
    expect([ack.frame.payload.srcIp, ack.frame.payload.dstIp]).toEqual(['10.0.0.2', '10.0.0.1']);
    expect([l4.srcPort, l4.dstPort, l4.seq, l4.ack]).toEqual([80, 1000, 501, 101]);
  });
});

/** Today's chunking, kept here as the reference the single pass must agree with. */
function referenceChunks(payload: string, maxBytes: number): string[] {
  const chunks: string[] = [];
  let current = '';
  let bytes = 0;
  for (const character of payload) {
    const size = new TextEncoder().encode(character).length;
    if (bytes > 0 && bytes + size > maxBytes) {
      chunks.push(current);
      current = '';
      bytes = 0;
    }
    current += character;
    bytes += size;
    if (bytes > maxBytes) {
      chunks.push(current);
      current = '';
      bytes = 0;
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

describe('TC-2229: a 1 MB payload is cut into the same chunks as before', () => {
  it('never splits a character, and the chunks put back together are the payload', async () => {
    const traces: { packetId: string; status: string }[] = [];
    const controller = new DataTransferController({
      engine: {
        getRuntimeNodeIp: (nodeId) => (nodeId === 'a' ? '10.0.0.1' : '10.0.0.2'),
        getState: () => ({ traces: traces as never }),
        send: async (packet) => {
          traces.push({ packetId: packet.id, status: 'delivered' });
        },
      },
      pipeline: {
        findNode: () => null,
        getEffectiveNodeIp: () => undefined,
        getRouteTable: () => [],
        getNeighbors: () => [],
      },
    });
    // 1, 2, 3 and 4 bytes a character, so chunk ends fall on every kind of character.
    const payload = 'aé漢😀'.repeat(Math.ceil(1_000_000 / 10)).slice(0, 1_000_000);
    const transfer = await controller.startTransfer('a', 'b', payload, { chunkDelay: 0 });
    const chunks = controller.getChunks(transfer.messageId);
    const expected = referenceChunks(payload, 1400);
    expect(chunks).toHaveLength(expected.length);
    expect(chunks.map((chunk) => chunk.data)).toEqual(expected);
    expect(chunks.map((chunk) => chunk.data).join('')).toBe(payload);
    expect(chunks.every((chunk) => chunk.totalChunks === expected.length)).toBe(true);
    expect(chunks.map((chunk) => chunk.sizeBytes)).toEqual(
      expected.map((data) => new TextEncoder().encode(data).length),
    );
    expect(controller.getReassembly(transfer.messageId)?.receivedChunks.size).toBe(expected.length);
    expect(transfer.status).toBe('delivered');
  });
});
