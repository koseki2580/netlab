/* @vitest-environment jsdom */

import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulationContext, type SimulationContextValue } from '../simulation/SimulationContext';
import type { NetworkTopology, StpPortRuntime } from '../types/topology';
import { NodeDetailPanel, vlanColor } from './NodeDetailPanel';

const uiMock = vi.hoisted(() => ({
  selectedNodeId: null as string | null,
  setSelectedNodeId: vi.fn(),
  selectedEdgeId: null as string | null,
  setSelectedEdgeId: vi.fn(),
}));

const netlabMock = vi.hoisted(() => ({
  topology: {
    nodes: [],
    edges: [],
    areas: [],
    routeTables: new Map(),
  } as NetworkTopology,
}));

vi.mock('./NetlabUIContext', () => ({
  useNetlabUI: () => uiMock,
}));

vi.mock('./NetlabContext', () => ({
  useNetlabContext: () => ({
    topology: netlabMock.topology,
    routeTable: netlabMock.topology.routeTables,
    areas: netlabMock.topology.areas,
    hookEngine: {} as never,
  }),
}));

function makeSimulationValue(
  overrides: Partial<SimulationContextValue> = {},
): SimulationContextValue {
  return {
    engine: {
      getRuntimeNodeIp: () => null,
      getUdpBindings: () => null,
      getMulticastTableSnapshot: () => [],
      getIgmpMembershipSnapshot: () => [],
      getJoinedGroups: () => [],
    } as never,
    state: {
      status: 'idle',
      traces: [],
      currentTraceId: null,
      currentStep: -1,
      activeEdgeIds: [],
      selectedHop: null,
      selectedPacket: null,
      nodeArpTables: {},
      natTables: [],
      connTrackTables: [],
    },
    sendPacket: async () => {},
    simulateDhcp: async () => false,
    simulateDns: async () => null,
    getDhcpLeaseState: () => null,
    getDnsCache: () => null,
    exportPcap: () => new Uint8Array(),
    animationSpeed: 500,
    setAnimationSpeed: () => {},
    isRecomputing: false,
    ...overrides,
  };
}

function makeTopology(
  nodes: NetworkTopology['nodes'],
  overrides: Partial<NetworkTopology> = {},
): NetworkTopology {
  return {
    nodes,
    edges: [],
    areas: [],
    routeTables: new Map(),
    ...overrides,
  };
}

function makeEdge(mtuBytes?: number): NetworkTopology['edges'][number] {
  return {
    id: 'edge-1',
    source: 'router-1',
    target: 'client-1',
    type: 'smoothstep',
    data: mtuBytes === undefined ? undefined : { mtuBytes },
  };
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  descriptor?.set?.call(input, value);
}

function makeRouterNode(withSubInterfaces = false) {
  return {
    id: 'router-1',
    type: 'router',
    position: { x: 0, y: 0 },
    data: {
      label: 'R1',
      role: 'router',
      layerId: 'l3',
      interfaces: [
        {
          id: 'eth0',
          name: 'eth0',
          ipAddress: '10.0.0.1',
          prefixLength: 24,
          macAddress: '00:00:00:00:00:01',
          mtu: 1400,
          subInterfaces: withSubInterfaces
            ? [
                {
                  id: 'eth0.10',
                  parentInterfaceId: 'eth0',
                  vlanId: 10,
                  ipAddress: '10.0.10.1',
                  prefixLength: 24,
                  mtu: 900,
                },
                {
                  id: 'eth0.20',
                  parentInterfaceId: 'eth0',
                  vlanId: 20,
                  ipAddress: '10.0.20.1',
                  prefixLength: 24,
                },
              ]
            : undefined,
        },
      ],
    },
  } as NetworkTopology['nodes'][number];
}

