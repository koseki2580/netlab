import { useEffect, useRef, useState, type CSSProperties } from "react";
import { NetlabCanvas } from "../../src/components/NetlabCanvas";
import { NetlabProvider } from "../../src/components/NetlabProvider";
import { ResizableSidebar } from "../../src/components/ResizableSidebar";
import { HopInspector } from "../../src/components/simulation/HopInspector";
import { PacketTimeline } from "../../src/components/simulation/PacketTimeline";
import { TraceSummary } from "../../src/components/simulation/TraceSummary";
import { FailureProvider } from "../../src/simulation/FailureContext";
import {
  SimulationProvider,
  useSimulation,
} from "../../src/simulation/SimulationContext";
import type { InFlightPacket } from "../../src/types/packets";
import type { NetworkTopology } from "../../src/types/topology";
import { ipToMulticastMac } from "../../src/utils/multicastMac";
import DemoShell from "../DemoShell";

const MULTICAST_GROUP = "224.1.2.3";
const MULTICAST_MAC = ipToMulticastMac(MULTICAST_GROUP);
const MULTICAST_PORT = 7000;
const VLAN_10 = 10;

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: "sender",
      type: "client",
      position: { x: 80, y: 200 },
      data: {
        label: "Sender",
        role: "client",
        layerId: "l7",
        ip: "10.0.10.1",
        mac: "02:00:00:00:10:01",
      },
    },
    {
      id: "switch-1",
      type: "switch",
      position: { x: 360, y: 200 },
      data: {
        label: "SW1",
        role: "switch",
        layerId: "l2",
        vlans: [
          { vlanId: 10, name: "multicast-vlan" },
          { vlanId: 20, name: "isolated-vlan" },
        ],
        ports: [
          {
            id: "p1",
            name: "fa0/1",
            macAddress: "02:00:00:10:00:01",
            vlanMode: "access",
            accessVlan: 10,
          },
          {
            id: "p2",
            name: "fa0/2",
            macAddress: "02:00:00:10:00:02",
            vlanMode: "access",
            accessVlan: 10,
          },
          {
            id: "p3",
            name: "fa0/3",
            macAddress: "02:00:00:10:00:03",
            vlanMode: "access",
            accessVlan: 10,
          },
          {
            id: "p4",
            name: "fa0/4",
            macAddress: "02:00:00:10:00:04",
            vlanMode: "access",
            accessVlan: 20,
          },
        ],
      },
    },
    {
      id: "receiver-a",
      type: "client",
      position: { x: 640, y: 80 },
      data: {
        label: "Receiver-A",
        role: "client",
        layerId: "l7",
        ip: "10.0.10.11",
        mac: "02:00:00:00:10:11",
      },
    },
    {
      id: "receiver-b",
      type: "client",
      position: { x: 640, y: 200 },
      data: {
        label: "Receiver-B",
        role: "client",
        layerId: "l7",
        ip: "10.0.10.12",
        mac: "02:00:00:00:10:12",
      },
    },
    {
      id: "receiver-c",
      type: "client",
      position: { x: 640, y: 340 },
      data: {
        label: "Receiver-C",
        role: "client",
        layerId: "l7",
        ip: "10.0.20.21",
        mac: "02:00:00:00:20:21",
      },
    },
  ],
  edges: [
    {
      id: "e-sender",
      source: "sender",
      target: "switch-1",
      targetHandle: "p1",
      type: "smoothstep",
    },
    {
      id: "e-ra",
      source: "switch-1",
      target: "receiver-a",
      sourceHandle: "p2",
      type: "smoothstep",
    },
    {
      id: "e-rb",
      source: "switch-1",
      target: "receiver-b",
      sourceHandle: "p3",
      type: "smoothstep",
    },
    {
      id: "e-rc",
      source: "switch-1",
      target: "receiver-c",
      sourceHandle: "p4",
      type: "smoothstep",
    },
  ],
  areas: [],
  routeTables: new Map(),
};

/* ── Button styles ─────────────────────────────── */

const BTN_BASE: CSSProperties = {
  padding: "7px 12px",
  borderRadius: 6,
  border: "1px solid transparent",
  cursor: "pointer",
  fontFamily: "monospace",
  fontSize: 12,
  fontWeight: 700,
};

const BTN_PRIMARY: CSSProperties = {
  ...BTN_BASE,
  background: "#0f766e",
  color: "#f0fdfa",
};
const BTN_JOIN: CSSProperties = {
  ...BTN_BASE,
  background: "#065f46",
  color: "#d1fae5",
};
const BTN_LEAVE: CSSProperties = {
  ...BTN_BASE,
  background: "#7f1d1d",
  color: "#fee2e2",
};

