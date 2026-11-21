/**
 * The pure core of a learner-written server app: an Express-like `app` evaluated from source,
 * HTTP/1.1 request parsing and response serialisation. It has no Worker or DOM dependency, so it is
 * tested in-process; `sandbox.worker.ts` runs it off the main thread and `appSandbox.ts` owns that
 * worker.
 *
 * Timeouts: `timeoutMs` here only covers *async* waits (a handler awaiting a timer or a promise that
 * never settles). A synchronous busy loop cannot be interrupted on the thread it runs on, so the hard
 * limit is enforced by `appSandbox.ts`, which terminates the worker.
 */
import { HttpServer } from '../../layers/l7-application/HttpServer';
import { serializeHttp } from '../../layers/l7-application/httpPacketBuilder';
import type { HttpMessage } from '../../types/packets';

export interface ParsedHttpRequest {
  readonly method: string;
  readonly path: string;
  readonly query: Record<string, string>;
  /** Header names are lower-case. */
  readonly headers: Record<string, string>;
  readonly body: string;
}

export interface AppResponseInit {
  readonly status: number;
  readonly statusText?: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

/** A response as it went on the wire; header names are lower-case. */
export interface AppResponse {
  readonly status: number;
  readonly statusText: string;
  readonly headers: Record<string, string>;
  readonly body: string;
}

export type ServerAppFailureKind = 'syntax' | 'runtime' | 'timeout';

export interface ServerAppFailure {
  readonly ok: false;
  readonly kind: ServerAppFailureKind;
  readonly message: string;
  readonly log: string[];
}

export type ServerAppResult =
  | {
      readonly ok: true;
      readonly response: AppResponse;
      readonly raw: string;
      readonly log: string[];
    }
  | ServerAppFailure;

export type LoadResult =
  | { readonly ok: true; readonly app: LoadedApp; readonly log: string[] }
  | ServerAppFailure;

type Handler = (req: unknown, res: unknown) => unknown;
type RouteMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** An app whose code has been evaluated: its routes, in the order they were declared. */
export interface LoadedApp {
  readonly routes: readonly { method: RouteMethod; path: string; handler: Handler }[];
  /** console output not yet handed out; drained into the next result's `log`. */
  readonly pendingLog: string[];
}

export interface RunOptions {
  /** Covers async waits only; see the module comment. No limit when omitted. */
  readonly timeoutMs?: number;
}

const STATUS_TEXT: Readonly<Record<number, string>> = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  503: 'Service Unavailable',
};

const TEXT_PLAIN = 'text/plain; charset=utf-8';
const TEXT_HTML = 'text/html; charset=utf-8';
const APPLICATION_JSON = 'application/json; charset=utf-8';

