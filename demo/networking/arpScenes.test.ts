// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { SwitchForwarder } from '../../src/layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../../src/layers/l3-network/RouterForwarder';
import { layerRegistry } from '../../src/registry/LayerRegistry';
import { makeEngine } from '../../src/simulation/__fixtures__/helpers';
import { ARP_LOCAL, arpSceneFromSearch } from './arpScenes';

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

describe('the ARP lesson on one network (TC-1400, TC-1401)', () => {
  it('TC-1400: the Client asks for the Printer itself, and the frame goes to its MAC', async () => {
    const engine = makeEngine(ARP_LOCAL.topology);
    const trace = await engine.ping(ARP_LOCAL.from, ARP_LOCAL.target);
    expect(trace.status).toBe('delivered');
    const asks = trace.hops.filter((hop) => hop.event === 'arp-request');
    expect(asks.length).toBeGreaterThan(0);
    const questions = asks.map((hop) => hop.arpFrame?.payload.targetIp);
    expect(questions).toContain(ARP_LOCAL.target);
    expect(questions).not.toContain(ARP_LOCAL.gateway);
    const printer = ARP_LOCAL.topology.nodes.find((node) => node.id === ARP_LOCAL.to)!;
    const delivered = trace.hops.find(
      (hop) => hop.event === 'deliver' && hop.nodeId === ARP_LOCAL.to,
    );
    expect(delivered?.dstMac?.toLowerCase()).toBe(String(printer.data.mac).toLowerCase());
  });

  it('TC-1401: ?scene=local opens it; anything else the routed scene', () => {
    expect(arpSceneFromSearch('?scene=local')).toBe('local');
    expect(arpSceneFromSearch('?fromExam=6&scene=local')).toBe('local');
    expect(arpSceneFromSearch('')).toBe('routed');
    expect(arpSceneFromSearch('?scene=elsewhere')).toBe('routed');
  });
});
