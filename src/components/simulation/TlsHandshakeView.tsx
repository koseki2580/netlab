import type { TlsAnnotation } from '../../types/tls';

export interface TlsHandshakeViewProps {
  readonly annotations: readonly TlsAnnotation[];
  readonly providerId?: string;
  readonly secrets?: readonly { readonly label: string; readonly value: Uint8Array }[];
}

function hexShort(bytes: Uint8Array): string {
  const full = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return full.length > 16
    ? `${full.slice(0, 8)}...${full.slice(-8)} (${bytes.length} bytes)`
    : full;
}

function annotationLabel(annotation: TlsAnnotation): string {
  switch (annotation.kind) {
    case 'tls:client-hello':
      return `ClientHello key_share=${annotation.keyShareLen} alpn=${annotation.alpnList.join(',')}`;
    case 'tls:server-hello':
      return `ServerHello selected=${annotation.selectedAlpn ?? '-'}`;
    case 'tls:certificate':
      return `Certificate ${annotation.certBytes} bytes`;
    case 'tls:certificate-verify':
      return `CertificateVerify ${annotation.sigBytes} bytes`;
    case 'tls:finished':
      return `Finished (${annotation.who})`;
    case 'tls:application-data':
      return `Application Data ${annotation.bytes} bytes`;
    case 'tls:alert':
      return `Alert ${annotation.level} ${annotation.description}`;
  }
}

export function TlsHandshakeView({
  annotations,
  providerId = 'fake-deterministic',
  secrets = [],
}: TlsHandshakeViewProps) {
  const selectedAlpn = annotations.find(
    (annotation): annotation is Extract<TlsAnnotation, { kind: 'tls:server-hello' }> =>
      annotation.kind === 'tls:server-hello',
  )?.selectedAlpn;
  const alert = annotations.find(
    (annotation): annotation is Extract<TlsAnnotation, { kind: 'tls:alert' }> =>
      annotation.kind === 'tls:alert',
  );

  return (
    <section
      role="region"
      aria-label="TLS 1.3 handshake"
      style={{
        background: 'var(--netlab-bg-panel)',
        border: '1px solid var(--netlab-border-subtle)',
        borderRadius: 8,
        color: 'var(--netlab-text-primary)',
        padding: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <strong>TLS 1.3 handshake</strong>
        <span style={{ color: alert ? 'var(--netlab-accent-red)' : 'var(--netlab-accent-green)' }}>
          {alert ? `ALPN: ${alert.description}` : `ALPN: ${selectedAlpn ?? '-'}`}
        </span>
      </div>
      <ol style={{ display: 'grid', gap: 6, margin: 0, paddingLeft: 20 }}>
        {annotations.map((annotation, index) => (
          <li key={`${annotation.kind}-${index}`}>
            <code>{annotation.kind}</code> {annotationLabel(annotation)}
          </li>
        ))}
      </ol>
      <details style={{ marginTop: 12 }}>
        <summary>Derived secrets</summary>
        <div
          style={{ display: 'grid', gap: 6, marginTop: 8, fontFamily: 'monospace', fontSize: 12 }}
        >
          <div>
            Provider: {providerId}
            {providerId === 'fake-deterministic' ? ' (math is illustrative)' : ''}
          </div>
          {secrets.map((secret) => (
            <div key={secret.label}>
              {secret.label}: {hexShort(secret.value)}
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
