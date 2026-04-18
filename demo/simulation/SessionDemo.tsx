import { useMemo, useState, type CSSProperties } from "react";
import { NetlabCanvas } from "../../src/components/NetlabCanvas";
import { useNetlabContext } from "../../src/components/NetlabContext";
import { NetlabProvider } from "../../src/components/NetlabProvider";
import { ResizableSidebar } from "../../src/components/ResizableSidebar";
import { FailureTogglePanel } from "../../src/components/simulation/FailureTogglePanel";
import { SessionDetail } from "../../src/components/simulation/SessionDetail";
import { SessionList } from "../../src/components/simulation/SessionList";
import {
  FailureProvider,
  useFailure,
} from "../../src/simulation/FailureContext";
import {
  SessionProvider,
  useSession,
} from "../../src/simulation/SessionContext";
import {
  SimulationProvider,
  useSimulation,
} from "../../src/simulation/SimulationContext";
import type { SimulationEngine } from "../../src/simulation/SimulationEngine";
import type { HttpMessage, InFlightPacket } from "../../src/types/packets";
import type { PacketTrace } from "../../src/types/simulation";
import type { NetworkTopology } from "../../src/types/topology";
import DemoShell from "../DemoShell";

export const SESSION_DEMO_TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: "client",
      type: "client",
      position: { x: 90, y: 220 },
      data: {
        label: "Client",
        role: "client",
        layerId: "l7",
        ip: "192.168.1.10",
      },
    },
    {
      id: "r1",
      type: "router",
      position: { x: 320, y: 220 },
      data: {
        label: "R1",
        role: "router",
        layerId: "l3",
        interfaces: [
          {
            id: "eth0",
            name: "eth0",
            ipAddress: "192.168.1.1",
            prefixLength: 24,
            macAddress: "00:00:00:01:00:00",
          },
          {
            id: "eth1",
            name: "eth1",
            ipAddress: "10.0.1.1",
            prefixLength: 30,
            macAddress: "00:00:00:01:00:01",
          },
        ],
        staticRoutes: [
          { destination: "192.168.1.0/24", nextHop: "direct" },
          { destination: "10.0.1.0/30", nextHop: "direct" },
          { destination: "10.0.0.0/24", nextHop: "10.0.1.2" },
          { destination: "0.0.0.0/0", nextHop: "10.0.1.2" },
        ],
      },
    },
    {
      id: "r2",
      type: "router",
      position: { x: 550, y: 220 },
      data: {
        label: "R2",
        role: "router",
        layerId: "l3",
        interfaces: [
          {
            id: "eth0",
            name: "eth0",
            ipAddress: "10.0.1.2",
            prefixLength: 30,
            macAddress: "00:00:00:02:00:00",
          },
          {
            id: "eth1",
            name: "eth1",
            ipAddress: "10.0.0.1",
            prefixLength: 24,
            macAddress: "00:00:00:02:00:01",
          },
        ],
        staticRoutes: [
          { destination: "10.0.1.0/30", nextHop: "direct" },
          { destination: "10.0.0.0/24", nextHop: "direct" },
          { destination: "192.168.1.0/24", nextHop: "10.0.1.1" },
          { destination: "0.0.0.0/0", nextHop: "10.0.1.1" },
        ],
      },
    },
    {
      id: "server",
      type: "server",
      position: { x: 780, y: 220 },
      data: {
        label: "Server",
        role: "server",
        layerId: "l7",
        ip: "10.0.0.10",
      },
    },
  ],
  edges: [
    { id: "e1", source: "client", target: "r1" },
    { id: "e2", source: "r1", target: "r2" },
    { id: "e3", source: "r2", target: "server" },
  ],
  areas: [],
  routeTables: new Map(),
};

const BUTTON_BASE: CSSProperties = {
  padding: "6px 14px",
  border: "none",
  borderRadius: 5,
  cursor: "pointer",
  fontFamily: "monospace",
  fontSize: 12,
};

const BUTTON_PRIMARY: CSSProperties = {
  ...BUTTON_BASE,
  background: "#1d4ed8",
  color: "#fff",
};

const BUTTON_SECONDARY: CSSProperties = {
  ...BUTTON_BASE,
  background: "#1e293b",
  color: "#cbd5e1",
  border: "1px solid #334155",
};

const BUTTON_DISABLED: CSSProperties = {
  ...BUTTON_BASE,
  background: "#0f172a",
  color: "#475569",
  border: "1px solid #1e293b",
  cursor: "not-allowed",
};

