import { describe, expect, it } from "vitest";
import {
  buildHttpRequest,
  buildHttpResponse,
  serializeHttp,
} from "./httpPacketBuilder";

describe("buildHttpRequest", () => {
  it("sets method and url from options", () => {
    const msg = buildHttpRequest({
      method: "GET",
      url: "/index.html",
      host: "example.com",
    });
    expect(msg.method).toBe("GET");
    expect(msg.url).toBe("/index.html");
  });

  it("sets Host header from options.host", () => {
    const msg = buildHttpRequest({
      method: "GET",
      url: "/",
      host: "netlab.local",
    });
    expect(msg.headers["Host"]).toBe("netlab.local");
  });

  it("sets Connection: close", () => {
    const msg = buildHttpRequest({ method: "GET", url: "/", host: "x" });
    expect(msg.headers["Connection"]).toBe("close");
  });

  it("sets User-Agent: netlab/0.1 by default", () => {
    const msg = buildHttpRequest({ method: "GET", url: "/", host: "x" });
    expect(msg.headers["User-Agent"]).toBe("netlab/0.1");
  });

  it("respects User-Agent override in options.headers", () => {
    const msg = buildHttpRequest({
      method: "GET",
      url: "/",
      host: "x",
      headers: { "User-Agent": "custom/2.0" },
    });
    expect(msg.headers["User-Agent"]).toBe("custom/2.0");
  });

  it("canonicalizes header keys to Title-Case", () => {
    const msg = buildHttpRequest({
      method: "POST",
      url: "/submit",
      host: "x",
      headers: { "content-type": "text/plain" },
    });
    expect(msg.headers["Content-Type"]).toBe("text/plain");
    expect(msg.headers["content-type"]).toBeUndefined();
  });

  it("sets Content-Length when body is present", () => {
    const msg = buildHttpRequest({
      method: "POST",
      url: "/data",
      host: "x",
      body: "hello",
    });
    expect(msg.headers["Content-Length"]).toBe("5");
  });

  it("sets Content-Length: 0 when body is absent", () => {
    const msg = buildHttpRequest({ method: "GET", url: "/", host: "x" });
    expect(msg.headers["Content-Length"]).toBe("0");
  });

  it("generates a deterministic-format requestId when omitted", () => {
    const msg = buildHttpRequest({ method: "GET", url: "/", host: "x" });
    expect(msg.requestId).toMatch(/^req-[0-9a-f]+$/);
  });

  it("uses the provided requestId when given", () => {
    const msg = buildHttpRequest({
      method: "GET",
      url: "/",
      host: "x",
      requestId: "my-req-1",
    });
    expect(msg.requestId).toBe("my-req-1");
  });

  it("sets httpVersion to HTTP/1.1", () => {
    const msg = buildHttpRequest({ method: "GET", url: "/", host: "x" });
    expect(msg.httpVersion).toBe("HTTP/1.1");
  });

  it("sets layer to L7", () => {
    const msg = buildHttpRequest({ method: "GET", url: "/", host: "x" });
    expect(msg.layer).toBe("L7");
  });
});

describe("buildHttpResponse", () => {
  it("sets statusCode and reasonPhrase from options", () => {
    const msg = buildHttpResponse({
      statusCode: 200,
      reasonPhrase: "OK",
      requestId: "r1",
    });
    expect(msg.statusCode).toBe(200);
    expect(msg.reasonPhrase).toBe("OK");
  });

  it("sets Server: netlab/0.1 by default", () => {
    const msg = buildHttpResponse({
      statusCode: 200,
      reasonPhrase: "OK",
      requestId: "r1",
    });
    expect(msg.headers["Server"]).toBe("netlab/0.1");
  });

  it("echoes options.requestId onto the response", () => {
    const msg = buildHttpResponse({
      statusCode: 404,
      reasonPhrase: "Not Found",
      requestId: "req-abc",
    });
    expect(msg.requestId).toBe("req-abc");
  });

  it("sets Content-Length when body is present", () => {
    const msg = buildHttpResponse({
      statusCode: 200,
      reasonPhrase: "OK",
      requestId: "r1",
      body: '{"ok":true}',
    });
    expect(msg.headers["Content-Length"]).toBe("11");
  });

  it("sets Content-Length: 0 when body is absent", () => {
    const msg = buildHttpResponse({
      statusCode: 204,
      reasonPhrase: "No Content",
      requestId: "r1",
    });
    expect(msg.headers["Content-Length"]).toBe("0");
  });

  it("sets httpVersion to HTTP/1.1", () => {
    const msg = buildHttpResponse({
      statusCode: 200,
      reasonPhrase: "OK",
      requestId: "r1",
    });
    expect(msg.httpVersion).toBe("HTTP/1.1");
  });
});

describe("serializeHttp", () => {
  it("serializes a GET request to a CRLF-delimited wire format", () => {
    const msg = buildHttpRequest({
      method: "GET",
      url: "/path",
      host: "example.com",
    });
    const wire = serializeHttp(msg);
    expect(wire).toContain("GET /path HTTP/1.1\r\n");
    expect(wire).toContain("Host: example.com\r\n");
  });

  it('emits request-line: "GET /path HTTP/1.1\\r\\n"', () => {
    const msg = buildHttpRequest({ method: "GET", url: "/path", host: "h" });
    const wire = serializeHttp(msg);
    const firstLine = wire.split("\r\n")[0];
    expect(firstLine).toBe("GET /path HTTP/1.1");
  });

  it('emits status-line: "HTTP/1.1 200 OK\\r\\n"', () => {
    const msg = buildHttpResponse({
      statusCode: 200,
      reasonPhrase: "OK",
      requestId: "r1",
    });
    const wire = serializeHttp(msg);
    const firstLine = wire.split("\r\n")[0];
    expect(firstLine).toBe("HTTP/1.1 200 OK");
  });

  it("emits a blank line between headers and body", () => {
    const msg = buildHttpResponse({
      statusCode: 200,
      reasonPhrase: "OK",
      requestId: "r1",
      body: "Hello",
    });
    const wire = serializeHttp(msg);
    expect(wire).toContain("\r\n\r\nHello");
  });

  it("emits body bytes after the blank line when present", () => {
    const msg = buildHttpRequest({
      method: "POST",
      url: "/submit",
      host: "x",
      body: '{"key":"val"}',
    });
    const wire = serializeHttp(msg);
    const parts = wire.split("\r\n\r\n");
    expect(parts[1]).toBe('{"key":"val"}');
  });
});