function makeSwitchNode(withVlanConfig = false) {
  return {
    id: 'switch-1',
    type: 'switch',
    position: { x: 0, y: 0 },
    data: {
      label: 'SW1',
      role: 'switch',
      layerId: 'l2',
      ports: [
        {
          id: 'port-1',
          name: 'fa0/1',
          macAddress: '00:00:00:00:00:02',
          vlanMode: withVlanConfig ? 'access' : undefined,
          accessVlan: withVlanConfig ? 10 : undefined,
          nativeVlan: withVlanConfig ? 1 : undefined,
        },
        ...(withVlanConfig
          ? [
              {
                id: 'port-2',
                name: 'fa0/24',
                macAddress: '00:00:00:00:00:24',
                vlanMode: 'trunk' as const,
                trunkAllowedVlans: [10, 20],
                nativeVlan: 1,
              },
            ]
          : []),
      ],
      vlans: withVlanConfig
        ? [
            { vlanId: 10, name: 'users' },
            { vlanId: 20, name: 'servers' },
          ]
        : undefined,
    },
  } as NetworkTopology['nodes'][number];
}

function makeSwitchNodeWithoutVlanConfig() {
  return {
    id: 'switch-1',
    type: 'switch',
    position: { x: 0, y: 0 },
    data: {
      label: 'SW1',
      role: 'switch',
      layerId: 'l2',
      ports: [
        {
          id: 'port-1',
          name: 'fa0/1',
          macAddress: '00:00:00:00:00:02',
        },
      ],
    },
  } as NetworkTopology['nodes'][number];
}

function makeStpRuntime(
  portId: string,
  role: StpPortRuntime['role'],
  state: StpPortRuntime['state'],
): StpPortRuntime {
  return {
    switchNodeId: 'switch-1',
    portId,
    role,
    state,
    designatedBridge: { priority: 32768, mac: '00:00:00:00:00:02' },
    rootPathCost: role === 'ROOT' ? 19 : 0,
  };
}

function makeClientNode() {
  return {
    id: 'client-1',
    type: 'client',
    position: { x: 0, y: 0 },
    data: {
      label: 'Client',
      role: 'client',
      layerId: 'l7',
      ip: '10.0.0.10',
      mac: '00:00:00:00:00:03',
    },
  } as NetworkTopology['nodes'][number];
}

type PanelProps = ComponentProps<typeof NodeDetailPanel>;

function renderMarkup(simulationValue = makeSimulationValue(), panelProps?: PanelProps) {
  return renderToStaticMarkup(
    <SimulationContext.Provider value={simulationValue}>
      <NodeDetailPanel {...panelProps} />
    </SimulationContext.Provider>,
  );
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function renderDom(simulationValue = makeSimulationValue(), panelProps?: PanelProps) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

  act(() => {
    root?.render(
      <SimulationContext.Provider value={simulationValue}>
        <NodeDetailPanel {...panelProps} />
      </SimulationContext.Provider>,
    );
  });
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  uiMock.selectedNodeId = null;
  uiMock.setSelectedNodeId.mockReset();
  uiMock.selectedEdgeId = null;
  uiMock.setSelectedEdgeId.mockReset();
  netlabMock.topology = makeTopology([]);
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;

  if (container) {
    container.remove();
    container = null;
  }

  vi.restoreAllMocks();
});

