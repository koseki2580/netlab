import { describe, expect, it } from 'vitest';
import { buildFinPacket } from '../layers/l4-transport/tcpPacketBuilder';
import { buildUdpPacket } from '../layers/l4-transport/udpPacketBuilder';
import { FlowCollector } from './FlowCollector';
import { NETFLOW_FIELD_IDS, NetflowExporter, TCP_FLAG_BITS } from './NetflowExporter';

describe('NetflowExporter', () => {
  it('exports an inactive UDP flow with DSCP encoded as ToS', () => {
    const collector = new FlowCollector();
    const exporter = new NetflowExporter('r1', { enabled: true, inactiveTimeoutMs: 10 }, collector);
    const packet = buildUdpPacket({
      srcNodeId: 'client',
      dstNodeId: 'server',
      srcIp: '10.0.0.10',
      dstIp: '203.0.113.10',
      srcPort: 12345,
      dstPort: 53,
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      packetId: 'udp-flow',
      timestamp: 0,
      payload: { layer: 'raw', data: 'dns' },
    });

    exporter.observe(
      { ...packet, frame: { ...packet.frame, payload: { ...packet.frame.payload, dscp: 46 } } },
      'eth0',
      'eth1',
      5,
    );
    exporter.tickStep(15);

    expect(collector.list()).toHaveLength(1);
    expect(collector.list()[0]).toMatchObject({
      kind: 'netflow',
      record: {
        samplerRouterId: 'r1',
        key: {
          srcIp: '10.0.0.10',
          dstIp: '203.0.113.10',
          srcPort: 12345,
          dstPort: 53,
          proto: 'udp',
          ingressIfId: 'eth0',
          egressIfId: 'eth1',
          tos: 184,
        },
        packets: 1,
        reason: 'inactive-timeout',
      },
    });
  });

  it('expires a TCP flow immediately when FIN is observed', () => {
    const collector = new FlowCollector();
    const exporter = new NetflowExporter('r1', { enabled: true }, collector);
    const packet = buildFinPacket({
      srcNodeId: 'client',
      dstNodeId: 'server',
      srcIp: '10.0.0.10',
      dstIp: '203.0.113.10',
      srcPort: 44300,
      dstPort: 443,
      seq: 1,
      ack: 1,
    });

    exporter.observe(packet, 'eth0', 'eth1', 1);
    exporter.tickStep(1);

    expect(collector.list()[0]).toMatchObject({
      kind: 'netflow',
      record: {
        packets: 1,
        reason: 'tcp-fin',
        tcpFlagsUnion: TCP_FLAG_BITS.ack | TCP_FLAG_BITS.fin,
      },
    });
  });

  it('keeps RFC 3954 information element ids stable', () => {
    expect(NETFLOW_FIELD_IDS).toEqual({
      IN_BYTES: 1,
      IN_PKTS: 2,
      PROTOCOL: 4,
      TOS: 5,
      TCP_FLAGS: 6,
      L4_SRC_PORT: 7,
      IPV4_SRC_ADDR: 8,
      INPUT_SNMP: 10,
      L4_DST_PORT: 11,
      IPV4_DST_ADDR: 12,
      OUTPUT_SNMP: 14,
      LAST_SWITCHED: 21,
      FIRST_SWITCHED: 22,
    });
  });

  it('does not record when disabled', () => {
    const collector = new FlowCollector();
    const exporter = new NetflowExporter('r1', { enabled: false }, collector);
    exporter.observe(
      buildUdpPacket({
        srcNodeId: 'a',
        dstNodeId: 'b',
        srcIp: '10.0.0.1',
        dstIp: '10.0.0.2',
        srcPort: 1,
        dstPort: 2,
        srcMac: '00:00:00:00:00:01',
        dstMac: '00:00:00:00:00:02',
        packetId: 'disabled',
        timestamp: 0,
        payload: { layer: 'raw', data: 'x' },
      }),
      'eth0',
      'eth1',
      1,
    );

    expect(collector.list()).toEqual([]);
  });
});
