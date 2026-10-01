import { useMemo, useState, type CSSProperties } from 'react';
import { TlsHandshakeView } from '../../src/components/simulation/TlsHandshakeView';
import { TlsOrchestrator, type TlsHandshakeRun } from '../../src/layers/l5-tls/TlsOrchestrator';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';

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
  return (
    <DemoShell
      title="HTTPS TLS 1.3"
      desc="Inspect the TLS handshake that runs before an HTTP/1.1 request over port 443."
    >
      <HttpsDemoInner />
    </DemoShell>
  );
}

function HttpsDemoInner() {
  const t = useT();
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
    <main
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 420px',
        gap: 14,
        minHeight: 520,
      }}
    >
      <section style={PANEL_STYLE} aria-label={t('HTTPS flow', 'HTTPS の流れ')}>
        <div
          data-testid="lesson-brief"
          style={{
            border: '1px solid var(--netlab-border-subtle)',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 12,
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          <strong>{t('How TLS starts', 'TLS の始まり方')}</strong>
          <div>
            {t(
              'The client opens with a ClientHello: the key it offers, and through ALPN the application protocols it can speak (for example h2 or http/1.1). The server answers with a ServerHello carrying only its key, the TLS version and the cipher. Everything after that is encrypted: EncryptedExtensions names the ALPN protocol the server chose, then come its certificate and the proof that it owns the key. Only then does application data flow.',
              'クライアントは ClientHello から始めます。使う鍵の材料と、ALPN（使えるアプリケーションの種類の一覧。例：h2、http/1.1）を伝えます。サーバは ServerHello で答えます。入っているのは鍵の材料、TLS のバージョン、暗号の方式だけです。ここから先は暗号化されます。サーバが選んだ ALPN は EncryptedExtensions で伝えられ、続いて証明書と、鍵の持ち主であることの証明が届きます。アプリケーションのデータが流れるのはそのあとです。',
            )}
          </div>
          <div>
            {t(
              'This server accepts only h2. If none of the client’s ALPN choices is acceptable, the server ends the handshake at once with a no_application_protocol alert — before any certificate is sent.',
              'このサーバが受け付けるのは h2 だけです。クライアントの ALPN の中に受け付けられるものがなければ、サーバは証明書を送る前に、no_application_protocol の警告でハンドシェイクを打ち切ります。',
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button
            type="button"
            data-testid="tls-run-handshake"
            onClick={() => void execute(['http/1.1'])}
            style={{
              ...BUTTON_STYLE,
              background: 'var(--netlab-accent-cyan)',
              color: 'var(--netlab-bg-primary)',
            }}
          >
            {t('Run HTTPS handshake', 'HTTPS のハンドシェイクを実行')}
          </button>
          <button
            type="button"
            data-testid="tls-force-alpn-mismatch"
            onClick={() => void execute(['h2'])}
            style={{
              ...BUTTON_STYLE,
              background: 'var(--netlab-bg-elevated)',
              color: 'var(--netlab-text-primary)',
            }}
          >
            {t('Force ALPN mismatch', 'ALPN をわざと食い違わせる')}
          </button>
        </div>
        <ol
          aria-label={t('TLS annotation sequence', 'TLS のやり取りの順序')}
          data-testid="demo-trace-log"
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
  );
}
