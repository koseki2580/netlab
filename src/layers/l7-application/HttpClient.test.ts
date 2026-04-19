import { describe, expect, it, vi } from 'vitest';
import type { TcpConnection } from '../../types/tcp';
import { HttpClient, type HttpClientDeps } from './HttpClient';
import { HttpServer } from './HttpServer';
import { buildHttpResponse } from './httpPacketBuilder';

function createMockConnection(): TcpConnection {
  return {
    id: 'conn-1',
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    srcIp: '10.0.0.10',
    srcPort: 50000,
    dstIp: '203.0.113.10',
    dstPort: 80,
    state: 'ESTABLISHED',
    localSeq: 100,
    localAck: 200,
    remoteSeq: 200,
    createdAt: Date.now(),
  };
}

function createMockDeps() {
  const mockConn = createMockConnection();
  return {
    orchestrator: {
      handshake: vi.fn().mockResolvedValue({
        success: true,
        connection: mockConn,
        traces: [],
      }),
      teardown: vi.fn().mockResolvedValue({ success: true, traces: [] }),
    },
    dataController: {
      startTransfer: vi.fn().mockResolvedValue({
        messageId: 'msg-1',
        status: 'delivered',
      }),
    },
    sessionTracker: {
      startSession: vi.fn(),
      attachTrace: vi.fn(),
    },
  };
}

function createTestServer(): HttpServer {
  const server = new HttpServer({ nodeId: 'server-1' });
  server.route('GET', '/', () =>
    buildHttpResponse({ statusCode: 200, reasonPhrase: 'OK', requestId: 'r1', body: 'Hello' }),
  );
  server.route('GET', '/data', () =>
    buildHttpResponse({
      statusCode: 200,
      reasonPhrase: 'OK',
      requestId: 'r1',
      body: '{"ok":true}',
    }),
  );
  server.listen();
  return server;
}

