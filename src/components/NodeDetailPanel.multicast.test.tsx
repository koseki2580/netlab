/* @vitest-environment jsdom */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  SimulationContext,
  type SimulationContextValue,
} from "../simulation/SimulationContext";
import type { NetworkTopology } from "../types/topology";
import { NodeDetailPanel } from "./NodeDetailPanel";

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

vi.mock("./NetlabUIContext", () => ({
  useNetlabUI: () => uiMock,
}));

vi.mock("./NetlabContext", () => ({
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
      status: "idle",
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

function makeSwitchNode() {
  return {
    id: "switch-1",
    type: "switch",
    position: { x: 0, y: 0 },
    data: {
      label: "SW1",
      role: "switch",
      layerId: "l2",
      ports: [
        { id: "port-1", name: "fa0/1", macAddress: "00:00:00:00:00:01" },
        { id: "port-2", name: "fa0/2", macAddress: "00:00:00:00:00:02" },
      ],
    },
  } as NetworkTopology["nodes"][number];
}

function makeRouterNode() {
  return {
    id: "router-1",
    type: "router",
    position: { x: 0, y: 0 },
    data: {
      label: "R1",
      role: "router",
      layerId: "l3",
      interfaces: [
        {
          id: "eth0",
          name: "eth0",
          ipAddress: "10.0.0.1",
          prefixLength: 24,
          macAddress: "00:00:00:01:00:00",
        },
      ],
    },
  } as NetworkTopology["nodes"][number];
}

function makeClientNode() {
  return {
    id: "client-1",
    type: "client",
    position: { x: 0, y: 0 },
    data: {
      label: "Client",
      role: "client",
      layerId: "l7",
      ip: "10.0.0.10",
      mac: "00:00:00:00:00:10",
    },
  } as NetworkTopology["nodes"][number];
}

function makeServerNode() {
  return {
    id: "server-1",
    type: "server",
    position: { x: 0, y: 0 },
    data: {
      label: "Server",
      role: "server",
      layerId: "l7",
      ip: "10.0.0.20",
      mac: "00:00:00:00:00:20",
    },
  } as NetworkTopology["nodes"][number];
}

function renderMarkup(simulationValue = makeSimulationValue()) {
  return renderToStaticMarkup(
    <SimulationContext.Provider value={simulationValue}>
      <NodeDetailPanel />
    </SimulationContext.Provider>,
  );
}

describe("NodeDetailPanel — multicast", () => {
  it("renders empty snooping table on a fresh switch", () => {
    uiMock.selectedNodeId = "switch-1";
    uiMock.selectedEdgeId = null;
    netlabMock.topology = {
      nodes: [makeSwitchNode()],
      edges: [],
      areas: [],
      routeTables: new Map(),
    };

    const html = renderMarkup();
    expect(html).toContain("MULTICAST SNOOPING (IGMP)");
    expect(html).toContain("(no multicast memberships)");
  });

  it("renders one row per learned group on a switch", () => {
    uiMock.selectedNodeId = "switch-1";
    uiMock.selectedEdgeId = null;
    netlabMock.topology = {
      nodes: [makeSwitchNode()],
      edges: [],
      areas: [],
      routeTables: new Map(),
    };

    const html = renderMarkup(
      makeSimulationValue({
        engine: {
          getRuntimeNodeIp: () => null,
          getUdpBindings: () => null,
          getMulticastTableSnapshot: () => [
            {
              vlanId: 1,
              multicastMac: "01:00:5e:00:00:05",
              ports: ["port-1", "port-2"],
            },
            { vlanId: 1, multicastMac: "01:00:5e:10:00:01", ports: [] },
          ],
          getIgmpMembershipSnapshot: () => [],
          getJoinedGroups: () => [],
        } as never,
      }),
    );

    expect(html).toContain("MULTICAST SNOOPING (IGMP)");
    expect(html).toContain("01:00:5e:00:00:05");
    expect(html).toContain("ports: port-1,port-2");
    expect(html).toContain("01:00:5e:10:00:01");
    expect(html).toContain("ports: —");
    expect(html).not.toContain("(no multicast memberships)");
  });

  it("renders the router membership list", () => {
    uiMock.selectedNodeId = "router-1";
    uiMock.selectedEdgeId = null;
    netlabMock.topology = {
      nodes: [makeRouterNode()],
      edges: [],
      areas: [],
      routeTables: new Map(),
    };

    const html = renderMarkup(
      makeSimulationValue({
        engine: {
          getRuntimeNodeIp: () => null,
          getUdpBindings: () => null,
          getMulticastTableSnapshot: () => [],
          getIgmpMembershipSnapshot: () => [
            { interfaceId: "eth0", group: "224.1.2.3" },
          ],
          getJoinedGroups: () => [],
        } as never,
      }),
    );

    expect(html).toContain("MULTICAST MEMBERSHIPS");
    expect(html).toContain("eth0");
    expect(html).toContain("224.1.2.3");
  });

  it("renders the client joined-groups list", () => {
    uiMock.selectedNodeId = "client-1";
    uiMock.selectedEdgeId = null;
    netlabMock.topology = {
      nodes: [makeClientNode()],
      edges: [],
      areas: [],
      routeTables: new Map(),
    };

    const html = renderMarkup(
      makeSimulationValue({
        engine: {
          getRuntimeNodeIp: () => null,
          getUdpBindings: () => null,
          getMulticastTableSnapshot: () => [],
          getIgmpMembershipSnapshot: () => [],
          getJoinedGroups: () => ["224.1.2.3", "224.5.6.7"],
        } as never,
      }),
    );

    expect(html).toContain("JOINED GROUPS");
    expect(html).toContain("224.1.2.3");
    expect(html).toContain("224.5.6.7");
  });

  it("does not render multicast sections on unsupported node types", () => {
    // server node without simulation context → no multicast sections
    uiMock.selectedNodeId = "server-1";
    uiMock.selectedEdgeId = null;
    netlabMock.topology = {
      nodes: [makeServerNode()],
      edges: [],
      areas: [],
      routeTables: new Map(),
    };

    const htmlNoSim = renderToStaticMarkup(<NodeDetailPanel />);
    expect(htmlNoSim).not.toContain("MULTICAST SNOOPING");
    expect(htmlNoSim).not.toContain("MULTICAST MEMBERSHIPS");
    expect(htmlNoSim).not.toContain("JOINED GROUPS");
  });
});
