/**
 * Hardening of the learner-written server app and of what curl prints from it (TC-2250..TC-2255,
 * TC-2259). The worker scope (TC-2256) and the sandbox's reply checks (TC-2257, TC-2258) are tested
 * next to their modules in serverApp/.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { enrichTopology } from '../cli/runtime';
import { HookEngine } from '../hooks/HookEngine';
import { MainThreadEngine } from '../simulation/worker/MainThreadEngine';
import { loadServerApp, runServerApp, serializeHttpResponse } from './serverApp/serverApp';
import type { SandboxResult } from './serverApp/appSandbox';
import { runCommand } from './terminalCommands';
import { TERMINAL_WEB_SITES, terminalNetwork } from './terminalNetwork';
import type { ServerApp, TerminalContext, WebSites } from './types';

const GET = (path: string) => `GET ${path} HTTP/1.1\r\nHost: www.example.test\r\n\r\n`;

async function answer(code: string, path = '/') {
  const result = await runServerApp(code, GET(path));
  if (!result.ok) throw new Error(`expected a response, got ${result.kind}: ${result.message}`);
  return result;
}

const appOf = (code: string): ServerApp => ({
  handle: (raw) => runServerApp(code, raw, { timeoutMs: 1000 }),
});

/** An app that answers every request with exactly `raw`, as a misbehaving worker could. */
const rawApp = (raw: string): ServerApp => ({
  handle: async (): Promise<SandboxResult> => ({
    ok: true,
    response: { status: 200, statusText: 'OK', headers: {}, body: '' },
    raw,
    log: [],
  }),
});

function setUp(opts: { app?: ServerApp; web?: WebSites } = {}) {
  const engine = new MainThreadEngine(enrichTopology(terminalNetwork()), new HookEngine());
  const { www: _static, ...otherSites } = TERMINAL_WEB_SITES;
  const context: TerminalContext = {
    engine,
    nodeId: 'client',
    web: opts.web ?? otherSites,
    ...(opts.app ? { apps: { www: opts.app } } : {}),
  };
  return { engine, run: (line: string) => runCommand(line, context) };
}

const KIB64 = 64 * 1024;

describe('TC-2250: a response body over 64 KiB is answered 500 and logged', () => {
  it('res.send of 64 KiB + 1 byte answers 500 with the reason in the log', async () => {
    const result = await answer(`app.get('/', (req, res) => res.send('x'.repeat(${KIB64 + 1})));`);
    expect(result.response.status).toBe(500);
    expect(result.response.body).toBe('Internal Server Error');
    expect(result.log.join('\n')).toContain('response body exceeds 64 KiB');
  });

  it('res.json counts UTF-8 bytes: 30,000 "é" (60,000 bytes + quotes) passes, 33,000 does not', async () => {
    const fits = await answer(`app.get('/', (req, res) => res.json('é'.repeat(30000)));`);
    expect(fits.response.status).toBe(200);
    const over = await answer(`app.get('/', (req, res) => res.json('é'.repeat(33000)));`);
    expect(over.response.status).toBe(500);
    expect(over.log.join('\n')).toContain('response body exceeds 64 KiB');
  });

  it('a body of exactly 64 KiB is sent', async () => {
    const result = await answer(`app.get('/', (req, res) => res.send('x'.repeat(${KIB64})));`);
    expect(result.response.status).toBe(200);
    expect(result.response.body.length).toBe(KIB64);
  });

  it('the cap cannot be caught away by the handler', async () => {
    const code = `app.get('/', (req, res) => {
      try { res.send('x'.repeat(${KIB64 + 1})); } catch (e) { res.send('caught'); }
    });`;
    const result = await answer(code);
    expect(result.response.status).toBe(500);
  });
});

