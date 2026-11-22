import { describe, expect, it } from 'vitest';
import { parseHttpRequest, runServerApp, serializeHttpResponse } from './serverApp';

function request(
  method: string,
  target: string,
  opts: { headers?: Record<string, string>; body?: string } = {},
): string {
  const lines = [`${method} ${target} HTTP/1.1`, 'Host: www.example.test', 'User-Agent: curl'];
  for (const [name, value] of Object.entries(opts.headers ?? {})) lines.push(`${name}: ${value}`);
  if (opts.body !== undefined) {
    lines.push(`Content-Length: ${new TextEncoder().encode(opts.body).length}`);
  }
  return `${lines.join('\r\n')}\r\n\r\n${opts.body ?? ''}`;
}

async function okResponse(code: string, raw: string) {
  const result = await runServerApp(code, raw);
  if (!result.ok) throw new Error(`expected a response, got ${result.kind}: ${result.message}`);
  return result;
}

describe('TC-2200: parseHttpRequest reads method, path, query, headers and body', () => {
  it('splits the target into path and query and lower-cases header names', () => {
    const parsed = parseHttpRequest(
      request('GET', '/search?q=tcp&page=2', { headers: { 'X-Trace': 'abc' } }),
    );
    expect(parsed).toEqual({
      method: 'GET',
      path: '/search',
      query: { q: 'tcp', page: '2' },
      headers: { host: 'www.example.test', 'user-agent': 'curl', 'x-trace': 'abc' },
      body: '',
    });
  });

  it('reads a body by its Content-Length in UTF-8 bytes', () => {
    const parsed = parseHttpRequest(request('POST', '/notes', { body: '{"text":"日本"}' }));
    expect(parsed.method).toBe('POST');
    expect(parsed.body).toBe('{"text":"日本"}');
  });
});

describe('TC-2201: serializeHttpResponse writes HTTP/1.1 with a UTF-8 Content-Length', () => {
  it('serialises a 3,012-byte body with Content-Length 3012 and a default Content-Type', () => {
    const body = 'x'.repeat(3012);
    const raw = serializeHttpResponse({ status: 200, headers: {}, body });
    const [head, sent] = raw.split('\r\n\r\n');
    expect(head?.split('\r\n')).toEqual([
      'HTTP/1.1 200 OK',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Length: 3012',
    ]);
    expect(sent).toBe(body);
  });

  it('counts multi-byte characters by their UTF-8 bytes, not by string length', () => {
    const body = 'é'.repeat(1000) + 'a'.repeat(1012); // 2000 + 1012 = 3012 bytes, 2012 chars
    const raw = serializeHttpResponse({
      status: 201,
      headers: { 'content-type': 'text/html' },
      body,
    });
    expect(raw).toContain('HTTP/1.1 201 Created\r\n');
    expect(raw).toContain('Content-Type: text/html\r\n');
    expect(raw).toContain('Content-Length: 3012\r\n');
    expect(raw.endsWith(`\r\n\r\n${body}`)).toBe(true);
  });

  it('uses a given statusText and ignores a Content-Length the app set itself', () => {
    const raw = serializeHttpResponse({
      status: 299,
      statusText: 'Fine',
      headers: { 'Content-Length': '1' },
      body: 'abc',
    });
    expect(raw.startsWith('HTTP/1.1 299 Fine\r\n')).toBe(true);
    expect(raw).toContain('Content-Length: 3\r\n');
    expect(raw).not.toContain('Content-Length: 1\r\n');
  });
});

