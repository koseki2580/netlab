import { describe, expect, it } from 'vitest';
import { buildDiscover, handleAck } from './DhcpClient';
import type { InFlightPacket } from '../types/packets';
import type { NetworkTopology } from '../types/topology';

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 0, y: 0 },
      data: { label: 'Client', role: 'client', layerId: 'l7', dhcpClient: { enabled: true } },
    },
    {
      id: 'dhcp-server',
      type: 'server',
      position: { x: 200, y: 0 },
      data: {
        label: 'DHCP Server',
        role: 'server',
        layerId: 'l7',
        ip: '192.168.1.1',
        dhcpServer: {
          leasePool: '192.168.1.100/30',
          subnetMask: '255.255.255.0',
          defaultGateway: '192.168.1.1',
          dnsServer: '192.168.1.53',
          leaseTime: 86400,
        },
      },
    },
  ],
  edges: [{ id: 'e1', source: 'client-1', target: 'dhcp-server' }],
  areas: [],
  routeTables: new Map(),
};

function makeAck(): InFlightPacket {
  return {
    id: 'ack-1',
    srcNodeId: 'dhcp-server',
    dstNodeId: 'client-1',
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: 'ff:ff:ff:ff:ff:ff',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: '192.168.1.1',
        dstIp: '255.255.255.255',
        ttl: 64,
        protocol: 17,
        payload: {
          layer: 'L4',
          srcPort: 67,
          dstPort: 68,
          payload: {
            layer: 'L7',
            messageType: 'ACK',
            transactionId: 1,
            clientMac: '02:00:00:00:00:01',
            offeredIp: '192.168.1.101',
            serverIp: '192.168.1.1',
            options: {
              subnetMask: '255.255.255.0',
              router: '192.168.1.1',
              dnsServer: '192.168.1.53',
              leaseTime: 86400,
            },
          },
        },
      },
    },
    currentDeviceId: 'dhcp-server',
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
  };
}

describe('DhcpClient', () => {
  it('builds a DHCP DISCOVER with broadcast IPs and client/server ports', () => {
    const packet = buildDiscover('client-1', TOPOLOGY);

    expect(packet).not.toBeNull();
    expect(packet?.frame.payload.srcIp).toBe('0.0.0.0');
    expect(packet?.frame.payload.dstIp).toBe('255.255.255.255');
    expect(
      'payload' in packet!.frame.payload.payload && packet!.frame.payload.payload.srcPort,
    ).toBe(68);
    expect(
      'payload' in packet!.frame.payload.payload && packet!.frame.payload.payload.dstPort,
    ).toBe(67);
  });

  it('extracts the assigned IP settings from an ACK packet', () => {
    expect(handleAck(makeAck())).toEqual({
      assignedIp: '192.168.1.101',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      dnsServerIp: '192.168.1.53',
    });
  });
});
