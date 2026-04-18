import { describe, expect, it } from "vitest";
import {
  buildHttpRequest,
  buildHttpResponse,
  serializeHttp,
} from "./httpPacketBuilder";
import { parseHttp } from "./httpParser";

describe("parseHttp — requests", () => {
  it("parses a minimal GET request", () => {
    const wire =
      "GET / HTTP/1.1\r\nHost: example.com\r\nContent-Length: 0\r\n\r\n";
    const result = parseHttp(wire);
    expect(result.kind).toBe("request");
    if (result.kind === "request") {
      expect(result.message.method).toBe("GET");
      expect(result.message.url).toBe("/");
      expect(result.message.httpVersion).toBe("HTTP/1.1");
      expect(result.message.headers["Host"]).toBe("example.com");
    }
  });

  it("parses a POST request with body", () => {
    const body = '{"key":"value"}';
    const wire = `POST /submit HTTP/1.1\r\nHost: x\r\nContent-Length: ${body.length}\r\n\r\n${body}`;
    const result = parseHttp(wire);
    expect(result.kind).toBe("request");
    if (result.kind === "request") {
      expect(result.message.method).toBe("POST");
      expect(result.message.url).toBe("/submit");
      expect(result.message.body).toBe(body);
    }
  });

  it("parses headers with mixed-case keys", () => {
    const wire =
      "GET / HTTP/1.1\r\ncontent-type: text/plain\r\nX-Custom: yes\r\n\r\n";
    const result = parseHttp(wire);
    expect(result.kind).toBe("request");
    if (result.kind === "request") {
      expect(result.message.headers["content-type"]).toBe("text/plain");
      expect(result.message.headers["X-Custom"]).toBe("yes");
    }
  });

  it("returns incomplete when headers are truncated mid-field", () => {
    const wire = "GET / HTTP/1.1\r\nHost: exam";
    const result = parseHttp(wire);
    expect(result.kind).toBe("incomplete");
  });

  it("returns incomplete when body is shorter than Content-Length", () => {
    const wire = "POST / HTTP/1.1\r\nContent-Length: 100\r\n\r\nshort";
    const result = parseHttp(wire);
    expect(result.kind).toBe("incomplete");
  });

  it("returns error on missing HTTP version", () => {
    const wire = "GET /path XTTP/1.1\r\n\r\n";
    const result = parseHttp(wire);
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.reason).toContain("Missing HTTP version");
    }
  });

  it("returns error on unknown HTTP version", () => {
    const wire = "GET / HTTP/2.0\r\n\r\n";
    const result = parseHttp(wire);
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.reason).toContain("Unsupported HTTP version");
    }
  });
});

describe("parseHttp — responses", () => {
  it("parses a 200 OK with body", () => {
    const body = "Hello World";
    const wire = `HTTP/1.1 200 OK\r\nContent-Length: ${body.length}\r\n\r\n${body}`;
    const result = parseHttp(wire);
    expect(result.kind).toBe("response");
    if (result.kind === "response") {
      expect(result.message.statusCode).toBe(200);
      expect(result.message.reasonPhrase).toBe("OK");
      expect(result.message.body).toBe(body);
    }
  });

  it("parses a 404 Not Found without body", () => {
    const wire = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n";
    const result = parseHttp(wire);
    expect(result.kind).toBe("response");
    if (result.kind === "response") {
      expect(result.message.statusCode).toBe(404);
      expect(result.message.reasonPhrase).toBe("Not Found");
      expect(result.message.body).toBeUndefined();
    }
  });

  it("parses multiple headers preserved in order", () => {
    const wire =
      "HTTP/1.1 200 OK\r\nX-First: 1\r\nX-Second: 2\r\nContent-Length: 0\r\n\r\n";
    const result = parseHttp(wire);
    expect(result.kind).toBe("response");
    if (result.kind === "response") {
      expect(result.message.headers["X-First"]).toBe("1");
      expect(result.message.headers["X-Second"]).toBe("2");
    }
  });

  it("extracts reasonPhrase as-is", () => {
    const wire =
      "HTTP/1.1 503 Service Unavailable\r\nContent-Length: 0\r\n\r\n";
    const result = parseHttp(wire);
    expect(result.kind).toBe("response");
    if (result.kind === "response") {
      expect(result.message.reasonPhrase).toBe("Service Unavailable");
    }
  });
});

describe("parseHttp — incremental", () => {
  it("returns consumed=<bytes> so caller can advance the buffer", () => {
    const wire = "GET / HTTP/1.1\r\nContent-Length: 0\r\n\r\nEXTRA";
    const result = parseHttp(wire);
    expect(result.kind).toBe("request");
    if (result.kind === "request") {
      expect(result.consumed).toBe(wire.length - "EXTRA".length);
      expect(wire.slice(result.consumed)).toBe("EXTRA");
    }
  });

  it("parses request then response if both present in sequence", () => {
    const req = "GET / HTTP/1.1\r\nContent-Length: 0\r\n\r\n";
    const resp = "HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nHi";
    const buffer = req + resp;

    const r1 = parseHttp(buffer);
    expect(r1.kind).toBe("request");
    if (r1.kind !== "request") return;
    expect(r1.consumed).toBe(req.length);

    const r2 = parseHttp(buffer.slice(r1.consumed));
    expect(r2.kind).toBe("response");
    if (r2.kind === "response") {
      expect(r2.message.statusCode).toBe(200);
      expect(r2.message.body).toBe("Hi");
    }
  });
});

describe("parseHttp — round-trip with builder + serializer", () => {
  it("round-trips a request through serialize → parse", () => {
    const original = buildHttpRequest({
      method: "POST",
      url: "/api",
      host: "test.local",
      body: "data",
    });
    const wire = serializeHttp(original);
    const result = parseHttp(wire);
    expect(result.kind).toBe("request");
    if (result.kind === "request") {
      expect(result.message.method).toBe("POST");
      expect(result.message.url).toBe("/api");
      expect(result.message.body).toBe("data");
    }
  });

  it("round-trips a response through serialize → parse", () => {
    const original = buildHttpResponse({
      statusCode: 201,
      reasonPhrase: "Created",
      requestId: "r1",
      body: '{"id":42}',
    });
    const wire = serializeHttp(original);
    const result = parseHttp(wire);
    expect(result.kind).toBe("response");
    if (result.kind === "response") {
      expect(result.message.statusCode).toBe(201);
      expect(result.message.reasonPhrase).toBe("Created");
      expect(result.message.body).toBe('{"id":42}');
    }
  });
});
