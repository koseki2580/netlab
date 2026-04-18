import { beforeEach, describe, expect, it } from "vitest";
import type { InFlightPacket } from "../../types/packets";
import type { NetworkTopology, SwitchPort } from "../../types/topology";
import { ipToMulticastMac } from "../../utils/multicastMac";
import { IgmpProcessor } from "../l3-network/IgmpProcessor";
import { SwitchForwarder } from "./SwitchForwarder";

// Helpers

function make3PortTopology(): {
  topology: NetworkTopology;
  ports: SwitchPort[];
} {
  const ports: SwitchPort[] = [
    { id: "port-1", name: "port-1", macAddress: "" },
    { id: "port-2", name: "port-2", macAddress: "" },
    { id: "port-3", name: "port-3", macAddress: "" },
  ];
  const topology: NetworkTopology = {
    nodes: [
      {
        id: "sw-1",
        type: "switch",
        position: { x: 0, y: 0 },
        data: { label: "sw-1", layerId: "l2", role: "switch", ports },
      },
      {
        id: "host-a",
        type: "client",
        position: { x: 0, y: 0 },
        data: {
          label: "host-a",
          layerId: "l7",
          role: "client",
          mac: "aa:00:00:00:00:01",
          ip: "10.0.0.10",
        },
      },
      {
        id: "host-b",
        type: "client",
        position: { x: 0, y: 0 },
        data: {
          label: "host-b",
          layerId: "l7",
          role: "client",
          mac: "aa:00:00:00:00:02",
          ip: "10.0.0.20",
        },
      },
      {
        id: "host-c",
        type: "client",
        position: { x: 0, y: 0 },
        data: {
          label: "host-c",
          layerId: "l7",
          role: "client",
          mac: "aa:00:00:00:00:03",
          ip: "10.0.0.30",
        },
      },
    ],
    edges: [
      {
        id: "e1",
        source: "sw-1",
        sourceHandle: "port-1",
        target: "host-a",
        targetHandle: "eth0",
      },
      {
        id: "e2",
        source: "sw-1",
        sourceHandle: "port-2",
        target: "host-b",
        targetHandle: "eth0",
      },
      {
        id: "e3",
        source: "sw-1",
        sourceHandle: "port-3",
        target: "host-c",
        targetHandle: "eth0",
      },
    ],
    areas: [],
    routeTables: new Map(),
  };
  return { topology, ports };
}

function makeIgmpReportPacket(
  srcMac: string,
  srcIp: string,
  groupAddress: string,
): InFlightPacket {
  const pkt = IgmpProcessor.buildMembershipReport(srcIp, srcMac, groupAddress);
  pkt.id = "test-report";
  pkt.srcNodeId = "host-a";
  pkt.dstNodeId = "";
  pkt.currentDeviceId = "sw-1";
  return pkt;
}

function makeIgmpLeavePacket(
  srcMac: string,
  srcIp: string,
  groupAddress: string,
): InFlightPacket {
  const pkt = IgmpProcessor.buildLeaveGroup(srcIp, srcMac, groupAddress);
  pkt.id = "test-leave";
  pkt.srcNodeId = "host-a";
  pkt.dstNodeId = "";
  pkt.currentDeviceId = "sw-1";
  return pkt;
}

const GROUP = "224.1.2.3";
const GROUP_MAC = ipToMulticastMac(GROUP);

describe("SwitchForwarder — multicast snooping", () => {
  let fw: SwitchForwarder;

  beforeEach(() => {
    const setup = make3PortTopology();
    fw = new SwitchForwarder("sw-1", setup.topology);
  });

  it("learns (vlan1, multicastMac) on port=1 when a Report arrives", async () => {
    const pkt = makeIgmpReportPacket("aa:00:00:00:00:01", "10.0.0.10", GROUP);
    await fw.receive(pkt, "port-1", { neighbors: [] });
    const table = fw.getMulticastTable();
    expect(table.hasLearnedGroup(1, GROUP_MAC)).toBe(true);
    expect(table.getJoinedPorts(1, GROUP_MAC)).toEqual(new Set(["port-1"]));
  });

  it("still forwards the Report (snooping is transparent)", async () => {
    const pkt = makeIgmpReportPacket("aa:00:00:00:00:01", "10.0.0.10", GROUP);
    const result = await fw.receive(pkt, "port-1", { neighbors: [] });
    expect(result.action).toBe("forward");
  });

  it("forgets the membership for (vlan1, group) on Leave from the same port", async () => {
    // First join
    const reportPkt = makeIgmpReportPacket(
      "aa:00:00:00:00:01",
      "10.0.0.10",
      GROUP,
    );
    await fw.receive(reportPkt, "port-1", { neighbors: [] });
    // Then leave
    const leavePkt = makeIgmpLeavePacket(
      "aa:00:00:00:00:01",
      "10.0.0.10",
      GROUP,
    );
    await fw.receive(leavePkt, "port-1", { neighbors: [] });
    const table = fw.getMulticastTable();
    expect(table.getJoinedPorts(1, GROUP_MAC).size).toBe(0);
  });

  it("keeps other ports in the group after one port leaves", async () => {
    // Join from port-1 and port-2
    const report1 = makeIgmpReportPacket(
      "aa:00:00:00:00:01",
      "10.0.0.10",
      GROUP,
    );
    await fw.receive(report1, "port-1", { neighbors: [] });
    const report2 = makeIgmpReportPacket(
      "aa:00:00:00:00:02",
      "10.0.0.20",
      GROUP,
    );
    await fw.receive(report2, "port-2", { neighbors: [] });
    // Leave from port-1
    const leave1 = makeIgmpLeavePacket("aa:00:00:00:00:01", "10.0.0.10", GROUP);
    await fw.receive(leave1, "port-1", { neighbors: [] });
    const table = fw.getMulticastTable();
    expect(table.getJoinedPorts(1, GROUP_MAC)).toEqual(new Set(["port-2"]));
  });
});