/* ── Packet builder ─────────────────────────────── */

function buildMulticastPacket(
  srcNodeId: string,
  dstNodeId: string,
  srcIp: string,
): InFlightPacket {
  return {
    id: `mcast-${Date.now()}`,
    srcNodeId,
    dstNodeId,
    frame: {
      layer: "L2",
      srcMac: "00:00:00:00:00:00",
      dstMac: MULTICAST_MAC,
      etherType: 0x0800,
      payload: {
        layer: "L3",
        srcIp,
        dstIp: MULTICAST_GROUP,
        ttl: 64,
        protocol: 17,
        payload: {
          layer: "L4",
          srcPort: 5000,
          dstPort: MULTICAST_PORT,
          checksum: 0,
          payload: { layer: "raw", data: "multicast-demo" },
        },
      },
    },
    currentDeviceId: srcNodeId,
    ingressPortId: "",
    path: [],
    timestamp: Date.now(),
  };
}

/* ── Receiver info ──────────────────────────────── */

interface ReceiverInfo {
  id: string;
  label: string;
  portId: string;
  vlanId: number;
}

const RECEIVERS: ReceiverInfo[] = [
  { id: "receiver-a", label: "A", portId: "p2", vlanId: VLAN_10 },
  { id: "receiver-b", label: "B", portId: "p3", vlanId: VLAN_10 },
  { id: "receiver-c", label: "C", portId: "p4", vlanId: 20 },
];

/* ── Educational captions ───────────────────────── */

function getCaption(joined: Set<string>): string {
  const inVlan = ["receiver-a", "receiver-b"];
  const joinedInVlan = inVlan.filter((r) => joined.has(r));
  const cJoined = joined.has("receiver-c");

  if (joinedInVlan.length === 0) {
    return cJoined
      ? "Receiver-C joined but is in VLAN 20 — VLAN isolates multicast. Traffic floods to all VLAN 10 ports (no snooping entries)."
      : "No receivers have joined. The switch has no snooping entries, so multicast is flooded to all ports in the same VLAN.";
  }
  if (joinedInVlan.length === 1) {
    const who = joinedInVlan[0] === "receiver-a" ? "A" : "B";
    return `Only Receiver-${who} has joined. IGMP snooping restricts delivery to ${who}'s port — the other VLAN 10 port no longer receives the traffic.`;
  }
  return "Both A and B have joined. The switch forwards multicast to both ports in VLAN 10.";
}

/* ── Inner demo ─────────────────────────────────── */