describe('HttpClient', () => {
  it('opens a TCP connection to dstPort 80 by default', async () => {
    const deps = createMockDeps();
    const client = new HttpClient(deps as unknown as HttpClientDeps);
    const server = createTestServer();

    await client.request(
      'client-1',
      'server-1',
      {
        method: 'GET',
        url: '/',
        host: 'example.com',
        dstIp: '203.0.113.10',
      },
      server,
    );

    expect(deps.orchestrator.handshake).toHaveBeenCalledWith(
      'client-1',
      'server-1',
      expect.any(Number),
      80,
      expect.any(Object),
      undefined,
      expect.any(String),
    );
  });

  it('respects dstPort override', async () => {
    const deps = createMockDeps();
    const client = new HttpClient(deps as unknown as HttpClientDeps);
    const server = createTestServer();

    await client.request(
      'client-1',
      'server-1',
      {
        method: 'GET',
        url: '/',
        host: 'example.com',
        dstIp: '203.0.113.10',
        dstPort: 8080,
      },
      server,
    );

    expect(deps.orchestrator.handshake).toHaveBeenCalledWith(
      'client-1',
      'server-1',
      expect.any(Number),
      8080,
      expect.any(Object),
      undefined,
      expect.any(String),
    );
  });

  it('sends the serialized request bytes through DataTransferController', async () => {
    const deps = createMockDeps();
    const client = new HttpClient(deps as unknown as HttpClientDeps);
    const server = createTestServer();

    await client.request(
      'client-1',
      'server-1',
      {
        method: 'GET',
        url: '/',
        host: 'example.com',
        dstIp: '203.0.113.10',
        requestId: 'test-req',
      },
      server,
    );

    // First call sends request (client → server)
    const [srcNodeId, dstNodeId, payload] = deps.dataController.startTransfer.mock.calls[0];
    expect(srcNodeId).toBe('client-1');
    expect(dstNodeId).toBe('server-1');
    expect(payload).toContain('GET / HTTP/1.1');
    expect(payload).toContain('Host: example.com');
  });

  it('parses a well-formed response via httpParser', async () => {
    const deps = createMockDeps();
    const client = new HttpClient(deps as unknown as HttpClientDeps);
    const server = createTestServer();

    const resp = await client.request(
      'client-1',
      'server-1',
      {
        method: 'GET',
        url: '/',
        host: 'example.com',
        dstIp: '203.0.113.10',
      },
      server,
    );

    expect(resp.statusCode).toBe(200);
    expect(resp.reasonPhrase).toBe('OK');
    expect(resp.body).toBe('Hello');
  });

  it('closes the connection after the response completes', async () => {
    const deps = createMockDeps();
    const client = new HttpClient(deps as unknown as HttpClientDeps);
    const server = createTestServer();

    await client.request(
      'client-1',
      'server-1',
      {
        method: 'GET',
        url: '/',
        host: 'example.com',
        dstIp: '203.0.113.10',
      },
      server,
    );

    expect(deps.orchestrator.teardown).toHaveBeenCalledTimes(1);
  });

  it('surfaces parse errors as a rejected promise', async () => {
    const deps = createMockDeps();
    const client = new HttpClient(deps as unknown as HttpClientDeps);

    // Server that returns a malformed response (no reasonPhrase)
    const badServer = new HttpServer({ nodeId: 'server-1' });
    badServer.route('GET', '/', () => ({
      layer: 'L7' as const,
      httpVersion: 'HTTP/1.1' as const,
      statusCode: 200,
      // missing reasonPhrase — serializeHttp will emit empty, parseHttp returns error
      headers: {},
    }));
    badServer.listen();

    // The serialized response "HTTP/1.1 200 \r\n..." is still parseable with empty reasonPhrase
    // Instead, test with a response that genuinely fails parsing
    // Override the response flow by making server return something that parseHttp rejects
    const errorServer = new HttpServer({ nodeId: 'server-1' });
    errorServer.route('GET', '/', () => ({
      layer: 'L7' as const,
      httpVersion: 'HTTP/1.1' as const,
      // No statusCode AND no method → serializeHttp produces no start-line → parseHttp errors
      headers: {},
    }));
    errorServer.listen();

    await expect(
      client.request(
        'client-1',
        'server-1',
        {
          method: 'GET',
          url: '/',
          host: 'example.com',
          dstIp: '203.0.113.10',
        },
        errorServer,
      ),
    ).rejects.toThrow();
  });

  it('opens a session in SessionTracker', async () => {
    const deps = createMockDeps();
    const client = new HttpClient(deps as unknown as HttpClientDeps);
    const server = createTestServer();

    await client.request(
      'client-1',
      'server-1',
      {
        method: 'GET',
        url: '/',
        host: 'example.com',
        dstIp: '203.0.113.10',
      },
      server,
    );

    expect(deps.sessionTracker.startSession).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        srcNodeId: 'client-1',
        dstNodeId: 'server-1',
        protocol: 'HTTP',
      }),
    );
  });

  it('picks an ephemeral source port in [49152, 65535]', async () => {
    const deps = createMockDeps();
    const client = new HttpClient(deps as unknown as HttpClientDeps);
    const server = createTestServer();

    await client.request(
      'client-1',
      'server-1',
      {
        method: 'GET',
        url: '/',
        host: 'example.com',
        dstIp: '203.0.113.10',
      },
      server,
    );

    const srcPort = deps.orchestrator.handshake.mock.calls[0][2] as number;
    expect(srcPort).toBeGreaterThanOrEqual(49152);
    expect(srcPort).toBeLessThanOrEqual(65535);
  });

  it('sends response bytes back through DataTransferController (server → client)', async () => {
    const deps = createMockDeps();
    const client = new HttpClient(deps as unknown as HttpClientDeps);
    const server = createTestServer();

    await client.request(
      'client-1',
      'server-1',
      {
        method: 'GET',
        url: '/',
        host: 'example.com',
        dstIp: '203.0.113.10',
      },
      server,
    );

    // Second call sends response (server → client)
    expect(deps.dataController.startTransfer).toHaveBeenCalledTimes(2);
    const [srcNodeId, dstNodeId, payload] = deps.dataController.startTransfer.mock.calls[1];
    expect(srcNodeId).toBe('server-1');
    expect(dstNodeId).toBe('client-1');
    expect(payload).toContain('HTTP/1.1 200 OK');
  });
});
