import { describe, expect, it } from 'vitest';
import { TlsOrchestrator } from './TlsOrchestrator';

describe('TlsOrchestrator', () => {
  it('runs a deterministic placeholder TLS handshake', async () => {
    const orchestrator = new TlsOrchestrator();
    const result = await orchestrator.runHandshake({
      clientNodeId: 'client-1',
      serverNodeId: 'server-1',
      clientIp: '10.0.0.10',
      serverIp: '203.0.113.10',
      clientAlpn: ['http/1.1'],
      server: { enabled: true, alpnProtocols: ['http/1.1'] },
    });

    expect(result.context.state).toBe('connected');
    expect(result.annotations.map((annotation) => annotation.kind)).toEqual([
      'tls:client-hello',
      'tls:server-hello',
      'tls:certificate',
      'tls:certificate-verify',
      'tls:finished',
      'tls:finished',
      'tls:application-data',
    ]);
    expect(result.traces).toHaveLength(result.annotations.length);
    expect(result.records.every((record) => record.length <= 1500)).toBe(true);
  });

  it('emits a no_application_protocol alert on ALPN mismatch', async () => {
    const result = await new TlsOrchestrator().runHandshake({
      clientNodeId: 'client-1',
      serverNodeId: 'server-1',
      clientIp: '10.0.0.10',
      serverIp: '203.0.113.10',
      clientAlpn: ['http/1.1'],
      server: { enabled: true, alpnProtocols: ['h2'] },
    });

    expect(result.context.state).toBe('closed');
    expect(result.annotations[result.annotations.length - 1]).toMatchObject({
      kind: 'tls:alert',
      description: 'no_application_protocol',
    });
  });
});
