import { useMemo, useState, type CSSProperties } from 'react';
import { Http3Orchestrator } from '../../src/layers/l7-application/h3/Http3Orchestrator';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';

const PANEL_STYLE: CSSProperties = {
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  padding: 12,
};

const BUTTON_STYLE: CSSProperties = {
  border: '1px solid var(--netlab-border-strong)',
  borderRadius: 6,
  background: 'var(--netlab-accent-cyan)',
  color: 'var(--netlab-bg-primary)',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontWeight: 700,
  padding: '8px 12px',
};

export default function Http3Demo() {
  return (
    <DemoShell
      title="HTTP/3 over QUIC"
      desc="Compare QUIC per-stream progress with HTTP/2 TCP transport HOL."
    >
      <Http3DemoInner />
    </DemoShell>
  );
}

function Http3DemoInner() {
  const t = useT();
  const [loss, setLoss] = useState(false);
  const orchestrator = useMemo(() => new Http3Orchestrator(), []);
  const run = orchestrator.runRequests(['/a', '/b', '/c', '/d'], loss ? { lostStreamId: 4n } : {});

  return (
    <main style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 16 }}>
      <section style={PANEL_STYLE} aria-label={t('HTTP/3 streams', 'HTTP/3 のストリーム')}>
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
          <strong>
            {t('Why a loss here stalls only one stream', 'ここではロスが 1 本だけを止める理由')}
          </strong>
          <div>
            {t(
              'HTTP/3 runs over QUIC, which runs over UDP instead of TCP. QUIC numbers and recovers each stream on its own, so a lost packet holds up only the stream whose data it carried; the others are delivered at once. Compare the HTTP/2 lesson, where one TCP connection stalls every stream.',
              'HTTP/3 は TCP ではなく、UDP の上の QUIC で動きます。QUIC はストリームごとに番号を付けて別々に回復するので、失われたパケットが止めるのは、そのデータを運んでいたストリームだけです。ほかのストリームはすぐ届きます。1 本の TCP 接続で全ストリームが止まる HTTP/2 のレッスンと比べてみてください。',
            )}
          </div>
          <div>
            {t(
              'The four requests use stream IDs 0, 4, 8 and 12: streams the client opens for a request and its response take IDs whose last two bits are 00, so they count up in fours. The loss here hits stream 4; it waits for the lost data to be sent again while 0, 8 and 12 complete.',
              '4 つのリクエストのストリーム ID は 0・4・8・12 です。クライアントが開く「リクエストと応答用」のストリームは ID の下位 2 ビットが 00 と決まっているため、4 ずつ増えます。ここでのロスはストリーム 4 に当たり、4 は失われたデータの再送を待ちますが、0・8・12 は完了します。',
            )}
          </div>
        </div>
        <button
          type="button"
          data-testid="h3-quic-loss-toggle"
          style={BUTTON_STYLE}
          onClick={() => setLoss((value) => !value)}
        >
          {loss
            ? t('Disable QUIC Stream Loss', 'QUIC ストリームのロスを止める')
            : t('Enable QUIC Stream Loss', 'QUIC ストリームのロスを起こす')}
        </button>
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {run.streams.map((stream) => (
            <div key={String(stream.id)} data-testid={`h3-stream-${stream.id}`}>
              {t('Stream', 'ストリーム')} {String(stream.id)} {stream.path}:{' '}
              {stream.status === 'stalled' ? t('stalled', '停止中') : t('complete', '完了')}
            </div>
          ))}
        </div>
      </section>
      <aside
        style={PANEL_STYLE}
        aria-label={t('HTTP/3 frame order', 'HTTP/3 のフレームの順序')}
        data-testid="demo-trace-log"
      >
        <h3 style={{ marginTop: 0 }}>{t('Frame Order', 'フレームの順序')}</h3>
        {run.annotations.map((annotation, index) => (
          <div key={`${annotation}-${index}`}>{annotation}</div>
        ))}
      </aside>
    </main>
  );
}