/** Parses an HTTP/1.1 request; the body is read by its Content-Length in UTF-8 bytes. */
export function parseHttpRequest(raw: string): ParsedHttpRequest {
  const headerEnd = raw.indexOf('\r\n\r\n');
  const head = headerEnd === -1 ? raw : raw.slice(0, headerEnd);
  const rest = headerEnd === -1 ? '' : raw.slice(headerEnd + 4);
  const [startLine = '', ...headerLines] = head.split('\r\n');
  const [method, target, version] = startLine.split(' ');
  if (!method || !target || !version?.startsWith('HTTP/')) {
    throw new Error(`Malformed request-line: ${startLine}`);
  }

  const headers: Record<string, string> = {};
  for (const line of headerLines) {
    const colon = line.indexOf(':');
    if (colon > 0)
      headers[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim();
  }

  let body = rest;
  const length = headers['content-length'];
  if (length !== undefined) {
    const bytes = new TextEncoder().encode(rest);
    body = new TextDecoder().decode(bytes.slice(0, Math.max(0, Number(length) || 0)));
  }

  const queryStart = target.indexOf('?');
  const path = queryStart === -1 ? target : target.slice(0, queryStart);
  const query: Record<string, string> = {};
  if (queryStart !== -1) {
    for (const [key, value] of new URLSearchParams(target.slice(queryStart + 1))) {
      query[key] = value;
    }
  }
  return { method: method.toUpperCase(), path, query, headers, body };
}

function finalHeaders(init: AppResponseInit): Record<string, string> {
  const own: Record<string, string> = {};
  for (const [name, value] of Object.entries(init.headers)) own[name.toLowerCase()] = value;
  delete own['content-length'];
  const type = own['content-type'] ?? (init.body ? TEXT_PLAIN : undefined);
  delete own['content-type'];
  return {
    ...(type !== undefined ? { 'content-type': type } : {}),
    ...own,
    'content-length': String(new TextEncoder().encode(init.body).length),
  };
}

function toWire(init: AppResponseInit): { response: AppResponse; raw: string } {
  const response: AppResponse = {
    status: init.status,
    statusText: init.statusText ?? STATUS_TEXT[init.status] ?? '',
    headers: finalHeaders(init),
    body: init.body,
  };
  const message: HttpMessage = {
    layer: 'L7',
    httpVersion: 'HTTP/1.1',
    statusCode: response.status,
    reasonPhrase: response.statusText,
    headers: response.headers,
    body: response.body,
  };
  return { response, raw: serializeHttp(message) };
}

/**
 * Serialises a response as HTTP/1.1. Content-Length is always the body's UTF-8 byte length (an
 * app-set one is replaced); Content-Type defaults to text/plain when there is a body.
 */
export function serializeHttpResponse(init: AppResponseInit): string {
  return toWire(init).raw;
}

function describe(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/** Evaluates the app's code once: it declares routes and may log. Nothing is answered yet. */
export function loadServerApp(code: string): LoadResult {
  const routes: { method: RouteMethod; path: string; handler: Handler }[] = [];
  const pendingLog: string[] = [];
  const write = (...args: unknown[]) => {
    pendingLog.push(args.map(describe).join(' '));
  };
  const appConsole = { log: write, info: write, warn: write, error: write, debug: write };
  const route = (method: RouteMethod) => (path: unknown, handler: unknown) => {
    if (typeof path !== 'string')
      throw new TypeError(`app.${method.toLowerCase()}: path must be a string`);
    if (typeof handler !== 'function') {
      throw new TypeError(`app.${method.toLowerCase()}('${path}'): handler must be a function`);
    }
    routes.push({ method, path, handler: handler as Handler });
  };
  const app = {
    get: route('GET'),
    post: route('POST'),
    put: route('PUT'),
    delete: route('DELETE'),
  };

  let evaluate: (app: unknown, console: unknown) => unknown;
  try {
    // Learner code is evaluated on purpose; in the product this only ever happens inside the worker.

    evaluate = new Function('app', 'console', code) as typeof evaluate;
  } catch (error) {
    return { ok: false, kind: 'syntax', message: describe(error), log: [] };
  }
  try {
    evaluate(app, appConsole);
  } catch (error) {
    return { ok: false, kind: 'runtime', message: describe(error), log: pendingLog.splice(0) };
  }
  return { ok: true, app: { routes, pendingLog }, log: [] };
}

function createRes(onLateSend: () => void) {
  const state: { status: number; headers: Record<string, string>; body?: string } = {
    status: 200,
    headers: {},
  };
  const setType = (type: string) => {
    if (!Object.keys(state.headers).some((name) => name.toLowerCase() === 'content-type')) {
      state.headers['content-type'] = type;
    }
  };
  const res = {
    status(code: number) {
      state.status = Number(code);
      return res;
    },
    set(name: string, value: unknown) {
      for (const existing of Object.keys(state.headers)) {
        if (existing.toLowerCase() === String(name).toLowerCase()) delete state.headers[existing];
      }
      state.headers[String(name)] = String(value);
      return res;
    },
    send(value?: unknown) {
      if (state.body !== undefined) {
        onLateSend();
        return res;
      }
      if (value !== null && typeof value === 'object') return res.json(value);
      setType(TEXT_HTML);
      state.body = value === undefined ? '' : String(value);
      return res;
    },
    json(value: unknown) {
      if (state.body !== undefined) {
        onLateSend();
        return res;
      }
      setType(APPLICATION_JSON);
      state.body = JSON.stringify(value) ?? '';
      return res;
    },
  };
  return { res, state };
}

function withTimeout<T>(work: Promise<T>, timeoutMs: number | undefined): Promise<T | 'timeout'> {
  if (timeoutMs === undefined) return work;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs);
  });
  return Promise.race([work, limit]).finally(() => clearTimeout(timer));
}

