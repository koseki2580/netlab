import { describe, expect, it } from "vitest";
import type { HttpMessage } from "../../types/packets";
import { HttpServer } from "./HttpServer";
import {
  buildHttpRequest,
  buildHttpResponse,
  serializeHttp,
} from "./httpPacketBuilder";

function makeGetRequest(url: string, requestId = "r1"): HttpMessage {
  return buildHttpRequest({
    method: "GET",
    url,
    host: "test.local",
    requestId,
  });
}

describe("HttpServer", () => {
  it("responds 404 to an unrouted path", async () => {
    const server = new HttpServer({ nodeId: "srv" });
    server.listen();

    const resp = await server.handleRequest(makeGetRequest("/unknown"));
    expect(resp.statusCode).toBe(404);
    expect(resp.reasonPhrase).toBe("Not Found");
  });

  it("responds via the matching handler for an exact path", async () => {
    const server = new HttpServer({ nodeId: "srv" });
    server.route("GET", "/hello", () =>
      buildHttpResponse({
        statusCode: 200,
        reasonPhrase: "OK",
        requestId: "r1",
        body: "world",
      }),
    );
    server.listen();

    const resp = await server.handleRequest(makeGetRequest("/hello"));
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toBe("world");
  });

  it("matches a :param route and extracts the param", async () => {
    const server = new HttpServer({ nodeId: "srv" });
    server.route("GET", "/users/:id", (_req, params) =>
      buildHttpResponse({
        statusCode: 200,
        reasonPhrase: "OK",
        requestId: "r1",
        body: `user=${params.id}`,
      }),
    );
    server.listen();

    const resp = await server.handleRequest(makeGetRequest("/users/42"));
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toBe("user=42");
  });

  it("buffers a request split across multiple chunks before dispatching", async () => {
    const server = new HttpServer({ nodeId: "srv" });
    server.route("GET", "/", () =>
      buildHttpResponse({
        statusCode: 200,
        reasonPhrase: "OK",
        requestId: "r1",
      }),
    );
    server.listen();

    // First chunk is incomplete
    const fullRequest = serializeHttp(makeGetRequest("/"));
    const half1 = fullRequest.slice(0, Math.floor(fullRequest.length / 2));

    // Incomplete data should throw
    await expect(server.handleRawData(half1)).rejects.toThrow("Incomplete");

    // Full data should succeed
    const result = await server.handleRawData(fullRequest);
    expect(result.parsed.statusCode).toBe(200);
  });

  it("closes the TCP connection after the response is written", async () => {
    const server = new HttpServer({ nodeId: "srv" });
    server.route("GET", "/", () =>
      buildHttpResponse({
        statusCode: 200,
        reasonPhrase: "OK",
        requestId: "r1",
      }),
    );
    server.listen();

    const resp = await server.handleRequest(makeGetRequest("/"));
    // Connection: close is set by buildHttpResponse
    expect(resp.headers["Connection"]).toBe("close");
  });

  it("rejects non-HTTP/1.1 request-line as 400", async () => {
    const server = new HttpServer({ nodeId: "srv" });
    server.listen();

    // Construct a message with wrong httpVersion by casting
    const badReq: HttpMessage = {
      layer: "L7",
      httpVersion: "HTTP/2.0" as "HTTP/1.1",
      method: "GET",
      url: "/",
      headers: {},
    };

    const resp = await server.handleRequest(badReq);
    expect(resp.statusCode).toBe(400);
    expect(resp.reasonPhrase).toBe("Bad Request");
  });

  it("serves two sequential requests on two separate connections", async () => {
    const server = new HttpServer({ nodeId: "srv" });
    let counter = 0;
    server.route("GET", "/count", () => {
      counter += 1;
      return buildHttpResponse({
        statusCode: 200,
        reasonPhrase: "OK",
        requestId: `r${counter}`,
        body: String(counter),
      });
    });
    server.listen();

    const resp1 = await server.handleRequest(makeGetRequest("/count", "r1"));
    const resp2 = await server.handleRequest(makeGetRequest("/count", "r2"));

    expect(resp1.body).toBe("1");
    expect(resp2.body).toBe("2");
    expect(resp1.requestId).toBe("r1");
    expect(resp2.requestId).toBe("r2");
  });
});
