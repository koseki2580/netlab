import type { HttpMessage } from '../../types/packets';

export type ParseResult =
  | { kind: 'incomplete' }
  | { kind: 'request'; message: HttpMessage; consumed: number }
  | { kind: 'response'; message: HttpMessage; consumed: number }
  | { kind: 'error'; reason: string };

const CRLF = '\r\n';
const HEADER_END = '\r\n\r\n';

const VALID_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'HEAD']);

function parseHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = raw.split(CRLF);
  for (const line of lines) {
    if (line === '') continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1).trim();
    headers[key] = value;
  }
  return headers;
}

function getContentLength(headers: Record<string, string>): number {
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === 'content-length') {
      return parseInt(v, 10) || 0;
    }
  }
  return 0;
}

/**
 * Parses as many bytes as possible from the buffer.
 * Safe to call repeatedly as more bytes arrive.
 */
export function parseHttp(buffer: string): ParseResult {
  // Need at least the header terminator
  const headerEndIdx = buffer.indexOf(HEADER_END);
  if (headerEndIdx === -1) {
    return { kind: 'incomplete' };
  }

  const headerSection = buffer.slice(0, headerEndIdx);
  const lines = headerSection.split(CRLF);
  const startLine = lines[0];

  if (!startLine) {
    return { kind: 'error', reason: 'Empty start line' };
  }

  // Determine if this is a request or response
  const isResponse = startLine.startsWith('HTTP/');

  if (isResponse) {
    return parseResponse(buffer, startLine, lines, headerEndIdx);
  }
  return parseRequest(buffer, startLine, lines, headerEndIdx);
}

function parseRequest(
  buffer: string,
  startLine: string,
  lines: string[],
  headerEndIdx: number,
): ParseResult {
  // Request-line: METHOD SP request-target SP HTTP-version
  const parts = startLine.split(' ');
  if (parts.length < 3) {
    return { kind: 'error', reason: 'Malformed request-line' };
  }

  const [method, url, version] = parts;

  if (!VALID_METHODS.has(method)) {
    return { kind: 'error', reason: `Unknown method: ${method}` };
  }

  if (version !== 'HTTP/1.1') {
    if (version?.startsWith('HTTP/')) {
      return { kind: 'error', reason: `Unsupported HTTP version: ${version}` };
    }
    return { kind: 'error', reason: 'Missing HTTP version' };
  }

  const rawHeaders = lines.slice(1).join(CRLF);
  const headers = parseHeaders(rawHeaders);
  const contentLength = getContentLength(headers);

  const bodyStart = headerEndIdx + HEADER_END.length;
  const bodyEnd = bodyStart + contentLength;

  if (buffer.length < bodyEnd) {
    return { kind: 'incomplete' };
  }

  const body = contentLength > 0 ? buffer.slice(bodyStart, bodyEnd) : undefined;

  const message: HttpMessage = {
    layer: 'L7',
    httpVersion: 'HTTP/1.1',
    method: method as HttpMessage['method'],
    url,
    headers,
    body,
  };

  return { kind: 'request', message, consumed: bodyEnd };
}

function parseResponse(
  buffer: string,
  startLine: string,
  lines: string[],
  headerEndIdx: number,
): ParseResult {
  // Status-line: HTTP-version SP status-code SP reason-phrase
  const firstSpace = startLine.indexOf(' ');
  if (firstSpace === -1) {
    return { kind: 'error', reason: 'Malformed status-line' };
  }

  const version = startLine.slice(0, firstSpace);
  if (version !== 'HTTP/1.1') {
    return { kind: 'error', reason: `Unsupported HTTP version: ${version}` };
  }

  const rest = startLine.slice(firstSpace + 1);
  const secondSpace = rest.indexOf(' ');
  if (secondSpace === -1) {
    return { kind: 'error', reason: 'Malformed status-line: missing reason phrase' };
  }

  const statusCode = parseInt(rest.slice(0, secondSpace), 10);
  const reasonPhrase = rest.slice(secondSpace + 1);

  if (isNaN(statusCode)) {
    return { kind: 'error', reason: 'Invalid status code' };
  }

  const rawHeaders = lines.slice(1).join(CRLF);
  const headers = parseHeaders(rawHeaders);
  const contentLength = getContentLength(headers);

  const bodyStart = headerEndIdx + HEADER_END.length;
  const bodyEnd = bodyStart + contentLength;

  if (buffer.length < bodyEnd) {
    return { kind: 'incomplete' };
  }

  const body = contentLength > 0 ? buffer.slice(bodyStart, bodyEnd) : undefined;

  const message: HttpMessage = {
    layer: 'L7',
    httpVersion: 'HTTP/1.1',
    statusCode,
    reasonPhrase,
    headers,
    body,
  };

  return { kind: 'response', message, consumed: bodyEnd };
}
