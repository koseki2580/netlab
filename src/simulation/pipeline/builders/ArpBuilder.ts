import type { ArpEthernetFrame } from '../../../types/packets';

export class ArpBuilder {
  buildRequestFrame(src: { ip: string; mac: string }, dstIp: string): ArpEthernetFrame {
    return {
      layer: 'L2',
      srcMac: src.mac,
      dstMac: 'ff:ff:ff:ff:ff:ff',
      etherType: 0x0806,
      payload: {
        layer: 'ARP',
        hardwareType: 1,
        protocolType: 0x0800,
        operation: 'request',
        senderMac: src.mac,
        senderIp: src.ip,
        targetMac: '00:00:00:00:00:00',
        targetIp: dstIp,
      },
    };
  }

  buildReplyFrame(
    src: { ip: string; mac: string },
    dst: { ip: string; mac: string },
  ): ArpEthernetFrame {
    return {
      layer: 'L2',
      srcMac: src.mac,
      dstMac: dst.mac,
      etherType: 0x0806,
      payload: {
        layer: 'ARP',
        hardwareType: 1,
        protocolType: 0x0800,
        operation: 'reply',
        senderMac: src.mac,
        senderIp: src.ip,
        targetMac: dst.mac,
        targetIp: dst.ip,
      },
    };
  }
}
