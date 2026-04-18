import { useMemo, useState, type CSSProperties } from "react";
import { NetlabCanvas } from "../../src/components/NetlabCanvas";
import { useNetlabContext } from "../../src/components/NetlabContext";
import { NetlabProvider } from "../../src/components/NetlabProvider";
import { ResizableSidebar } from "../../src/components/ResizableSidebar";
import { SessionDetail } from "../../src/components/simulation/SessionDetail";
import { SessionList } from "../../src/components/simulation/SessionList";
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

// ────────────────────────────────────────────────
// Topology: Client → Router → Server (port 80)
// ────────────────────────────────────────────────

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: "client-1",
      type: "client",
      position: { x: 90, y: 200 },
      data: {
        label: "Client",
        role: "client",
        layerId: "l7",
        ip: "192.168.1.10",
      },
    },
    {
      id: "router-1",
      type: "router",
      position: { x: 350, y: 200 },
      data: {
        label: "Router",
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
            ipAddress: "10.0.0.1",
            prefixLength: 24,
            macAddress: "00:00:00:01:00:01",
          },
        ],
        staticRoutes: [
          { destination: "192.168.1.0/24", nextHop: "direct" },
          { destination: "10.0.0.0/24", nextHop: "direct" },
        ],
      },
    },
    {
      id: "server-1",
      type: "server",
      position: { x: 610, y: 200 },
      data: {
        label: "Server",
        role: "server",
        layerId: "l7",
        ip: "10.0.0.10",
      },
    },
  ],
  edges: [
    {
      id: "e1",
      source: "client-1",
      target: "router-1",
      data: { sourcePort: "", targetPort: "eth0" },
    },
    {
      id: "e2",
      source: "router-1",
      target: "server-1",
      data: { sourcePort: "eth1", targetPort: "" },
    },
  ],
  areas: [],
  routeTables: new Map(),
};

// ────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────

const BUTTON_BASE: CSSProperties = {
  fontFamily: "monospace",
  fontSize: 12,
  padding: "6px 14px",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
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

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────

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
  const node = topology.nodes.find((n) => n.id === nodeId);
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
          srcPort: 49152,
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
  return engine.getState().traces.find((t) => t.packetId === packetId);
}

async function flushCurrentTrace(engine: SimulationEngine): Promise<void> {
  const state = engine.getState();
  if (!state.currentTraceId) return;
  while (engine.getState().status !== "done") {
    engine.step();
    await Promise.resolve();
  }
}

// ────────────────────────────────────────────────
// Server routes (simulated)
// ────────────────────────────────────────────────

function resolveServerResponse(
  method: string,
  url: string,
  requestBody?: string,
): {
  statusCode: number;
  reasonPhrase: string;
  body: string;
  headers: Record<string, string>;
} {
  if (method === "GET" && url === "/") {
    return {
      statusCode: 200,
      reasonPhrase: "OK",
      body: "Hello, netlab",
      headers: { "Content-Type": "text/plain" },
    };
  }

  const userMatch = url.match(/^\/users\/(.+)$/);
  if (method === "GET" && userMatch) {
    return {
      statusCode: 200,
      reasonPhrase: "OK",
      body: JSON.stringify({ user: userMatch[1] }),
      headers: { "Content-Type": "application/json" },
    };
  }

  if (method === "POST" && url === "/echo") {
    return {
      statusCode: 200,
      reasonPhrase: "OK",
      body: requestBody ?? "",
      headers: { "Content-Type": "text/plain" },
    };
  }

  return {
    statusCode: 404,
    reasonPhrase: "Not Found",
    body: "Not Found",
    headers: { "Content-Type": "text/plain" },
  };
}

// ────────────────────────────────────────────────
// Inner component
// ────────────────────────────────────────────────

