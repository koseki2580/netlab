import { NetlabCanvas } from "../../src/components/NetlabCanvas";
import { NetlabProvider } from "../../src/components/NetlabProvider";
import { ResizableSidebar } from "../../src/components/ResizableSidebar";
import { StepControls } from "../../src/components/simulation/StepControls";
import {
  SimulationProvider,
  useSimulation,
} from "../../src/simulation/SimulationContext";
import type { InFlightPacket } from "../../src/types/packets";
import type { NetworkTopology } from "../../src/types/topology";
import DemoShell from "../DemoShell";

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: "dhcp-client",
      type: "client",
      position: { x: 120, y: 160 },
      data: {
        label: "DHCP Client",
        role: "client",
        layerId: "l7",
        dhcpClient: { enabled: true },
      },
    },
    {
      id: "switch-1",
      type: "switch",
      position: { x: 360, y: 220 },
      data: {
        label: "SW-1",
        role: "switch",
        layerId: "l2",
        ports: [
          { id: "p0", name: "fa0/0", macAddress: "00:00:00:10:00:00" },
          { id: "p1", name: "fa0/1", macAddress: "00:00:00:10:00:01" },
          { id: "p2", name: "fa0/2", macAddress: "00:00:00:10:00:02" },
          { id: "p3", name: "fa0/3", macAddress: "00:00:00:10:00:03" },
        ],
      },
    },
    {
      id: "dhcp-server",
      type: "server",
      position: { x: 600, y: 80 },
      data: {
        label: "DHCP Server",
        role: "server",
        layerId: "l7",
        ip: "192.168.1.1",
        dhcpServer: {
          leasePool: "192.168.1.100/30",
          subnetMask: "255.255.255.0",
          defaultGateway: "192.168.1.1",
          dnsServer: "192.168.1.53",
          leaseTime: 86400,
        },
      },
    },
    {
      id: "dns-server",
      type: "server",
      position: { x: 600, y: 220 },
      data: {
        label: "DNS Server",
        role: "server",
        layerId: "l7",
        ip: "192.168.1.53",
        dnsServer: {
          zones: [{ name: "web.example.com", address: "192.168.1.10" }],
        },
      },
    },
    {
      id: "web-server",
      type: "server",
      position: { x: 600, y: 360 },
      data: {
        label: "Web Server",
        role: "server",
        layerId: "l7",
        ip: "192.168.1.10",
      },
    },
  ],
  edges: [
    { id: "e1", source: "dhcp-client", target: "switch-1", targetHandle: "p0" },
    { id: "e2", source: "switch-1", target: "dhcp-server", sourceHandle: "p1" },
    { id: "e3", source: "switch-1", target: "dns-server", sourceHandle: "p2" },
    { id: "e4", source: "switch-1", target: "web-server", sourceHandle: "p3" },
  ],
  areas: [],
  routeTables: new Map(),
};

export const DHCP_DNS_DEMO_TOPOLOGY = TOPOLOGY;

function buildHttpPacket(runtimeIp: string | null): InFlightPacket {
  return {
    id: `http-web-fetch-${Date.now()}`,
    srcNodeId: "dhcp-client",
    dstNodeId: "web-server",
    frame: {
      layer: "L2",
      srcMac: "00:00:00:00:00:01",
      dstMac: "00:00:00:00:00:02",
      etherType: 0x0800,
      payload: {
        layer: "L3",
        srcIp: runtimeIp ?? "0.0.0.0",
        dstIp: "192.168.1.10",
        ttl: 64,
        protocol: 6,
        payload: {
          layer: "L4",
          srcPort: 49152,
          dstPort: 80,
          seq: 0,
          ack: 0,
          flags: {
            syn: false,
            ack: false,
            fin: false,
            rst: false,
            psh: true,
            urg: false,
          },
          payload: {
            layer: "L7",
            httpVersion: "HTTP/1.1",
            method: "GET",
            url: "http://web.example.com/api",
            headers: { host: "web.example.com" },
          },
        },
      },
    },
    currentDeviceId: "dhcp-client",
    ingressPortId: "",
    path: [],
    timestamp: Date.now(),
  };
}

function DhcpDnsDemoInner() {
  const { engine, simulateDhcp, sendPacket } = useSimulation();

  const handleRunDhcp = async () => {
    engine.clear();
    await simulateDhcp("dhcp-client");
  };

  const handleResolveAndFetch = async () => {
    engine.clearTraces();
    await sendPacket(buildHttpPacket(engine.getRuntimeNodeIp("dhcp-client")));
  };

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
        <NetlabCanvas />

        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
            zIndex: 20,
          }}
        >
          <button
            type="button"
            onClick={() => void handleRunDhcp()}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "none",
              background: "var(--netlab-accent-blue)",
              color: "#fff",
              fontFamily: "monospace",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Run DHCP
          </button>
          <button
            type="button"
            onClick={() => void handleResolveAndFetch()}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid var(--netlab-border-subtle)",
              background: "var(--netlab-bg-panel)",
              color: "var(--netlab-text-primary)",
              fontFamily: "monospace",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Resolve DNS + Fetch
          </button>
          <span
            style={{
              color: "var(--netlab-text-muted)",
              fontFamily: "monospace",
              fontSize: 11,
            }}
          >
            Click a node to inspect runtime DHCP/DNS state.
          </span>
        </div>
      </div>

      <ResizableSidebar
        defaultWidth={420}
        maxWidth={700}
        style={{
          background: "#0f172a",
          borderLeft: "1px solid #1e293b",
        }}
      >
        <StepControls />
      </ResizableSidebar>
    </div>
  );
}

export default function DhcpDnsDemo() {
  return (
    <DemoShell
      title="DHCP & DNS"
      desc="Lease an IP with DHCP, resolve a hostname with DNS, then inspect each service trace."
    >
      <NetlabProvider topology={TOPOLOGY}>
        <SimulationProvider>
          <DhcpDnsDemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
