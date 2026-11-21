/**
 * REQ-416 — curl reaches a learner-written app on www through the simulator,
 * and the response travels back in segments (TC-2210..TC-2214).
 */
import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../cli/runtime';
import { HookEngine } from '../hooks/HookEngine';
import { MainThreadEngine } from '../simulation/worker/MainThreadEngine';
import { runServerApp } from './serverApp/serverApp';
import { runCommand } from './terminalCommands';
import { TERMINAL_WEB_SITES, terminalNetwork } from './terminalNetwork';
import type { ServerApp, TerminalContext } from './types';

/** An app that runs the code in-process (the page runs it in a worker; the contract is the same). */
const appOf = (code: string): ServerApp => ({
  handle: (raw) => runServerApp(code, raw, { timeoutMs: 1000 }),
});

const CODE = `
app.get('/hello', (req, res) => res.send('Hello ' + req.query.name));
app.post('/echo', (req, res) => res.status(201).json({ got: req.body }));
app.get('/boom', () => { throw new Error('database is down'); });
`;

function setUp(app?: ServerApp) {
  const engine = new MainThreadEngine(enrichTopology(terminalNetwork()), new HookEngine());
  const { www: _static, ...otherSites } = TERMINAL_WEB_SITES;
  const context: TerminalContext = {
    engine,
    nodeId: 'client',
    web: otherSites,
    ...(app ? { apps: { www: app } } : {}),
  };
  return { engine, run: (line: string) => runCommand(line, context) };
}

describe('TC-2210: curl reaches the app through the simulator and prints its answer', () => {
  it('runs the handler with the query, and the request and response are traces', async () => {
    const { engine, run } = setUp(appOf(CODE));
    const before = engine.getState().traces.length;
    const result = await run('curl http://www.example.test/hello?name=Ada');
    expect(result.lines).toEqual(['Hello Ada']);
    expect(engine.getState().traces.length).toBeGreaterThan(before + 2);
  });
});

describe('TC-2211: a response bigger than one segment travels back in several', () => {
  it('curl -v names 3 segments of 1400, 1400 and the rest for a 3,012-byte response', async () => {
    const big = `app.get('/big', (req, res) => res.set('Content-Type', 'text/plain').send('x'.repeat(2919)));`;
    const { run } = setUp(appOf(big));
    const result = await run('curl -v http://www.example.test/big');
    const note = result.lines.find((line) => line.includes('segments'));
    expect(note).toBeDefined();
    const sizes = (note as string).match(/\d+/g)!.map(Number);
    const total = sizes.slice(1).reduce((a, b) => a + b, 0);
    expect(sizes[0]).toBe(3);
    expect(sizes.slice(1, 3)).toEqual([1400, 1400]);
    expect(total).toBeGreaterThan(2800);
    expect(result.lines).toContain('< HTTP/1.1 200 OK');
  });
});

describe('TC-2212: -X, -H and -d send a request body the app reads', () => {
  it('POST JSON is echoed with 201', async () => {
    const { run } = setUp(appOf(CODE));
    const result = await run(
      `curl -i -X POST -H 'Content-Type: application/json' -d '{"n":1}' http://www.example.test/echo`,
    );
    expect(result.lines[0]).toBe('HTTP/1.1 201 Created');
    expect(result.lines[result.lines.length - 1]).toBe('{"got":{"n":1}}');
  });
});

describe('TC-2213: missing routes and failing handlers answer as a server would', () => {
  it('404 for no route, 500 for a throwing handler, with the error in the app log', async () => {
    const logs: string[] = [];
    const app: ServerApp = {
      handle: async (raw) => {
        const result = await runServerApp(CODE, raw, { timeoutMs: 1000 });
        logs.push(...result.log);
        return result;
      },
    };
    const { run } = setUp(app);
    expect((await run('curl -i http://www.example.test/nope'))[`lines`][0]).toBe(
      'HTTP/1.1 404 Not Found',
    );
    expect((await run('curl -i http://www.example.test/boom')).lines[0]).toBe(
      'HTTP/1.1 500 Internal Server Error',
    );
    expect(logs.join('\n')).toContain('database is down');
  });
});

describe('TC-2214: a stopped app refuses connections, and a hung one times out', () => {
  it('no app on www: connection refused; a timeout result: curl error 28', async () => {
    const stopped = setUp();
    expect((await stopped.run('curl http://www.example.test/hello')).lines[0]).toMatch(
      /^curl: \(7\) Failed to connect to www\.example\.test port 80/,
    );
    const hung = setUp({
      handle: async () => ({ ok: false, kind: 'timeout', message: 'timed out', log: [] }),
    });
    expect((await hung.run('curl http://www.example.test/hello')).lines[0]).toBe(
      'curl: (28) Operation timed out after 1000 milliseconds with 0 bytes received',
    );
  });
});