function MulticastDemoInner() {
  const { engine, sendPacket, state } = useSimulation();
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const didAutoSend = useRef(false);

  const toggle = (receiver: ReceiverInfo) => {
    const isJoined = joined.has(receiver.id);
    if (isJoined) {
      engine.removeMulticastMembership(
        "switch-1",
        receiver.vlanId,
        MULTICAST_MAC,
        receiver.portId,
      );
      engine.removeJoinedGroup(receiver.id, MULTICAST_GROUP);
      setJoined((prev) => {
        const next = new Set(prev);
        next.delete(receiver.id);
        return next;
      });
    } else {
      engine.addMulticastMembership(
        "switch-1",
        receiver.vlanId,
        MULTICAST_MAC,
        receiver.portId,
      );
      engine.addJoinedGroup(receiver.id, MULTICAST_GROUP);
      setJoined((prev) => new Set(prev).add(receiver.id));
    }
  };

  const sendMulticast = async () => {
    engine.reset();
    // Send one packet per VLAN-10 receiver to trace the path
    const vlan10Receivers = ["receiver-a", "receiver-b"];
    for (const dstId of vlan10Receivers) {
      const pkt = buildMulticastPacket("sender", dstId, "10.0.10.1");
      await sendPacket(pkt);
    }
  };

  useEffect(() => {
    if (didAutoSend.current || state.status !== "idle") return;
    didAutoSend.current = true;
    void sendMulticast();
  }, [state.status]);

  const activeTrace = state.currentTraceId
    ? (state.traces.find((t) => t.packetId === state.currentTraceId) ?? null)
    : null;

  const lastHop = activeTrace?.hops[activeTrace.hops.length - 1];

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
        <NetlabCanvas />
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "rgba(15, 23, 42, 0.88)",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            color: "#cbd5e1",
            fontFamily: "monospace",
            fontSize: 11,
            maxWidth: 340,
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ color: "#f8fafc", fontWeight: 700, marginBottom: 4 }}>
            Multicast Demo
          </div>
          <div>{getCaption(joined)}</div>
          <div style={{ marginTop: 6, color: "#94a3b8" }}>
            Click <strong>SW1</strong> to inspect the multicast snooping table
            in the detail panel.
          </div>
        </div>
      </div>

      <ResizableSidebar
        defaultWidth={420}
        maxWidth={680}
        style={{
          background: "#0f172a",
          borderLeft: "1px solid #1e293b",
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
          <div
            style={{
              padding: 12,
              borderBottom: "1px solid #1e293b",
              display: "grid",
              gap: 10,
            }}
          >
            {/* Status cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              <div
                style={{
                  padding: 10,
                  borderRadius: 8,
                  background: "#111827",
                  border: "1px solid #1f2937",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#64748b",
                    fontFamily: "monospace",
                  }}
                >
                  GROUP
                </div>
                <div
                  style={{
                    marginTop: 4,
                    color: "#a78bfa",
                    fontFamily: "monospace",
                    fontWeight: 700,
                    fontSize: 11,
                  }}
                >
                  {MULTICAST_GROUP}
                </div>
              </div>
              <div
                style={{
                  padding: 10,
                  borderRadius: 8,
                  background: "#111827",
                  border: "1px solid #1f2937",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#64748b",
                    fontFamily: "monospace",
                  }}
                >
                  JOINED
                </div>
                <div
                  style={{
                    marginTop: 4,
                    color: joined.size > 0 ? "#86efac" : "#94a3b8",
                    fontFamily: "monospace",
                    fontWeight: 700,
                  }}
                >
                  {joined.size > 0
                    ? RECEIVERS.filter((r) => joined.has(r.id))
                        .map((r) => r.label)
                        .join(", ")
                    : "none"}
                </div>
              </div>
              <div
                style={{
                  padding: 10,
                  borderRadius: 8,
                  background: "#111827",
                  border: "1px solid #1f2937",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#64748b",
                    fontFamily: "monospace",
                  }}
                >
                  RESULT
                </div>
                <div
                  style={{
                    marginTop: 4,
                    color: lastHop?.event === "drop" ? "#fca5a5" : "#93c5fd",
                    fontFamily: "monospace",
                    fontWeight: 700,
                  }}
                >
                  {activeTrace?.status?.toUpperCase() ?? "IDLE"}
                </div>
              </div>
            </div>

            {/* Receiver join/leave controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {RECEIVERS.map((r) => {
                const isJoined = joined.has(r.id);
                const isOtherVlan = r.vlanId !== VLAN_10;
                return (
                  <div
                    key={r.id}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: isOtherVlan ? "#f59e0b" : "#cbd5e1",
                        width: 100,
                      }}
                    >
                      {r.label} (VLAN {r.vlanId})
                    </span>
                    <button
                      type="button"
                      onClick={() => toggle(r)}
                      style={isJoined ? BTN_LEAVE : BTN_JOIN}
                    >
                      {isJoined
                        ? `Leave ${MULTICAST_GROUP}`
                        : `Join ${MULTICAST_GROUP}`}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Send button */}
            <button
              type="button"
              onClick={() => void sendMulticast()}
              style={BTN_PRIMARY}
            >
              Send multicast UDP to {MULTICAST_GROUP}:{MULTICAST_PORT}
            </button>

            <div
              style={{
                fontSize: 11,
                color: "#94a3b8",
                fontFamily: "monospace",
              }}
            >
              {lastHop?.event === "drop"
                ? `Drop reason: ${lastHop.reason}`
                : "Use Join/Leave to control IGMP snooping entries, then send multicast to see the effect."}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: 12,
            }}
          >
            <TraceSummary />
            <div
              style={{
                flex: 1,
                minHeight: 0,
                background: "var(--netlab-bg-panel)",
                border: "1px solid var(--netlab-border-subtle)",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <PacketTimeline />
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <HopInspector />
            </div>
          </div>
        </div>
      </ResizableSidebar>
    </div>
  );
}

/* ── Wrapper ────────────────────────────────────── */

export default function MulticastDemo() {
  return (
    <DemoShell
      title="IGMPv2 Multicast Snooping"
      desc="L2 multicast forwarding with IGMP snooping — join/leave groups and observe VLAN-scoped delivery"
    >
      <NetlabProvider topology={TOPOLOGY}>
        <FailureProvider>
          <SimulationProvider autoRecompute>
            <MulticastDemoInner />
          </SimulationProvider>
        </FailureProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