describe('TC-2202: a GET route answers with the query it was given', () => {
  it('passes req.query to the handler and answers 200 with the sent string', async () => {
    const code = `app.get('/hello', (req, res) => res.send('Hello, ' + req.query.name));`;
    const result = await okResponse(code, request('GET', '/hello?name=Ada'));
    expect(result.response.status).toBe(200);
    expect(result.response.body).toBe('Hello, Ada');
    expect(result.response.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(result.raw).toBe(
      'HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: 10\r\n\r\nHello, Ada',
    );
  });
});

describe('TC-2203: path parameters reach req.params', () => {
  it('matches /users/:id and decodes the segment', async () => {
    const code = `
      app.get('/users/:id', (req, res) => res.send('user ' + req.params.id));
      app.get('/users/:id/posts/:post', (req, res) => res.send(req.params.id + '/' + req.params.post));
    `;
    expect((await okResponse(code, request('GET', '/users/42'))).response.body).toBe('user 42');
    expect((await okResponse(code, request('GET', '/users/a%20b/posts/7'))).response.body).toBe(
      'a b/7',
    );
  });

  it('lets the first matching route answer', async () => {
    const code = `
      app.get('/users/me', (req, res) => res.send('me'));
      app.get('/users/:id', (req, res) => res.send('someone'));
    `;
    expect((await okResponse(code, request('GET', '/users/me'))).response.body).toBe('me');
  });
});

describe('TC-2204: a POST JSON body is parsed and res.json answers JSON', () => {
  it('echoes the posted JSON object with application/json', async () => {
    const code = `app.post('/echo', (req, res) => res.status(201).json({ got: req.body }));`;
    const result = await okResponse(
      code,
      request('POST', '/echo', {
        headers: { 'Content-Type': 'application/json' },
        body: '{"name":"ネット","n":1}',
      }),
    );
    expect(result.response.status).toBe(201);
    expect(result.response.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(JSON.parse(result.response.body)).toEqual({ got: { name: 'ネット', n: 1 } });
    expect(result.response.headers['content-length']).toBe(
      String(new TextEncoder().encode(result.response.body).length),
    );
  });

  it('res.send(object) also answers JSON, and set() headers are sent', async () => {
    const code = `app.put('/x', (req, res) => res.set('X-App', 'netlab').send({ method: req.method }));`;
    const result = await okResponse(code, request('PUT', '/x'));
    expect(result.response.body).toBe('{"method":"PUT"}');
    expect(result.raw).toContain('Content-Type: application/json; charset=utf-8\r\n');
    expect(result.raw).toContain('X-App: netlab\r\n');
  });

  it('routes DELETE and answers an async handler', async () => {
    const code = `app.delete('/items/:id', async (req, res) => {
      await new Promise((r) => setTimeout(r, 5));
      res.status(204).send('');
    });`;
    const result = await okResponse(code, request('DELETE', '/items/3'));
    expect(result.response.status).toBe(204);
    expect(result.raw.startsWith('HTTP/1.1 204 No Content\r\n')).toBe(true);
  });
});

describe('TC-2205: no matching route answers 404', () => {
  it('answers 404 with a short body for an unknown path or method', async () => {
    const code = `app.get('/', (req, res) => res.send('home'));`;
    const unknownPath = await okResponse(code, request('GET', '/missing'));
    expect(unknownPath.response.status).toBe(404);
    expect(unknownPath.response.body).toBe('Cannot GET /missing');
    expect(unknownPath.raw.startsWith('HTTP/1.1 404 Not Found\r\n')).toBe(true);
    const wrongMethod = await okResponse(code, request('POST', '/', { body: '' }));
    expect(wrongMethod.response.status).toBe(404);
    expect(wrongMethod.response.body).toBe('Cannot POST /');
  });
});

describe('TC-2206: a handler that fails answers 500 and logs why', () => {
  it('a throwing handler answers 500 and its error is in the log', async () => {
    const code = `app.get('/boom', () => { throw new Error('database is down'); });`;
    const result = await okResponse(code, request('GET', '/boom'));
    expect(result.response.status).toBe(500);
    expect(result.response.body).toBe('Internal Server Error');
    expect(result.log).toEqual(['Error: database is down']);
  });

  it('a rejecting async handler answers 500 too', async () => {
    const code = `app.get('/boom', async () => { throw new TypeError('bad'); });`;
    const result = await okResponse(code, request('GET', '/boom'));
    expect(result.response.status).toBe(500);
    expect(result.log).toEqual(['TypeError: bad']);
  });

  it('a handler that never responds answers 500 "handler did not respond"', async () => {
    const code = `app.get('/silent', (req, res) => { res.status(200); });`;
    const result = await okResponse(code, request('GET', '/silent'));
    expect(result.response.status).toBe(500);
    expect(result.log).toEqual(['GET /silent: handler did not respond']);
  });
});

describe('TC-2207: errors while loading the app are reported, not answered', () => {
  it('reports a syntax error as kind syntax with the message', async () => {
    const result = await runServerApp(`app.get('/', (req, res) => {`, request('GET', '/'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe('syntax');
    // The UI adds "SyntaxError: "; the message is the engine's own (TC-2254).
    expect(result.message).toBe('Unexpected end of input');
  });

  it('reports an error thrown at load time as kind runtime', async () => {
    const result = await runServerApp(`undefinedThing.call();`, request('GET', '/'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe('runtime');
    expect(result.message).toMatch(/ReferenceError: undefinedThing is not defined/);
  });

  it('reports a non-function handler as kind runtime', async () => {
    const result = await runServerApp(`app.get('/', 'nope');`, request('GET', '/'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe('runtime');
    expect(result.message).toMatch(/handler/);
  });
});

describe('TC-2208: console.log inside the app is captured into the log', () => {
  it('captures load-time and request-time lines in order', async () => {
    const code = `
      console.log('app loaded');
      app.get('/hi', (req, res) => {
        console.log('hit', req.path, { n: 1 });
        console.error('careful');
        res.send('hi');
      });
    `;
    const result = await okResponse(code, request('GET', '/hi'));
    expect(result.log).toEqual(['app loaded', 'hit /hi {"n":1}', 'careful']);
  });

  it('times out an async wait that outlasts timeoutMs', async () => {
    const code = `app.get('/slow', async (req, res) => {
      await new Promise((r) => setTimeout(r, 200));
      res.send('late');
    });`;
    const result = await runServerApp(code, request('GET', '/slow'), { timeoutMs: 20 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe('timeout');
  });
});
