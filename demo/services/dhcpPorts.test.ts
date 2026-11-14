// @vitest-environment node
/**
 * TC-1606 — the DHCP lesson's messages travel on UDP 67 and 68 (RFC 2131 §4.1),
 * never on DNS's 53: every DHCP trace of the lesson, read from the packet the
 * simulator recorded at its first hop.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { SwitchForwarder } from '../../src/layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../../src/layers/l3-network/RouterForwarder';
import { layerRegistry } from '../../src/registry/LayerRegistry';
import { makeEngine } from '../../src/simulation/__fixtures__/helpers';
import { DHCP_DNS_DEMO_TOPOLOGY } from './DhcpDnsDemo';

beforeAll(() => {
  layerRegistry.register({
    layerId: 'l3',
    nodeTypes: {},
    forwarder: (nodeId, topology) => new RouterForwarder(nodeId, topology),
  });
  layerRegistry.register({
    layerId: 'l2',
    nodeTypes: {},
    forwarder: (nodeId, topology) => new SwitchForwarder(nodeId, topology),
  });
});

describe('the DHCP lesson’s ports (TC-1606)', () => {
  it('uses UDP 68 → 67 from the client and 67 → 68 from the server', async () => {
    const engine = makeEngine(DHCP_DNS_DEMO_TOPOLOGY);
    await engine.simulateDhcp('dhcp-client');
    const traces = engine.getState().traces.filter((trace) => /DHCP/i.test(trace.label ?? ''));
    expect(traces.length).toBeGreaterThanOrEqual(4);
    for (const trace of traces) {
      engine.selectTrace(trace.packetId);
      engine.selectHop(0);
      const udp = engine.getState().selectedPacket?.frame.payload.payload as {
        srcPort: number;
        dstPort: number;
      };
      const ports = [udp.srcPort, udp.dstPort].sort();
      expect(ports, trace.label).toEqual([67, 68]);
    }
  });
});
