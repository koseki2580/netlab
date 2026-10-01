import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TlsHandshakeView } from './TlsHandshakeView';
import type { TlsAnnotation } from '../../types/tls';

const annotations: TlsAnnotation[] = [
  { kind: 'tls:client-hello', keyShareLen: 32, alpnList: ['http/1.1'] },
  { kind: 'tls:server-hello', keyShareLen: 32 },
  { kind: 'tls:encrypted-extensions', selectedAlpn: 'http/1.1' },
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

  it('shows the ALPN choice on EncryptedExtensions, not on the ServerHello (TC-243)', () => {
    const html = renderToStaticMarkup(<TlsHandshakeView annotations={annotations} />);

    expect(html).toContain('EncryptedExtensions selected=http/1.1');
    expect(html).toContain(
      'ServerHello key_share=32 version=TLS 1.3 cipher=TLS_AES_128_GCM_SHA256',
    );
    expect(html).not.toContain('ServerHello selected');
    expect(html.indexOf('ServerHello')).toBeLessThan(html.indexOf('EncryptedExtensions'));
    expect(html.indexOf('EncryptedExtensions')).toBeLessThan(html.indexOf('Certificate 256'));
  });

  it('ends an ALPN mismatch with the alert, before any ServerHello (TC-243)', () => {
    const html = renderToStaticMarkup(
      <TlsHandshakeView
        annotations={[
          { kind: 'tls:client-hello', keyShareLen: 32, alpnList: ['http/1.1'] },
          { kind: 'tls:alert', level: 'fatal', description: 'no_application_protocol' },
        ]}
      />,
    );

    expect(html).toContain('ALPN: no_application_protocol');
    expect(html).toContain('Alert fatal no_application_protocol');
    expect(html).not.toContain('ServerHello');
  });
});
