import { describe, expect, it } from 'vitest';
import { WebCryptoProvider } from '../../../crypto/WebCryptoProvider';
import { QuicHandshake } from './QuicHandshake';

describe.skipIf(!globalThis.crypto?.subtle)('QuicHandshake', () => {
  it('reaches connected state and emits QUIC packet annotations', async () => {
    const run = await new QuicHandshake(new WebCryptoProvider()).connect({ alpn: 'h3' });

    expect(run.state).toBe('connected');
    expect(run.selectedAlpn).toBe('h3');
    expect(run.annotations.map((annotation) => annotation.kind)).toEqual([
      'quic:packet(initial)',
      'quic:packet(handshake)',
      'quic:packet(1rtt)',
    ]);
  });
});
