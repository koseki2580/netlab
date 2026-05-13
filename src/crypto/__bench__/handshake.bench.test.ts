import { describe, expect, it } from 'vitest';
import { WebCryptoProvider } from '../WebCryptoProvider';
import { TlsOrchestrator } from '../../layers/l5-tls/TlsOrchestrator';

describe.skipIf(!globalThis.crypto?.subtle)('TLS WebCrypto handshake bench', () => {
  it('keeps median handshake latency below the teaching gate', async () => {
    const provider = new WebCryptoProvider();
    const timings: number[] = [];

    for (let index = 0; index < 20; index += 1) {
      const started = performance.now();
      await new TlsOrchestrator(provider).runHandshake({
        clientNodeId: 'client-1',
        serverNodeId: 'server-1',
        clientIp: '10.0.0.10',
        serverIp: '203.0.113.10',
        clientAlpn: ['http/1.1'],
        server: { enabled: true, alpnProtocols: ['http/1.1'] },
      });
      timings.push(performance.now() - started);
    }

    const median =
      [...timings].sort((left, right) => left - right)[Math.floor(timings.length / 2)] ?? 0;
    expect(median).toBeLessThanOrEqual(50);
  });
});
