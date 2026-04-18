import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InFlightPacket } from '../../types/packets';
import {
  buildAckPacket,
  buildFinPacket,
  buildRstPacket,
  buildSynAckPacket,
  buildSynPacket,
  type TcpPacketOptions,
} from './tcpPacketBuilder';

function makeOptions(overrides: Partial<TcpPacketOptions> = {}): TcpPacketOptions {
  return {
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    srcIp: '10.0.0.10',
    dstIp: '203.0.113.10',
    srcPort: 12345,
    dstPort: 80,
    seq: 1000,
    ack: 5000,
    ...overrides,
  };
}

function expectDfEnabled(packet: InFlightPacket) {
  expect(packet.frame.payload.flags).toEqual({ df: true, mf: false });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('tcpPacketBuilder — DF default', () => {
  it('buildSynPacket sets IP flags.df = true', () => {
    expectDfEnabled(buildSynPacket(makeOptions()));
  });

  it('buildSynAckPacket sets IP flags.df = true', () => {
    expectDfEnabled(buildSynAckPacket(makeOptions()));
  });

  it('buildAckPacket sets IP flags.df = true', () => {
    expectDfEnabled(buildAckPacket(makeOptions()));
  });

  it('buildFinPacket sets IP flags.df = true', () => {
    expectDfEnabled(buildFinPacket(makeOptions()));
  });

  it('buildRstPacket sets IP flags.df = true', () => {
    expectDfEnabled(buildRstPacket(makeOptions()));
  });

  it('IP flags.mf = false on every TCP packet', () => {
    const packets = [
      buildSynPacket(makeOptions()),
      buildSynAckPacket(makeOptions()),
      buildAckPacket(makeOptions()),
      buildFinPacket(makeOptions()),
      buildRstPacket(makeOptions()),
    ];

    expect(packets.every((packet) => packet.frame.payload.flags?.mf === false)).toBe(true);
  });

  it('packet shape is otherwise identical to pre-T03 fields', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234567890);

    const packet = buildSynAckPacket(makeOptions({ seq: 3210, ack: 6543 }));

    expect(packet).toMatchObject({
      id: 'tcp-syn-ack-f14ce56e',
      timestamp: 1234567890,
      frame: {
        payload: {
          srcIp: '10.0.0.10',
          dstIp: '203.0.113.10',
          ttl: 64,
          protocol: 6,
          flags: { df: true, mf: false },
          payload: {
            seq: 3210,
            ack: 6543,
            flags: {
              syn: true,
              ack: true,
              fin: false,
              rst: false,
              psh: false,
              urg: false,
            },
          },
        },
      },
    });
  });
});
