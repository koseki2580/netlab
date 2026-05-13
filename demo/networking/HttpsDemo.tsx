import { useMemo, useState, type CSSProperties } from 'react';
import { TlsHandshakeView } from '../../src/components/simulation/TlsHandshakeView';
import { TlsOrchestrator, type TlsHandshakeRun } from '../../src/layers/l5-tls/TlsOrchestrator';
import DemoShell from '../DemoShell';

const BUTTON_STYLE: CSSProperties = {
  border: '1px solid var(--netlab-border-strong)',
  borderRadius: 6,
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontWeight: 700,
  padding: '8px 12px',
};

const PANEL_STYLE: CSSProperties = {
  background: 'var(--netlab-bg-panel)',
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  color: 'var(--netlab-text-primary)',
  padding: 12,
};

export default function HttpsDemo() {
  const orchestrator = useMemo(() => new TlsOrchestrator(), []);
  const [run, setRun] = useState<TlsHandshakeRun | null>(null);

  const execute = async (serverAlpn: readonly string[]) => {
    const result = await orchestrator.runHandshake({
      clientNodeId: 'client-1',
      serverNodeId: 'server-1',
      clientIp: '10.0.0.10',
      serverIp: '203.0.113.10',
      clientAlpn: ['http/1.1'],
      hostname: 'www.example.test',
      server: { enabled: true, alpnProtocols: serverAlpn, hostname: 'www.example.test' },
    });
    setRun(result);
  };

  return (
    <DemoShell
      title="HTTPS TLS 1.3"
      desc="Inspect the TLS handshake that runs before an HTTP/1.1 request over port 443."
    >
      <main
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 420px',
          gap: 14,
          minHeight: 520,
        }}
      >
        <section style={PANEL_STYLE} aria-label="HTTPS flow">
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              type="button"
              onClick={() => void execute(['http/1.1'])}
              style={{ ...BUTTON_STYLE, background: 'var(--netlab-accent-cyan)', color: '#082f49' }}
            >
              Run HTTPS handshake
            </button>
            <button
              type="button"
              onClick={() => void execute(['h2'])}
              style={{
                ...BUTTON_STYLE,
                background: 'var(--netlab-bg-elevated)',
                color: 'var(--netlab-text-primary)',
              }}
            >
              Force ALPN mismatch
            </button>
          </div>
          <ol
            aria-label="TLS annotation sequence"
            style={{
              display: 'grid',
              gap: 6,
              fontFamily: 'monospace',
              fontSize: 13,
              margin: 0,
              paddingLeft: 22,
            }}
          >
            {(run?.annotations ?? []).map((annotation, index) => (
              <li key={`${annotation.kind}-${index}`}>
                {annotation.kind}
                {annotation.kind === 'tls:alert' ? ` (${annotation.description})` : ''}
              </li>
            ))}
          </ol>
        </section>
        <aside>
          <TlsHandshakeView
            annotations={run?.annotations ?? []}
            secrets={run?.secrets ?? []}
            providerId="fake-deterministic"
          />
        </aside>
      </main>
    </DemoShell>
  );
}
