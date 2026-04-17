/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulationContext, type SimulationContextValue } from '../simulation/SimulationContext';
import type { NetworkTopology, StpPortRuntime } from '../types/topology';
import { NodeDetailPanel, vlanColor } from './NodeDetailPanel';

const uiMock = vi.hoisted(() => ({
  selectedNodeId: null as string | null,
  setSelectedNodeId: vi.fn(),
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

function makeSimulationValue(overrides: Partial<SimulationContextValue> = {}): SimulationContextValue {
  return {
    engine: { getRuntimeNodeIp: () => null } as never,
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
          subInterfaces: withSubInterfaces
            ? [
                {
                  id: 'eth0.10',
                  parentInterfaceId: 'eth0',
                  vlanId: 10,
                  ipAddress: '10.0.10.1',
                  prefixLength: 24,
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

function renderMarkup(simulationValue = makeSimulationValue()) {
  return renderToStaticMarkup(
    <SimulationContext.Provider value={simulationValue}>
      <NodeDetailPanel />
    </SimulationContext.Provider>,
  );
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function renderDom(simulationValue = makeSimulationValue()) {
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
        <NodeDetailPanel />
      </SimulationContext.Provider>,
    );
  });
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  uiMock.selectedNodeId = null;
  uiMock.setSelectedNodeId.mockReset();
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
        engine: { getRuntimeNodeIp: () => '10.0.0.99' } as never,
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

  describe('STP', () => {
    it('renders ROOT/DESIGNATED/BLOCKED badges for a switch with stpStates', () => {
      uiMock.selectedNodeId = 'switch-1';
      netlabMock.topology = makeTopology(
        [makeSwitchNode(true)],
        {
          stpStates: new Map([
            ['switch-1:port-1', makeStpRuntime('port-1', 'ROOT', 'FORWARDING')],
            ['switch-1:port-2', makeStpRuntime('port-2', 'DESIGNATED', 'FORWARDING')],
            ['switch-1:port-3', makeStpRuntime('port-3', 'BLOCKED', 'BLOCKING')],
          ]),
          stpRoot: { priority: 4096, mac: '00:00:00:00:00:01' },
        },
      );
      netlabMock.topology.nodes[0]!.data.ports = [
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
      netlabMock.topology = makeTopology(
        [makeSwitchNodeWithoutVlanConfig()],
        {
          stpStates: new Map([
            ['switch-1:port-1', makeStpRuntime('port-1', 'DESIGNATED', 'FORWARDING')],
          ]),
          stpRoot: { priority: 32768, mac: '00:00:00:00:00:02' },
        },
      );

      const html = renderMarkup();

      expect(html).toContain('Root bridge');
    });

    it('shows "Non-root" with root BridgeId otherwise', () => {
      uiMock.selectedNodeId = 'switch-1';
      netlabMock.topology = makeTopology(
        [makeSwitchNodeWithoutVlanConfig()],
        {
          stpStates: new Map([
            ['switch-1:port-1', makeStpRuntime('port-1', 'ROOT', 'FORWARDING')],
          ]),
          stpRoot: { priority: 4096, mac: '00:00:00:00:00:01' },
        },
      );

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
});
