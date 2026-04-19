import { NetlabError } from '../../errors';
import type { HttpMessage } from '../../types/packets';
import { getRequired } from '../../utils';
import { buildHttpResponse, serializeHttp } from './httpPacketBuilder';
import { parseHttp } from './httpParser';

export type HttpHandler = (
  req: HttpMessage,
  params: Record<string, string>,
) => HttpMessage | Promise<HttpMessage>;

export interface HttpServerOptions {
  nodeId: string;
  port?: number;
}

interface Route {
  method: string;
  pattern: string;
  segments: string[];
  handler: HttpHandler;
}

function matchRoute(route: Route, method: string, path: string): Record<string, string> | null {
  if (route.method.toUpperCase() !== method.toUpperCase()) return null;

  const pathSegments = path.split('/').filter(Boolean);
  if (pathSegments.length !== route.segments.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < route.segments.length; i++) {
    const seg = getRequired(route.segments, i, { route: route.pattern, path });
    const pathSegment = getRequired(pathSegments, i, { route: route.pattern, path });
    if (seg.startsWith(':')) {
      params[seg.slice(1)] = pathSegment;
    } else if (seg !== pathSegment) {
      return null;
    }
  }
  return params;
}

export class HttpServer {
  readonly nodeId: string;
  readonly port: number;
  private routes: Route[] = [];

  constructor(opts: HttpServerOptions) {
    this.nodeId = opts.nodeId;
    this.port = opts.port ?? 80;
  }

  route(method: string, pathPattern: string, handler: HttpHandler): void {
    this.routes.push({
      method,
      pattern: pathPattern,
      segments: pathPattern.split('/').filter(Boolean),
      handler,
    });
  }

  listen(): void {
    // no-op: reserved for future use
  }

  close(): void {
    // no-op: reserved for future use
  }

  /**
   * Handles an already-parsed HttpMessage request.
   * Returns the HttpMessage response.
   */
  async handleRequest(request: HttpMessage): Promise<HttpMessage> {
    const method = request.method ?? 'GET';
    const url = request.url ?? '/';
    const path = getRequired(url.split('?'), 0, { url });
    const requestId = request.requestId ?? 'unknown';

    if (request.httpVersion !== 'HTTP/1.1') {
      return buildHttpResponse({
        statusCode: 400,
        reasonPhrase: 'Bad Request',
        requestId,
        body: 'Only HTTP/1.1 is supported',
      });
    }

    for (const route of this.routes) {
      const params = matchRoute(route, method, path);
      if (params !== null) {
        return route.handler(request, params);
      }
    }

    return buildHttpResponse({
      statusCode: 404,
      reasonPhrase: 'Not Found',
      requestId,
    });
  }

  /**
   * Processes raw HTTP bytes. Buffers until a complete request is available,
   * then dispatches and returns the serialized response.
   */
  async handleRawData(data: string): Promise<{ response: string; parsed: HttpMessage }> {
    const result = parseHttp(data);

    if (result.kind === 'incomplete') {
      throw new NetlabError({
        code: 'protocol/invalid-request',
        message: 'Incomplete HTTP request',
      });
    }
    if (result.kind === 'error') {
      const errResp = buildHttpResponse({
        statusCode: 400,
        reasonPhrase: 'Bad Request',
        requestId: 'error',
        body: result.reason,
      });
      return { response: serializeHttp(errResp), parsed: errResp };
    }

    const response = await this.handleRequest(result.message);
    return { response: serializeHttp(response), parsed: response };
  }
}