function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Answers one raw HTTP request with an already loaded app. */
export async function dispatchServerApp(
  loaded: LoadedApp,
  raw: string,
  opts: RunOptions = {},
): Promise<ServerAppResult> {
  const log = loaded.pendingLog;
  const finish = (init: AppResponseInit): ServerAppResult => ({
    ok: true,
    ...toWire(init),
    log: log.splice(0),
  });

  let parsed: ParsedHttpRequest;
  try {
    parsed = parseHttpRequest(raw);
  } catch (error) {
    log.push(describe(error));
    return finish({ status: 400, headers: {}, body: 'Bad Request' });
  }
  const label = `${parsed.method} ${parsed.path}`;
  let body: unknown = parsed.body;
  if (parsed.headers['content-type']?.includes('json') && parsed.body !== '') {
    try {
      body = JSON.parse(parsed.body);
    } catch {
      body = parsed.body; // left as text, like a learner reading it raw
    }
  }

  // Route matching is HttpServer's: a fresh server per request carries this request's state.
  let answered: AppResponseInit | undefined;
  const server = new HttpServer({ nodeId: 'server-app' });
  for (const route of loaded.routes) {
    server.route(route.method, route.path, async (_message, params) => {
      const { res, state } = createRes(() => log.push(`${label}: response already sent; ignored`));
      const decoded: Record<string, string> = {};
      for (const [name, value] of Object.entries(params)) decoded[name] = decodeParam(value);
      const req = { ...parsed, params: decoded, body };
      try {
        await route.handler(req, res);
        if (state.body === undefined) {
          log.push(`${label}: handler did not respond`);
          answered = { status: 500, headers: {}, body: 'Internal Server Error' };
        } else {
          answered = { status: state.status, headers: state.headers, body: state.body };
        }
      } catch (error) {
        log.push(describe(error));
        answered = { status: 500, headers: {}, body: 'Internal Server Error' };
      }
      return { layer: 'L7', httpVersion: 'HTTP/1.1', headers: {} };
    });
  }

  const outcome = await withTimeout(
    server.handleRequest({
      layer: 'L7',
      httpVersion: 'HTTP/1.1',
      method: parsed.method as NonNullable<HttpMessage['method']>,
      url: parsed.path,
      headers: parsed.headers,
    }),
    opts.timeoutMs,
  );
  if (outcome === 'timeout') {
    return {
      ok: false,
      kind: 'timeout',
      message: `${label}: no response within ${opts.timeoutMs} ms`,
      log: log.splice(0),
    };
  }
  return finish(answered ?? { status: 404, headers: {}, body: `Cannot ${label}` });
}

/** Loads `code` and answers `raw` with it: load errors are failures, handler errors are 500s. */
export async function runServerApp(
  code: string,
  raw: string,
  opts: RunOptions = {},
): Promise<ServerAppResult> {
  const loaded = loadServerApp(code);
  if (!loaded.ok) return loaded;
  return dispatchServerApp(loaded.app, raw, opts);
}

/** A message to the sandbox worker: load `code`, and answer `raw` when it is given. */
export interface SandboxRequest {
  readonly id: number;
  readonly code: string;
  readonly raw?: string;
}

export type SandboxLoadResult = { readonly ok: true; readonly log: string[] } | ServerAppFailure;

export interface SandboxReply {
  readonly id: number;
  readonly result: ServerAppResult | SandboxLoadResult;
}

/**
 * What the worker runs for each message. The loaded app is kept between requests (as a real server
 * keeps its state) and reloaded only when the code changes.
 */
export function createAppHost(): (request: SandboxRequest) => Promise<SandboxReply> {
  let current: { code: string; app: LoadedApp } | undefined;
  return async ({ id, code, raw }) => {
    if (current?.code !== code) {
      const loaded = loadServerApp(code);
      if (!loaded.ok) {
        current = undefined;
        return { id, result: loaded };
      }
      current = { code, app: loaded.app };
    }
    if (raw === undefined)
      return { id, result: { ok: true, log: current.app.pendingLog.splice(0) } };
    return { id, result: await dispatchServerApp(current.app, raw) };
  };
}