function HttpDemoInner() {
  const { topology } = useNetlabContext();
  const { engine, sendPacket } = useSimulation();
  const { sessions, startSession, attachTrace, selectSession, clearSessions } =
    useSession();
  const [isSending, setIsSending] = useState(false);
  const [lastResponseBody, setLastResponseBody] = useState<string | null>(null);

  const sessionCount = useMemo(() => sessions.length, [sessions]);

  const sendHttp = async (method: string, url: string, body?: string) => {
    if (isSending) return;
    setIsSending(true);
    setLastResponseBody(null);

    const sessionId = makeSessionId();
    const requestHeaders: Record<string, string> = {
      Host: "10.0.0.10",
      "User-Agent": "netlab/0.1",
      Connection: "close",
    };
    if (body) {
      requestHeaders["Content-Length"] = String(body.length);
      requestHeaders["Content-Type"] = "text/plain";
    }

    startSession(sessionId, {
      srcNodeId: "client-1",
      dstNodeId: "server-1",
      protocol: "HTTP",
      requestType: `${method} ${url}`,
    });
    selectSession(sessionId);

    try {
      // --- Send request ---
      const requestPayload: HttpMessage = {
        layer: "L7",
        httpVersion: "HTTP/1.1",
        method: method as HttpMessage["method"],
        url,
        headers: requestHeaders,
        body,
      };

      const requestPacket = buildHttpPacket(topology, {
        id: `req-${sessionId}`,
        sessionId,
        srcNodeId: "client-1",
        dstNodeId: "server-1",
        payload: requestPayload,
      });
      if (!requestPacket) return;

      await sendPacket(requestPacket);
      await flushCurrentTrace(engine);

      const requestTrace = findTrace(engine, requestPacket.id);
      if (requestTrace) {
        attachTrace(sessionId, requestTrace, "request");
      }

      if (!requestTrace || requestTrace.status !== "delivered") return;

      // --- Resolve server response ---
      const response = resolveServerResponse(method, url, body);

      // --- Update session with HTTP metadata ---
      const session = sessions.find((s) => s.sessionId === sessionId) ?? {
        httpMeta: undefined,
      };
      if (!session.httpMeta) {
        // Mutate the session to inject httpMeta (the session is already tracked)
        const tracked = sessions.find((s) => s.sessionId === sessionId);
        if (tracked) {
          tracked.httpMeta = {
            method,
            path: url,
            statusCode: response.statusCode,
            requestHeaders,
            responseHeaders: {
              ...response.headers,
              Server: "netlab/0.1",
              Connection: "close",
            },
            requestBody: body,
            responseBody: response.body,
          };
        }
      }

      // --- Send response ---
      const responsePayload: HttpMessage = {
        layer: "L7",
        httpVersion: "HTTP/1.1",
        statusCode: response.statusCode,
        reasonPhrase: response.reasonPhrase,
        headers: {
          ...response.headers,
          Server: "netlab/0.1",
          Connection: "close",
        },
        body: response.body,
      };

      const responsePacket = buildHttpPacket(topology, {
        id: `res-${sessionId}`,
        sessionId,
        srcNodeId: "server-1",
        dstNodeId: "client-1",
        payload: responsePayload,
      });
      if (!responsePacket) return;

      await sendPacket(responsePacket);
      await flushCurrentTrace(engine);

      const responseTrace = findTrace(engine, responsePacket.id);
      if (responseTrace) {
        attachTrace(sessionId, responseTrace, "response");
      }

      setLastResponseBody(response.body);
    } finally {
      setIsSending(false);
    }
  };

  const handleClear = () => {
    clearSessions();
    engine.reset();
    setLastResponseBody(null);
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
            onClick={() => void sendHttp("GET", "/")}
            disabled={isSending}
            style={isSending ? BUTTON_DISABLED : BUTTON_PRIMARY}
          >
            GET /
          </button>
          <button
            type="button"
            onClick={() => void sendHttp("GET", "/users/42")}
            disabled={isSending}
            style={isSending ? BUTTON_DISABLED : BUTTON_PRIMARY}
          >
            GET /users/42
          </button>
          <button
            type="button"
            onClick={() => void sendHttp("POST", "/echo", "A".repeat(3000))}
            disabled={isSending}
            style={isSending ? BUTTON_DISABLED : BUTTON_PRIMARY}
          >
            POST /echo (3 KB)
          </button>
          <button type="button" onClick={handleClear} style={BUTTON_SECONDARY}>
            Clear
          </button>

          <span
            style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: 11 }}
          >
            {sessionCount} session{sessionCount === 1 ? "" : "s"}
          </span>
        </div>

        {lastResponseBody != null && (
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              right: 12,
              maxHeight: 100,
              overflow: "auto",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 6,
              padding: "8px 12px",
              fontFamily: "monospace",
              fontSize: 11,
              color: "#94a3b8",
            }}
          >
            <span style={{ color: "#475569", marginRight: 8 }}>Response:</span>
            {lastResponseBody.length > 200
              ? `${lastResponseBody.slice(0, 200)}…`
              : lastResponseBody}
          </div>
        )}
      </div>

      <ResizableSidebar defaultWidth={340} minWidth={280} maxWidth={600}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            height: "100%",
          }}
        >
          <div style={{ flex: "0 0 auto", maxHeight: "40%", overflow: "auto" }}>
            <SessionList />
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <SessionDetail />
          </div>
        </div>
      </ResizableSidebar>
    </div>
  );
}

// ────────────────────────────────────────────────
// Wrapper
// ────────────────────────────────────────────────

export default function HttpDemo() {
  return (
    <DemoShell
      title="HTTP/1.1 Request-Response"
      desc="HTTP is a line-based protocol on top of TCP. Notice how one request uses one TCP connection when Connection: close is set."
    >
      <NetlabProvider topology={TOPOLOGY}>
        <SimulationProvider>
          <SessionProvider>
            <HttpDemoInner />
          </SessionProvider>
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
