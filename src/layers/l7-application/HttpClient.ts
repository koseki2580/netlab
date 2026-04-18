import type { DataTransferController } from "../../simulation/DataTransferController";
import type { SessionTracker } from "../../simulation/SessionTracker";
import type { FailureState } from "../../types/failure";
import type { HttpMessage } from "../../types/packets";
import type {
  TcpEventSink,
  TcpOrchestrator,
} from "../l4-transport/TcpOrchestrator";
import { generateEphemeralPort } from "../l4-transport/udpPacketBuilder";
import {
  buildHttpRequest,
  serializeHttp,
  type BuildHttpRequestOptions,
} from "./httpPacketBuilder";
import { parseHttp } from "./httpParser";
import type { HttpServer } from "./HttpServer";

export interface HttpClientDeps {
  orchestrator: TcpOrchestrator;
  dataController: DataTransferController;
  sessionTracker: SessionTracker;
}

export interface HttpRequestOptions extends BuildHttpRequestOptions {
  dstIp: string;
  srcIp?: string;
  dstPort?: number;
  failureState?: FailureState;
}

export class HttpClient {
  constructor(private deps: HttpClientDeps) {}

  async request(
    srcNodeId: string,
    dstNodeId: string,
    options: HttpRequestOptions,
    server: HttpServer,
  ): Promise<HttpMessage> {
    const dstPort = options.dstPort ?? 80;
    const ephPort = generateEphemeralPort(srcNodeId, `http-${Date.now()}`);

    // 1. Build HTTP request
    const httpReq = buildHttpRequest(options);
    const reqBytes = serializeHttp(httpReq);
    const sessionId = `http-${httpReq.requestId}`;

    // 2. Open session in SessionTracker
    this.deps.sessionTracker.startSession(sessionId, {
      srcNodeId,
      dstNodeId,
      protocol: "HTTP",
      requestType: httpReq.method ?? "GET",
    });

    // 3. TCP handshake
    const sink: TcpEventSink = {
      appendTrace: () => {},
      notify: () => {},
    };
    const handshakeResult = await this.deps.orchestrator.handshake(
      srcNodeId,
      dstNodeId,
      ephPort,
      dstPort,
      sink,
      options.failureState,
      sessionId,
    );

    if (!handshakeResult.success || !handshakeResult.connection) {
      throw new Error(
        `TCP handshake failed: ${handshakeResult.failureReason ?? "unknown"}`,
      );
    }

    // 4. Send request bytes (client → server)
    await this.deps.dataController.startTransfer(
      srcNodeId,
      dstNodeId,
      reqBytes,
      {
        srcPort: ephPort,
        dstPort,
      },
    );

    // 5. Server processes request → response
    const httpResp = await server.handleRequest(httpReq);
    const respBytes = serializeHttp(httpResp);

    // 6. Send response bytes (server → client)
    await this.deps.dataController.startTransfer(
      dstNodeId,
      srcNodeId,
      respBytes,
      {
        srcPort: dstPort,
        dstPort: ephPort,
      },
    );

    // 7. Parse response from serialized bytes
    const parseResult = parseHttp(respBytes);
    if (parseResult.kind === "error") {
      throw new Error(`HTTP parse error: ${parseResult.reason}`);
    }
    if (parseResult.kind === "incomplete") {
      throw new Error("HTTP response incomplete");
    }

    // 8. TCP teardown
    await this.deps.orchestrator.teardown(
      handshakeResult.connection,
      sink,
      options.failureState,
    );

    // 9. Return parsed response
    return parseResult.message;
  }
}