describe('TC-2251: curl refuses a response over 64 KiB that the app side hands it', () => {
  it('prints curl error 56 and sends no response back over the simulated network', async () => {
    const big = serializeHttpResponse({ status: 200, headers: {}, body: 'x'.repeat(KIB64 + 1) });
    const oversized = setUp({ app: rawApp(big) });
    const beforeBig = oversized.engine.getState().traces.length;
    const result = await oversized.run('curl -i http://www.example.test/');
    expect(result.lines).toEqual(['curl: (56) Failure when receiving data from the peer']);
    const bigDelta = oversized.engine.getState().traces.length - beforeBig;

    // The same exchange with an app that fails outright: request out, no response back.
    const failing = setUp({
      app: { handle: async () => ({ ok: false, kind: 'runtime', message: 'x', log: [] }) },
    });
    const beforeFail = failing.engine.getState().traces.length;
    await failing.run('curl -i http://www.example.test/');
    const failDelta = failing.engine.getState().traces.length - beforeFail;
    expect(bigDelta).toBe(failDelta);
  });

  it('a response just under the cap is still printed', async () => {
    const raw = serializeHttpResponse({ status: 200, headers: {}, body: 'y'.repeat(KIB64) });
    const { run } = setUp({ app: rawApp(raw) });
    const result = await run('curl http://www.example.test/');
    // The app's log line follows the body (TC-2352).
    expect(result.lines).toEqual(['y'.repeat(KIB64), '* www log: GET / → 200']);
  }, 60_000);
});

describe('TC-2252: the log keeps at most 200 entries per request, each at most 500 characters', () => {
  it('300 console.log calls leave 200 entries', async () => {
    const code = `app.get('/', (req, res) => { for (let i = 0; i < 300; i++) console.log('line ' + i); res.send('ok'); });`;
    const result = await answer(code);
    expect(result.log).toHaveLength(200);
    expect(result.log[0]).toBe('line 0');
    expect(result.response.status).toBe(200);
  });

  it('a 2,000-character entry is cut to 500 characters followed by "…"', async () => {
    const code = `app.get('/', (req, res) => { console.log('a'.repeat(2000)); res.send('ok'); });`;
    const result = await answer(code);
    expect(result.log).toEqual([`${'a'.repeat(500)}…`]);
  });

  it('the next request starts with a fresh allowance', async () => {
    const code = `app.get('/', (req, res) => { for (let i = 0; i < 300; i++) console.log(i); res.send('ok'); });`;
    const loaded = loadServerApp(code);
    if (!loaded.ok) throw new Error('load failed');
    const { dispatchServerApp } = await import('./serverApp/serverApp');
    await dispatchServerApp(loaded.app, GET('/'));
    const second = await dispatchServerApp(loaded.app, GET('/'));
    expect(second.log).toHaveLength(200);
    expect(second.log[0]).toBe('0');
  });
});

describe('TC-2253: header and status values are validated like Node', () => {
  it('a header value with CR/LF answers 500, logs a TypeError and injects nothing', async () => {
    const code = `app.get('/', (req, res) => res.set('X-A', 'ok\\r\\nSet-Cookie: evil=1').send('hi'));`;
    const result = await answer(code);
    expect(result.response.status).toBe(500);
    expect(result.log.join('\n')).toMatch(/^TypeError: /);
    expect(result.raw).not.toContain('Set-Cookie');
  });

  it('a header name with a newline answers 500 with a TypeError', async () => {
    const code = `app.get('/', (req, res) => res.set('X-A\\nX-B', 'v').send('hi'));`;
    const result = await answer(code);
    expect(result.response.status).toBe(500);
    expect(result.log.join('\n')).toMatch(/^TypeError: /);
  });

  it.each(['99', '1000', '200.5', "'200'", 'NaN', 'undefined'])(
    'res.status(%s) answers 500 with a RangeError in the log',
    async (code) => {
      const result = await answer(`app.get('/', (req, res) => res.status(${code}).send('hi'));`);
      expect(result.response.status).toBe(500);
      expect(result.log.join('\n')).toMatch(/^RangeError: /);
    },
  );

  it('res.status(100) and res.status(999) are accepted', async () => {
    expect(
      (await answer(`app.get('/', (req, res) => res.status(999).send('hi'));`)).response.status,
    ).toBe(999);
    expect(
      (await answer(`app.get('/', (req, res) => res.status(100).send('hi'));`)).response.status,
    ).toBe(100);
  });
});

