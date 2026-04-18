import { HTTP_USER_AGENT } from "../../types/http";
import type { HttpMessage } from "../../types/packets";

/* ------------------------------------------------------------------ */
/*  Options                                                            */
/* ------------------------------------------------------------------ */

export interface BuildHttpRequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE" | "HEAD";
  url: string;
  host: string;
  headers?: Record<string, string>;
  body?: string;
  requestId?: string;
}

export interface BuildHttpResponseOptions {
  statusCode: number;
  reasonPhrase: string;
  headers?: Record<string, string>;
  body?: string;
  requestId: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function generateRequestId(
  host: string,
  url: string,
  body: string | undefined,
): string {
  const nonce = String(Date.now());
  return `req-${hashString([host, url, body ?? "", nonce].join(":")).toString(16)}`;
}

/** Converts a header key to Title-Case: "content-length" → "Content-Length". */
function titleCase(key: string): string {
  return key.replace(/(?:^|-)(\w)/g, (_, c: string) =>
    _.replace(c, c.toUpperCase()),
  );
}

function mergeHeaders(
  defaults: Record<string, string>,
  overrides: Record<string, string> | undefined,
): Record<string, string> {
  const merged: Record<string, string> = {};
  const lowerMap = new Map<string, string>();

  // Apply defaults
  for (const [k, v] of Object.entries(defaults)) {
    const tc = titleCase(k);
    merged[tc] = v;
    lowerMap.set(k.toLowerCase(), tc);
  }

  // Apply overrides — match case-insensitively
  if (overrides) {
    for (const [k, v] of Object.entries(overrides)) {
      const lower = k.toLowerCase();
      const existing = lowerMap.get(lower);
      if (existing) {
        delete merged[existing];
      }
      const tc = titleCase(k);
      merged[tc] = v;
      lowerMap.set(lower, tc);
    }
  }

  return merged;
}

/* ------------------------------------------------------------------ */
/*  Builders                                                           */
/* ------------------------------------------------------------------ */

export function buildHttpRequest(o: BuildHttpRequestOptions): HttpMessage {
  const requestId = o.requestId ?? generateRequestId(o.host, o.url, o.body);
  const contentLength = String(o.body?.length ?? 0);

  const defaults: Record<string, string> = {
    Host: o.host,
    "User-Agent": HTTP_USER_AGENT,
    Accept: "*/*",
    Connection: "close",
    "Content-Length": contentLength,
  };

  return {
    layer: "L7",
    httpVersion: "HTTP/1.1",
    method: o.method,
    url: o.url,
    headers: mergeHeaders(defaults, o.headers),
    body: o.body,
    requestId,
  };
}

export function buildHttpResponse(o: BuildHttpResponseOptions): HttpMessage {
  const contentLength = String(o.body?.length ?? 0);

  const defaults: Record<string, string> = {
    Server: HTTP_USER_AGENT,
    Connection: "close",
    "Content-Length": contentLength,
  };

  return {
    layer: "L7",
    httpVersion: "HTTP/1.1",
    statusCode: o.statusCode,
    reasonPhrase: o.reasonPhrase,
    headers: mergeHeaders(defaults, o.headers),
    body: o.body,
    requestId: o.requestId,
  };
}

/* ------------------------------------------------------------------ */
/*  Serializer                                                         */
/* ------------------------------------------------------------------ */

export function serializeHttp(msg: HttpMessage): string {
  const CRLF = "\r\n";
  const lines: string[] = [];

  // Start-line
  if (msg.method && msg.url) {
    // Request-line: METHOD SP request-target SP HTTP/1.1
    lines.push(`${msg.method} ${msg.url} ${msg.httpVersion}${CRLF}`);
  } else if (msg.statusCode !== undefined) {
    // Status-line: HTTP/1.1 SP status-code SP reason-phrase
    lines.push(
      `${msg.httpVersion} ${msg.statusCode} ${msg.reasonPhrase ?? ""}${CRLF}`,
    );
  }

  // Headers
  for (const [key, value] of Object.entries(msg.headers)) {
    lines.push(`${titleCase(key)}: ${value}${CRLF}`);
  }

  // Blank line separating headers from body
  lines.push(CRLF);

  // Body
  if (msg.body) {
    lines.push(msg.body);
  }

  return lines.join("");
}
