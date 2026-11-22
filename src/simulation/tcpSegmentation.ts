/**
 * A transfer over an established TCP connection, numbered as real TCP numbers
 * it (REQ-417, RFC 9293 §3.4): a data segment's seq is the sender's ISN + 1
 * plus the bytes it sent before on the connection, and its ack is the next
 * byte it expects from the peer. The receiver answers with pure ACK segments.
 *
 * ACK policy, deterministic: the receiver acknowledges every second segment it
 * takes in order (RFC 5681 §4.2: at least every second full-sized segment),
 * the segment that ends the transfer (the RFC 1122 §4.2.3.2 delayed-ACK timer,
 * which would fire before anything else is sent), and at once any segment that
 * arrives after a lost one, repeating the ack for the byte still missing.
 * PSH is set on the segment that ends the transfer only.
 *
 * Out of scope: retransmission, congestion and receive windows that change
 * (the window field is the receive buffer, always free), and piggybacking an
 * ACK on data. The connection the engine keeps is not advanced, so its FIN
 * does not count the bytes sent here.
 *
 * Loaded by DataTransferController only while a connection is open, so it
 * stays out of the worker's eager bundle.
 */
import type { FailureState } from '../types/failure';
import type { InFlightPacket, TcpSegment } from '../types/packets';
import type { TcpConnection } from '../types/tcp';

/** What the stream needs of the engine: its open connections, and a way to send. */
export interface TcpStreamEngine {
  getTcpConnections?(): readonly TcpConnection[];
  send(packet: InFlightPacket, failureState?: FailureState): Promise<void>;
}

/** Bytes one end has sent on a connection, and how many of them the other end has in order. */
interface Direction {
  sent: number;
  received: number;
}

interface Stream {
  readonly client: Direction;
  readonly server: Direction;
}

export interface TcpStream {
  /** Numbers a data segment that ends at character `end`, cut at `maxBytes`, number `index` from 0. */
  stamp(packet: InFlightPacket, end: number, maxBytes: number, index: number): InFlightPacket;
  /** After the segment last stamped: whether it arrived, and the ACK it calls for. */
  ack(delivered: boolean): Promise<void>;
}

/** Per engine: the streams of its connections that carried a transfer. */
const owners = new WeakMap<object, Map<string, Stream>>();

const WINDOW_FIELD_MAX = 0xffff;
const PLACEHOLDER_MAC = '00:00:00:00:00:00';
const textEncoder = new TextEncoder();

function windowField(buffer = WINDOW_FIELD_MAX, shift = 0): number {
  return Math.min(WINDOW_FIELD_MAX, buffer >> shift);
}

function segmentOf(packet: InFlightPacket): TcpSegment {
  return packet.frame.payload.payload as TcpSegment;
}

/**
 * The stream a transfer from `srcNodeId` to `dstNodeId` on the given ports
 * belongs to, or null when it matches no established connection.
 */