function makeSessionId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}`;
}

function resolveNodeIp(
  topology: NetworkTopology,
  nodeId: string,
): string | null {
  const node = topology.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return null;
  if (typeof node.data.ip === "string") return node.data.ip;
  return node.data.interfaces?.[0]?.ipAddress ?? null;
}

function buildHttpPacket(
  topology: NetworkTopology,
  opts: {
    id: string;
    sessionId: string;
    srcNodeId: string;
    dstNodeId: string;
    payload: HttpMessage;
  },
): InFlightPacket | null {
  const srcIp = resolveNodeIp(topology, opts.srcNodeId);
  const dstIp = resolveNodeIp(topology, opts.dstNodeId);
  if (!srcIp || !dstIp) return null;

  return {
    id: opts.id,
    sessionId: opts.sessionId,
    srcNodeId: opts.srcNodeId,
    dstNodeId: opts.dstNodeId,
    frame: {
      layer: "L2",
      srcMac: "00:00:00:00:00:01",
      dstMac: "00:00:00:00:00:02",
      etherType: 0x0800,
      payload: {
        layer: "L3",
        srcIp,
        dstIp,
        ttl: 64,
        protocol: 6,
        payload: {
          layer: "L4",
          srcPort: 12345,
          dstPort: 80,
          seq: 0,
          ack: 0,
          flags: {
            syn: false,
            ack: true,
            fin: false,
            rst: false,
            psh: true,
            urg: false,
          },
          payload: opts.payload,
        },
      },
    },
    currentDeviceId: opts.srcNodeId,
    ingressPortId: "",
    path: [],
    timestamp: Date.now(),
  };
}

function findTrace(
  engine: SimulationEngine,
  packetId: string,
): PacketTrace | undefined {
  return engine.getState().traces.find((trace) => trace.packetId === packetId);
}

async function flushCurrentTrace(engine: SimulationEngine): Promise<void> {
  const state = engine.getState();
  if (!state.currentTraceId) return;

  while (engine.getState().status !== "done") {
    engine.step();
    await Promise.resolve();
  }
}

function SessionDemoInner() {
  const { topology, hookEngine } = useNetlabContext();
  const { engine, sendPacket } = useSimulation();
  const { sessions, startSession, attachTrace, selectSession, clearSessions } =
    useSession();
  const { failureState, resetFailures } = useFailure();
  const [isSending, setIsSending] = useState(false);

  const failureCount = useMemo(
    () =>
      failureState.downNodeIds.size +
      failureState.downEdgeIds.size +
      failureState.downInterfaceIds.size,
    [failureState],
  );

  const handleSend = async () => {
    if (isSending) return;

    setIsSending(true);

    const sessionId = makeSessionId();
    startSession(sessionId, {
      srcNodeId: "client",
      dstNodeId: "server",
      protocol: "HTTP",
      requestType: "GET /api/data",
    });
    selectSession(sessionId);

    try {
      const request = new Request("https://netlab.local/api/data", {
        method: "GET",
      });
      const response = new Response(
        JSON.stringify({ ok: true, source: "server" }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );

      await hookEngine.emit("fetch:intercept", {
        request,
        nodeId: "client",
        sessionId,
      });

      const requestPacket = buildHttpPacket(topology, {
        id: `req-${sessionId}`,
        sessionId,
        srcNodeId: "client",
        dstNodeId: "server",
        payload: {
          layer: "L7",
          httpVersion: "HTTP/1.1",
          method: "GET",
          url: "/api/data",
          headers: { host: "netlab.local" },
        },
      });
      if (!requestPacket) return;

      await sendPacket(requestPacket);
      await flushCurrentTrace(engine);

      const requestTrace = findTrace(engine, requestPacket.id);
      if (!requestTrace) return;
      attachTrace(sessionId, requestTrace, "request");

      if (requestTrace.status !== "delivered") {
        return;
      }

      await hookEngine.emit("fetch:respond", {
        request,
        response,
        nodeId: "server",
        sessionId,
      });

      const responsePacket = buildHttpPacket(topology, {
        id: `res-${sessionId}`,
        sessionId,
        srcNodeId: "server",
        dstNodeId: "client",
        payload: {
          httpVersion: "HTTP/1.1",
          layer: "L7",
          statusCode: 200,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ok: true, source: "server" }),
        },
      });
      if (!responsePacket) return;

      await sendPacket(responsePacket);
      await flushCurrentTrace(engine);

      const responseTrace = findTrace(engine, responsePacket.id);
      if (responseTrace) {
        attachTrace(sessionId, responseTrace, "response");
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleClear = () => {
    clearSessions();
    resetFailures();
    engine.reset();
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
          }}
        >
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={isSending}
            style={isSending ? BUTTON_DISABLED : BUTTON_PRIMARY}
          >
            {isSending ? "Sending..." : "Send Request"}
          </button>

          <button type="button" onClick={handleClear} style={BUTTON_SECONDARY}>
            Clear
          </button>

          <span
            style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: 11 }}
          >
            {sessions.length} session{sessions.length === 1 ? "" : "s"}
            {failureCount > 0
              ? ` · ${failureCount} failure${failureCount === 1 ? "" : "s"} active`
              : ""}
          </span>
        </div>
      </div>

      <ResizableSidebar
        defaultWidth={460}
        maxWidth={760}
        style={{
          background: "#0f172a",
          borderLeft: "1px solid #1e293b",
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
          <div style={{ padding: 12, minHeight: 180, maxHeight: 220 }}>
            <SessionList />
          </div>

          <div style={{ flex: 1, minHeight: 0, padding: "0 12px 12px" }}>
            <SessionDetail />
          </div>

          <div
            style={{
              borderTop: "1px solid #1e293b",
              padding: 12,
              minHeight: 220,
              maxHeight: 320,
            }}
          >
            <FailureTogglePanel />
          </div>
        </div>
      </ResizableSidebar>
    </div>
  );
}

export default function SessionDemo() {
  return (
    <DemoShell
      title="Session Inspector"
      desc="Correlate request and response traces into one session lifecycle"
    >
      <NetlabProvider topology={SESSION_DEMO_TOPOLOGY}>
        <FailureProvider>
          <SimulationProvider>
            <SessionProvider>
              <SessionDemoInner />
            </SessionProvider>
          </SimulationProvider>
        </FailureProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