describe('TC-2254: a syntax error message does not repeat the error name', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports V8’s message as is, with no "SyntaxError:" prefix and no invented line', async () => {
    const result = await runServerApp(`let a = 1;\nlet b = 2;\nfoo(a b);\n`, GET('/'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe('syntax');
    expect(result.message).toBe('missing ) after argument list');
  });

  it('adds the line in the learner’s code when the engine reports one', async () => {
    // An engine like Firefox: the error's lineNumber counts the two lines new Function adds.
    const Real = Function;
    function EngineWithLines(...args: string[]) {
      const body = args[args.length - 1] ?? '';
      const index = body.split('\n').findIndex((line) => line.includes('}') || line.includes('('));
      if (index === -1) return Real(...args);
      const error = new SyntaxError('missing ) after argument list');
      Object.assign(error, { lineNumber: index + 3 });
      throw error;
    }
    vi.stubGlobal('Function', EngineWithLines);
    const result = loadServerApp(`let a = 1;\nlet b = 2;\nfoo(a b;\n`);
    vi.unstubAllGlobals();
    expect(!result.ok && result.message).toBe('missing ) after argument list (line 3)');
  });

  it('a runtime error at load time still names its type', async () => {
    const result = await runServerApp(`undefinedThing.call();`, GET('/'));
    expect(!result.ok && result.message).toBe('ReferenceError: undefinedThing is not defined');
  });
});

describe('TC-2255: curl makes control characters from the server visible, like cat -v', () => {
  it('ESC, BEL and C1 controls in the body are shown, tabs are kept', async () => {
    const code = `app.get('/', (req, res) => res.send('\\x1b[2J\\x1b]8;;http://evil\\x07link\\ta\\u009b0m'));`;
    const { run } = setUp({ app: appOf(code) });
    const result = await run('curl http://www.example.test/');
    expect(result.lines).toEqual([
      '^[[2J^[]8;;http://evil^Glink\taM-^[0m',
      '* www log: GET / → 200',
    ]);
  });

  it('the status line and headers are sanitised in -i and -v output', async () => {
    const raw = 'HTTP/1.1 200 O\x1bK\r\nX-Evil: a\x1b[1Ab\r\nContent-Length: 2\r\n\r\nok';
    const { run } = setUp({ app: rawApp(raw) });
    const withHeaders = await run('curl -i http://www.example.test/');
    expect(withHeaders.lines.slice(0, 2)).toEqual(['HTTP/1.1 200 O^[K', 'X-Evil: a^[[1Ab']);
    const verbose = await run('curl -v http://www.example.test/');
    expect(verbose.lines).toContain('< X-Evil: a^[[1Ab');
    expect(verbose.lines.join('\n')).not.toContain('\x1b');
  });

  it('DEL and NUL are shown as ^? and ^@', async () => {
    const code = `app.get('/', (req, res) => res.send('a\\x7fb\\x00c'));`;
    const { run } = setUp({ app: appOf(code) });
    expect((await run('curl http://www.example.test/')).lines).toEqual([
      'a^?b^@c',
      '* www log: GET / → 200',
    ]);
  });
});

describe('TC-2259: a static site’s own not-found text answers an unknown path', () => {
  it('uses the site’s notFound text when it has one', async () => {
    const notFound =
      'Not Found (built-in page — press Start in "Write www\'s server" to run your own code)';
    const { run } = setUp({
      web: { ...TERMINAL_WEB_SITES, www: { ...TERMINAL_WEB_SITES.www!, notFound } },
    });
    const result = await run('curl -i http://www.example.test/nope');
    expect(result.lines[0]).toBe('HTTP/1.1 404 Not Found');
    expect(result.lines[result.lines.length - 1]).toBe(notFound);
  });

  it('keeps "Not Found" for a site without one', async () => {
    const { www } = TERMINAL_WEB_SITES;
    const { notFound: _none, ...plain } = www as { notFound?: string } & typeof www;
    const { run } = setUp({ web: { ...TERMINAL_WEB_SITES, www: plain } });
    const result = await run('curl http://www.example.test/nope');
    expect(result.lines).toEqual(['Not Found']);
  });
});
