import { describe, expect, it } from 'vitest';
import { EMPTY_FAILURE_STATE } from '../../../types/failure';
import { TraceRecorder } from '../../TraceRecorder';
import { makePacket } from '../../__fixtures__/helpers';
import { singleRouterTopology } from '../../__fixtures__/topologies';
import { ArpBuilder } from '../builders/ArpBuilder';
import { FrameMaterializer } from '../builders/FrameMaterializer';
import { InterfaceResolver } from '../resolvers/InterfaceResolver';
import { MacResolver } from '../resolvers/MacResolver';
import { PortResolver } from '../resolvers/PortResolver';
import { ArpDispatcher } from './ArpDispatcher';

function makeArpDispatcher() {
  const topology = singleRouterTopology();
  const ifaceResolver = new InterfaceResolver(topology);
  const macResolver = new MacResolver(topology, ifaceResolver, (node) => node?.data.ip);
  const portResolver = new PortResolver(topology);
  const arpBuilder = new ArpBuilder();
  const frameMaterializer = new FrameMaterializer();
  const traceRecorder = new TraceRecorder();
  return new ArpDispatcher(
    topology,
    traceRecorder,
    ifaceResolver,
    macResolver,
    portResolver,
    arpBuilder,
    frameMaterializer,
    (node) => node?.data.ip,
  );
}

describe('ArpDispatcher', () => {
  it('resolveTargetInfo returns ARP target for client-to-router link', () => {
    const dispatcher = makeArpDispatcher();
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const info = dispatcher.resolveTargetInfo(
      'client-1',
      'router-1',
      packet,
      EMPTY_FAILURE_STATE,
      undefined,
      'e1',
    );
    expect(info).not.toBeNull();
    expect(info!.targetIp).toBeDefined();
    expect(info!.senderIp).toBeDefined();
  });

  it('resolveTargetInfo returns null for switch node', () => {
    const dispatcher = makeArpDispatcher();
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    // router-1 is a router so should return something, but switch has no ARP
    // We test with a node that isn't in the topology to simulate no-match
    const info = dispatcher.resolveTargetInfo(
      'nonexistent',
      'router-1',
      packet,
      EMPTY_FAILURE_STATE,
    );
    expect(info).toBeNull();
  });

  it('resolveTargetMac returns a MAC address string', () => {
    const dispatcher = makeArpDispatcher();
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const mac = dispatcher.resolveTargetMac(
      'client-1',
      'router-1',
      'router-1',
      packet,
      EMPTY_FAILURE_STATE,
      undefined,
    );
    expect(typeof mac).toBe('string');
    expect(mac.length).toBeGreaterThan(0);
  });

  it('injectExchange appends ARP hops to the trace', () => {
    const dispatcher = makeArpDispatcher();
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const hops: any[] = [];
    const snapshots: any[] = [];
    const newStep = dispatcher.injectExchange(
      'client-1',
      'router-1',
      '10.0.0.10',
      '10.0.0.1',
      '02:00:00:00:00:10',
      '00:00:00:01:00:00',
      'e1',
      packet,
      0,
      hops,
      snapshots,
      Date.now(),
    );
    expect(newStep).toBeGreaterThan(0);
    expect(hops.length).toBeGreaterThan(0);
  });
});