export function openTcpStream(
  engine: TcpStreamEngine,
  srcNodeId: string,
  dstNodeId: string,
  ports: { readonly srcPort?: number | undefined; readonly dstPort?: number | undefined },
  payload: string,
  chunkEnd: (payload: string, from: number, maxBytes: number) => number,
  failureState: FailureState | undefined,
): TcpStream | null {
  const { srcPort, dstPort } = ports;
  const connections = engine.getTcpConnections?.() ?? [];
  let fromClient = true;
  const connection = connections.find((candidate) => {
    if (candidate.state !== 'ESTABLISHED') return false;
    if (
      candidate.srcNodeId === srcNodeId &&
      candidate.dstNodeId === dstNodeId &&
      candidate.srcPort === srcPort &&
      candidate.dstPort === dstPort
    ) {
      fromClient = true;
      return true;
    }
    fromClient = false;
    return (
      candidate.srcNodeId === dstNodeId &&
      candidate.dstNodeId === srcNodeId &&
      candidate.dstPort === srcPort &&
      (candidate.srcPort === dstPort || candidate.peerSeenByServer?.port === dstPort)
    );
  });
  if (!connection) return null;

  // A connection closed and opened again on the same ports is a new one.
  const keyOf = (candidate: TcpConnection) => `${candidate.id}@${candidate.createdAt}`;
  const streams = owners.get(engine) ?? new Map<string, Stream>();
  owners.set(engine, streams);
  const open = new Set(connections.map(keyOf));
  for (const key of streams.keys()) if (!open.has(key)) streams.delete(key);
  const key = keyOf(connection);
  const stream = streams.get(key) ?? {
    client: { sent: 0, received: 0 },
    server: { sent: 0, received: 0 },
  };
  streams.set(key, stream);

  const sender = fromClient ? stream.client : stream.server;
  const peer = fromClient ? stream.server : stream.client;
  const sendBase = fromClient ? connection.localSeq : connection.remoteSeq;
  const peerBase = fromClient ? connection.remoteSeq : connection.localSeq;
  const negotiated = connection.negotiated;
  const senderWindow = fromClient
    ? windowField(connection.clientReceiveBuffer, negotiated?.clientWindowShift)
    : windowField(connection.serverReceiveBuffer, negotiated?.serverWindowShift);
  const receiverWindow = fromClient
    ? windowField(connection.serverReceiveBuffer, negotiated?.serverWindowShift)
    : windowField(connection.clientReceiveBuffer, negotiated?.clientWindowShift);

  let total = 0;
  let totalAt = Number.NaN;
  let unacked = 0;
  let last: { packet: InFlightPacket; bytes: number; final: boolean } | null = null;

  return {
    stamp(packet, end, maxBytes, index) {
      // How many segments the transfer takes at this size; counted again only when the size changes.
      if (maxBytes !== totalAt) {
        totalAt = maxBytes;
        total = index + 1;
        for (let from = end; from < payload.length; total++)
          from = chunkEnd(payload, from, maxBytes);
      }
      const segment = segmentOf(packet);
      const bytes =
        segment.payload.layer === 'raw' ? textEncoder.encode(segment.payload.data).length : 0;
      const final = end >= payload.length;
      const stamped: InFlightPacket = {
        ...packet,
        label: `TCP ${final ? 'PSH/ACK' : 'ACK'} · ${bytes} B (${index + 1}/${total})`,
        frame: {
          ...packet.frame,
          payload: {
            ...packet.frame.payload,
            payload: {
              ...segment,
              seq: (sendBase + sender.sent) >>> 0,
              ack: (peerBase + peer.received) >>> 0,
              flags: { ...segment.flags, psh: final },
              windowSize: senderWindow,
            },
          },
        },
      };
      last = { packet: stamped, bytes, final };
      return stamped;
    },

    async ack(delivered) {
      if (!last) return;
      const { packet, bytes, final } = last;
      last = null;
      const inOrder = sender.received === sender.sent;
      sender.sent += bytes;
      if (!delivered) return;
      if (inOrder) sender.received = sender.sent;
      unacked += 1;
      if (inOrder && unacked < 2 && !final) return;
      unacked = 0;

      const ip = packet.frame.payload;
      const segment = segmentOf(packet);
      const ackNumber = (sendBase + sender.received) >>> 0;
      await engine.send(
        {
          id: `${packet.id}-ack`,
          label: `TCP ACK · ack=${ackNumber}`,
          srcNodeId: packet.dstNodeId,
          dstNodeId: packet.srcNodeId,
          currentDeviceId: packet.dstNodeId,
          ingressPortId: '',
          path: [],
          timestamp: Date.now(),
          frame: {
            ...packet.frame,
            // As for the handshake's segments: the forwarding loop fills in the real addresses.
            srcMac: PLACEHOLDER_MAC,
            dstMac: PLACEHOLDER_MAC,
            payload: {
              ...ip,
              srcIp: ip.dstIp,
              dstIp: ip.srcIp,
              payload: {
                layer: 'L4',
                srcPort: segment.dstPort,
                dstPort: segment.srcPort,
                seq: (peerBase + peer.sent) >>> 0,
                ack: ackNumber,
                flags: { syn: false, ack: true, fin: false, rst: false, psh: false, urg: false },
                windowSize: receiverWindow,
                payload: { layer: 'raw', data: '' },
              },
            },
          },
        },
        failureState,
      );
    },
  };
}