describe("SwitchForwarder — multicast data forwarding", () => {
  let fw: SwitchForwarder;
  let ports: SwitchPort[];

  beforeEach(() => {
    const setup = make3PortTopology();
    fw = new SwitchForwarder("sw-1", setup.topology);
    ports = setup.ports;
  });

  it("forwards to the single joined port on a learned group", () => {
    fw.getMulticastTable().addMembership(1, GROUP_MAC, "port-2");
    const result = fw.forward(GROUP_MAC, "port-1", ports, 1, GROUP);
    expect(result).toEqual(["port-2"]);
  });

  it("forwards to multiple joined ports on a learned group", () => {
    fw.getMulticastTable().addMembership(1, GROUP_MAC, "port-2");
    fw.getMulticastTable().addMembership(1, GROUP_MAC, "port-3");
    const result = fw.forward(GROUP_MAC, "port-1", ports, 1, GROUP);
    expect(result.sort()).toEqual(["port-2", "port-3"]);
  });

  it("floods within VLAN when all ports leave (flood fallback)", () => {
    fw.getMulticastTable().addMembership(1, GROUP_MAC, "port-2");
    fw.getMulticastTable().removeMembership(1, GROUP_MAC, "port-2");
    const result = fw.forward(GROUP_MAC, "port-1", ports, 1, GROUP);
    expect(result.sort()).toEqual(["port-2", "port-3"]);
  });

  it("floods within VLAN on an unlearned non-link-local group", () => {
    const result = fw.forward(GROUP_MAC, "port-1", ports, 1, GROUP);
    expect(result.sort()).toEqual(["port-2", "port-3"]);
  });

  it("floods within VLAN on a link-local group (224.0.0.5) regardless of snooping state", () => {
    const linkLocalMac = ipToMulticastMac("224.0.0.5");
    // Even if the group is learned with zero ports, link-local is always flooded
    fw.getMulticastTable().addMembership(1, linkLocalMac, "port-2");
    fw.getMulticastTable().removeMembership(1, linkLocalMac, "port-2");
    const result = fw.forward(linkLocalMac, "port-1", ports, 1, "224.0.0.5");
    expect(result.sort()).toEqual(["port-2", "port-3"]);
  });

  it("never forwards multicast into a different VLAN", () => {
    fw.getMulticastTable().addMembership(2, GROUP_MAC, "port-2"); // VLAN 2
    const result = fw.forward(GROUP_MAC, "port-1", ports, 1, GROUP); // VLAN 1
    // Unlearned in VLAN 1 → flood
    expect(result.sort()).toEqual(["port-2", "port-3"]);
  });

  it("never forwards to the ingress port", () => {
    fw.getMulticastTable().addMembership(1, GROUP_MAC, "port-1");
    fw.getMulticastTable().addMembership(1, GROUP_MAC, "port-2");
    const result = fw.forward(GROUP_MAC, "port-1", ports, 1, GROUP);
    expect(result).toEqual(["port-2"]);
  });
});

describe("SwitchForwarder — broadcast regression", () => {
  it("ff:ff:ff:ff:ff:ff still floods the VLAN regardless of MulticastTable state", () => {
    const { topology, ports } = make3PortTopology();
    const fw = new SwitchForwarder("sw-1", topology);
    // Populate multicast table — should not affect broadcast
    fw.getMulticastTable().addMembership(1, GROUP_MAC, "port-2");
    const result = fw.forward("ff:ff:ff:ff:ff:ff", "port-1", ports, 1);
    expect(result.sort()).toEqual(["port-2", "port-3"]);
  });
});