describe('NodeDetailPanel', () => {
  it('returns null when no node is selected', () => {
    expect(renderMarkup()).toBe('');
  });

  it('returns null when selected node not found in topology', () => {
    uiMock.selectedNodeId = 'missing';

    expect(renderMarkup()).toBe('');
  });

  it('renders router detail for router node', () => {
    uiMock.selectedNodeId = 'router-1';
    netlabMock.topology = makeTopology([makeRouterNode()]);

    const html = renderMarkup();

    expect(html).toContain('NODE DETAIL');
    expect(html).toContain('R1');
    expect(html).toContain('router');
  });

  it('renders switch detail for switch node', () => {
    uiMock.selectedNodeId = 'switch-1';
    netlabMock.topology = makeTopology([makeSwitchNode()]);

    const html = renderMarkup();

    expect(html).toContain('SW1');
    expect(html).toContain('switch');
  });

  it('renders host detail for client node', () => {
    uiMock.selectedNodeId = 'client-1';
    netlabMock.topology = makeTopology([makeClientNode()]);

    const html = renderMarkup();

    expect(html).toContain('Client');
    expect(html).toContain('client');
  });

  it('displays router interfaces with IP and MAC', () => {
    uiMock.selectedNodeId = 'router-1';
    netlabMock.topology = makeTopology([makeRouterNode()]);

    const html = renderMarkup();

    expect(html).toContain('eth0');
    expect(html).toContain('10.0.0.1/24');
    expect(html).toContain('00:00:00:00:00:01');
  });

  it('displays switch ports', () => {
    uiMock.selectedNodeId = 'switch-1';
    netlabMock.topology = makeTopology([makeSwitchNodeWithoutVlanConfig()]);

    const html = renderMarkup();

    expect(html).toContain('fa0/1');
    expect(html).toContain('00:00:00:00:00:02');
  });

  it('displays host static IP and MAC', () => {
    uiMock.selectedNodeId = 'client-1';
    netlabMock.topology = makeTopology([makeClientNode()]);

    const html = renderMarkup();

    expect(html).toContain('10.0.0.10');
    expect(html).toContain('00:00:00:00:00:03');
  });

  it('displays runtime IP from simulation context', () => {
    uiMock.selectedNodeId = 'client-1';
    netlabMock.topology = makeTopology([makeClientNode()]);

    const html = renderMarkup(
      makeSimulationValue({
        engine: {
          getRuntimeNodeIp: () => '10.0.0.99',
          getUdpBindings: () => null,
          getMulticastTableSnapshot: () => [],
          getIgmpMembershipSnapshot: () => [],
          getJoinedGroups: () => [],
        } as never,
      }),
    );

    expect(html).toContain('10.0.0.99');
    expect(html).not.toContain('10.0.0.10');
  });

  it('displays DHCP lease when present', () => {
    uiMock.selectedNodeId = 'client-1';
    netlabMock.topology = makeTopology([makeClientNode()]);

    const html = renderMarkup(
      makeSimulationValue({
        getDhcpLeaseState: () => ({
          status: 'bound',
          transactionId: 1,
          assignedIp: '10.0.0.20',
          serverIp: '10.0.0.1',
          defaultGateway: '10.0.0.1',
          dnsServerIp: '10.0.0.53',
        }),
      }),
    );

    expect(html).toContain('DHCP LEASE');
    expect(html).toContain('BOUND');
    expect(html).toContain('10.0.0.20');
    expect(html).toContain('10.0.0.53');
  });

  it('displays DNS cache when present', () => {
    uiMock.selectedNodeId = 'client-1';
    netlabMock.topology = makeTopology([makeClientNode()]);

    const html = renderMarkup(
      makeSimulationValue({
        getDnsCache: () => ({
          'example.com': {
            address: '203.0.113.10',
            ttl: 60,
            resolvedAt: 1,
          },
        }),
      }),
    );

    expect(html).toContain('DNS CACHE');
    expect(html).toContain('example.com');
    expect(html).toContain('203.0.113.10');
  });

  it('closes panel on Escape key', () => {
    uiMock.selectedNodeId = 'client-1';
    netlabMock.topology = makeTopology([makeClientNode()]);

    renderDom();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(uiMock.setSelectedNodeId).toHaveBeenCalledWith(null);
  });

  describe('VLAN', () => {
    it('renders access/trunk mode and VLAN IDs for a switch with port VLAN config', () => {
      uiMock.selectedNodeId = 'switch-1';
      netlabMock.topology = makeTopology([makeSwitchNode(true)]);

      const html = renderMarkup();

      expect(html).toContain('PORT VLANS');
      expect(html).toContain('fa0/1');
      expect(html).toContain('ACCESS');
      expect(html).toContain('fa0/24');
      expect(html).toContain('TRUNK');
      expect(html).toContain('10');
      expect(html).toContain('10, 20');
    });

    it('renders sub-interface list for a router with subInterfaces', () => {
      uiMock.selectedNodeId = 'router-1';
      netlabMock.topology = makeTopology([makeRouterNode(true)]);

      const html = renderMarkup();

      expect(html).toContain('eth0.10');
      expect(html).toContain('10.0.10.1/24');
      expect(html).toContain('eth0.20');
      expect(html).toContain('10.0.20.1/24');
    });

    it('omits the VLAN table on switches with no VLAN config (backward compat)', () => {
      uiMock.selectedNodeId = 'switch-1';
      netlabMock.topology = makeTopology([makeSwitchNodeWithoutVlanConfig()]);

      const html = renderMarkup();

      expect(html).not.toContain('PORT VLANS');
    });

    it('vlanColor returns the same color for the same vid and different colors for different vids', () => {
      expect(vlanColor(10)).toBe(vlanColor(10));
      expect(vlanColor(10)).not.toBe(vlanColor(20));
    });
  });

  describe('MTU', () => {
    it('renders MTU ∞ for an interface without explicit mtu', () => {
      uiMock.selectedNodeId = 'router-1';
      const topology = makeTopology([makeRouterNode()]);
      const router = topology.nodes[0];
      if (router.data.role === 'router' && router.data.interfaces) {
        router.data.interfaces = router.data.interfaces.map((iface) => ({
          ...iface,
          mtu: undefined,
        }));
      }
      netlabMock.topology = topology;

      const html = renderMarkup();

      expect(html).toContain('MTU ∞');
    });

    it('renders MTU <n> for an interface with explicit mtu', () => {
      uiMock.selectedNodeId = 'router-1';
      netlabMock.topology = makeTopology([makeRouterNode()]);

      const html = renderMarkup();

      expect(html).toContain('MTU 1400');
    });

    it('applies the low-mtu accent when mtu < 1500', () => {
      uiMock.selectedNodeId = 'router-1';
      netlabMock.topology = makeTopology([makeRouterNode(true)]);

      const html = renderMarkup();

      expect(html).toContain('data-low-mtu="true"');
    });

    it('calls onTopologyChange when the user edits an interface mtu', () => {
      uiMock.selectedNodeId = 'router-1';
      netlabMock.topology = makeTopology([makeRouterNode()]);
      const onTopologyChange = vi.fn();

      renderDom(makeSimulationValue(), { onTopologyChange });

      const input = container?.querySelector(
        'input[name="interface-mtu-eth0"]',
      ) as HTMLInputElement | null;
      expect(input).not.toBeNull();

      act(() => {
        input!.focus();
        setNativeInputValue(input!, '1300');
        input!.dispatchEvent(new Event('input', { bubbles: true }));
        input!.dispatchEvent(new Event('change', { bubbles: true }));
        input!.blur();
      });

      expect(onTopologyChange).toHaveBeenCalledWith(
        expect.objectContaining({
          nodes: [
            expect.objectContaining({
              id: 'router-1',
              data: expect.objectContaining({
                interfaces: [expect.objectContaining({ id: 'eth0', mtu: 1300 })],
              }),
            }),
          ],
        }),
      );
    });
  });

  describe('Edge detail — MTU', () => {
    it('renders MTU ∞ when edge.data.mtuBytes is undefined', () => {
      uiMock.selectedEdgeId = 'edge-1';
      netlabMock.topology = makeTopology([makeRouterNode(), makeClientNode()], {
        edges: [makeEdge()],
      });

      const html = renderMarkup();

      expect(html).toContain('EDGE DETAIL');
      expect(html).toContain('MTU ∞');
    });

    it('renders MTU <n> when edge.data.mtuBytes is set', () => {
      uiMock.selectedEdgeId = 'edge-1';
      netlabMock.topology = makeTopology([makeRouterNode(), makeClientNode()], {
        edges: [makeEdge(600)],
      });

      const html = renderMarkup();

      expect(html).toContain('MTU 600');
    });

    it('updates edge.data.mtuBytes via onTopologyChange', () => {
      uiMock.selectedEdgeId = 'edge-1';
      netlabMock.topology = makeTopology([makeRouterNode(), makeClientNode()], {
        edges: [makeEdge(600)],
      });
      const onTopologyChange = vi.fn();

      renderDom(makeSimulationValue(), { onTopologyChange });

      const input = container?.querySelector(
        'input[name="edge-mtu-edge-1"]',
      ) as HTMLInputElement | null;
      expect(input).not.toBeNull();

      act(() => {
        input!.focus();
        setNativeInputValue(input!, '900');
        input!.dispatchEvent(new Event('input', { bubbles: true }));
        input!.dispatchEvent(new Event('change', { bubbles: true }));
        input!.blur();
      });

      expect(onTopologyChange).toHaveBeenCalledWith(
        expect.objectContaining({
          edges: [
            expect.objectContaining({
              id: 'edge-1',
              data: expect.objectContaining({ mtuBytes: 900 }),
            }),
          ],
        }),
      );
    });
  });

  describe('STP', () => {
    it('renders ROOT/DESIGNATED/BLOCKED badges for a switch with stpStates', () => {
      uiMock.selectedNodeId = 'switch-1';
      netlabMock.topology = makeTopology([makeSwitchNode(true)], {
        stpStates: new Map([
          ['switch-1:port-1', makeStpRuntime('port-1', 'ROOT', 'FORWARDING')],
          ['switch-1:port-2', makeStpRuntime('port-2', 'DESIGNATED', 'FORWARDING')],
          ['switch-1:port-3', makeStpRuntime('port-3', 'BLOCKED', 'BLOCKING')],
        ]),
        stpRoot: { priority: 4096, mac: '00:00:00:00:00:01' },
      });
      netlabMock.topology.nodes[0].data.ports = [
        { id: 'port-1', name: 'fa0/1', macAddress: '00:00:00:00:00:02' },
        { id: 'port-2', name: 'fa0/2', macAddress: '00:00:00:00:00:03' },
        { id: 'port-3', name: 'fa0/3', macAddress: '00:00:00:00:00:04' },
      ];

      const html = renderMarkup();

      expect(html).toContain('STP');
      expect(html).toContain('port-1');
      expect(html).toContain('ROOT');
      expect(html).toContain('DESIGNATED');
      expect(html).toContain('BLOCKED');
    });

    it('shows "Root bridge" when this switch is the elected root', () => {
      uiMock.selectedNodeId = 'switch-1';
      netlabMock.topology = makeTopology([makeSwitchNodeWithoutVlanConfig()], {
        stpStates: new Map([
          ['switch-1:port-1', makeStpRuntime('port-1', 'DESIGNATED', 'FORWARDING')],
        ]),
        stpRoot: { priority: 32768, mac: '00:00:00:00:00:02' },
      });

      const html = renderMarkup();

      expect(html).toContain('Root bridge');
    });

    it('shows "Non-root" with root BridgeId otherwise', () => {
      uiMock.selectedNodeId = 'switch-1';
      netlabMock.topology = makeTopology([makeSwitchNodeWithoutVlanConfig()], {
        stpStates: new Map([['switch-1:port-1', makeStpRuntime('port-1', 'ROOT', 'FORWARDING')]]),
        stpRoot: { priority: 4096, mac: '00:00:00:00:00:01' },
      });

      const html = renderMarkup();

      expect(html).toContain('Non-root');
      expect(html).toContain('4096/00:00:00:00:00:01');
    });

    it('omits STP section when topology.stpStates is absent (backward compat)', () => {
      uiMock.selectedNodeId = 'switch-1';
      netlabMock.topology = makeTopology([makeSwitchNodeWithoutVlanConfig()]);

      const html = renderMarkup();

      expect(html).not.toContain('Root bridge');
      expect(html).not.toContain('Non-root');
      expect(html).not.toContain('STP');
    });
  });

  describe('NodeDetailPanel — UDP bindings', () => {
    it('renders empty-state when no bindings are active', () => {
      uiMock.selectedNodeId = 'client-1';
      netlabMock.topology = makeTopology([makeClientNode()]);

      const html = renderMarkup(
        makeSimulationValue({
          engine: {
            getRuntimeNodeIp: () => null,
            getUdpBindings: () => ({ listening: [], ephemeral: [] }),
            getMulticastTableSnapshot: () => [],
            getIgmpMembershipSnapshot: () => [],
            getJoinedGroups: () => [],
          } as never,
        }),
      );

      expect(html).toContain('UDP BINDINGS');
      expect(html).toContain('(no active UDP bindings)');
    });

    it('renders one row per listening binding with (ip, port, owner)', () => {
      uiMock.selectedNodeId = 'client-1';
      netlabMock.topology = makeTopology([makeClientNode()]);

      const html = renderMarkup(
        makeSimulationValue({
          engine: {
            getRuntimeNodeIp: () => null,
            getUdpBindings: () => ({
              listening: [
                { ip: '10.0.0.5', port: 67, owner: 'dhcp-server' },
                { ip: '10.0.0.5', port: 53, owner: 'dns' },
              ],
              ephemeral: [],
            }),
            getMulticastTableSnapshot: () => [],
            getIgmpMembershipSnapshot: () => [],
            getJoinedGroups: () => [],
          } as never,
        }),
      );

      expect(html).toContain('UDP BINDINGS');
      expect(html).toContain('10.0.0.5:67');
      expect(html).toContain('10.0.0.5:53');
      expect(html).toContain('(dhcp-server)');
      expect(html).toContain('(dns)');
    });

    it('labels port 67 as dhcp-server', () => {
      uiMock.selectedNodeId = 'client-1';
      netlabMock.topology = makeTopology([makeClientNode()]);

      const html = renderMarkup(
        makeSimulationValue({
          engine: {
            getRuntimeNodeIp: () => null,
            getUdpBindings: () => ({
              listening: [{ ip: '10.0.0.5', port: 67, owner: 'dhcp-server' }],
              ephemeral: [],
            }),
            getMulticastTableSnapshot: () => [],
            getIgmpMembershipSnapshot: () => [],
            getJoinedGroups: () => [],
          } as never,
        }),
      );

      expect(html).toContain('(dhcp-server)');
    });

    it('labels port 53 as dns', () => {
      uiMock.selectedNodeId = 'client-1';
      netlabMock.topology = makeTopology([makeClientNode()]);

      const html = renderMarkup(
        makeSimulationValue({
          engine: {
            getRuntimeNodeIp: () => null,
            getUdpBindings: () => ({
              listening: [{ ip: '10.0.0.5', port: 53, owner: 'dns' }],
              ephemeral: [],
            }),
            getMulticastTableSnapshot: () => [],
            getIgmpMembershipSnapshot: () => [],
            getJoinedGroups: () => [],
          } as never,
        }),
      );

      expect(html).toContain('(dns)');
    });

    it('labels unknown ports as application', () => {
      uiMock.selectedNodeId = 'client-1';
      netlabMock.topology = makeTopology([makeClientNode()]);

      const html = renderMarkup(
        makeSimulationValue({
          engine: {
            getRuntimeNodeIp: () => null,
            getUdpBindings: () => ({
              listening: [{ ip: '10.0.0.5', port: 9999, owner: 'application' }],
              ephemeral: [],
            }),
            getMulticastTableSnapshot: () => [],
            getIgmpMembershipSnapshot: () => [],
            getJoinedGroups: () => [],
          } as never,
        }),
      );

      expect(html).toContain('(application)');
    });

    it('does not render the section on a router node', () => {
      uiMock.selectedNodeId = 'router-1';
      netlabMock.topology = makeTopology([makeRouterNode()]);

      const html = renderMarkup(
        makeSimulationValue({
          engine: {
            getRuntimeNodeIp: () => null,
            getUdpBindings: () => null,
            getMulticastTableSnapshot: () => [],
            getIgmpMembershipSnapshot: () => [],
            getJoinedGroups: () => [],
          } as never,
        }),
      );

      expect(html).not.toContain('UDP BINDINGS');
    });

    it('does not render the section on a switch node', () => {
      uiMock.selectedNodeId = 'switch-1';
      netlabMock.topology = makeTopology([makeSwitchNode()]);

      const html = renderMarkup(
        makeSimulationValue({
          engine: {
            getRuntimeNodeIp: () => null,
            getUdpBindings: () => null,
            getMulticastTableSnapshot: () => [],
            getIgmpMembershipSnapshot: () => [],
            getJoinedGroups: () => [],
          } as never,
        }),
      );

      expect(html).not.toContain('UDP BINDINGS');
    });
  });

  it('perf: is wrapped in React.memo', () => {
    // React.memo components have $$typeof === Symbol.for('react.memo')
    expect((NodeDetailPanel as unknown as { $$typeof: symbol }).$$typeof).toBe(
      Symbol.for('react.memo'),
    );
  });

  it('perf: re-renders only when props change', () => {
    uiMock.selectedNodeId = 'router-1';
    netlabMock.topology = makeTopology([makeRouterNode()]);
    const stableCallback = () => {};

    // First render
    renderDom(makeSimulationValue(), { onTopologyChange: stableCallback });
    const html1 = container!.innerHTML;

    // Re-render with same props — memo should produce identical output
    renderDom(makeSimulationValue(), { onTopologyChange: stableCallback });
    const html2 = container!.innerHTML;

    expect(html1).toBe(html2);
    expect(html1).toContain('NODE DETAIL');
  });
});
