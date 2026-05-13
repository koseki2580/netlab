import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TlsHandshakeView } from './TlsHandshakeView';
import type { TlsAnnotation } from '../../types/tls';

const annotations: TlsAnnotation[] = [
  { kind: 'tls:client-hello', keyShareLen: 32, alpnList: ['http/1.1'] },
  { kind: 'tls:server-hello', selectedAlpn: 'http/1.1' },
  { kind: 'tls:certificate', certBytes: 256 },
  { kind: 'tls:certificate-verify', sigBytes: 32 },
  { kind: 'tls:finished', who: 'server' },
  { kind: 'tls:finished', who: 'client' },
];

describe('TlsHandshakeView', () => {
  it('renders TLS phases, ALPN, and placeholder provider note', () => {
    const html = renderToStaticMarkup(
      <TlsHandshakeView
        annotations={annotations}
        providerId="fake-deterministic"
        secrets={[{ label: 'handshakeSecret', value: new Uint8Array(32).fill(1) }]}
      />,
    );

    expect(html).toContain('TLS 1.3 handshake');
    expect(html).toContain('ALPN: http/1.1');
    expect(html).toContain('tls:client-hello');
    expect(html).toContain('math is illustrative');
  });
});
