import { useMemo, useState, type CSSProperties } from 'react';
import { Http3Orchestrator } from '../../src/layers/l7-application/h3/Http3Orchestrator';
import DemoShell from '../DemoShell';

const PANEL_STYLE: CSSProperties = {
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  padding: 12,
};

const BUTTON_STYLE: CSSProperties = {
  border: '1px solid var(--netlab-border-strong)',
  borderRadius: 6,
  background: 'var(--netlab-accent-cyan)',
  color: '#082f49',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontWeight: 700,
  padding: '8px 12px',
};

export default function Http3Demo() {
  const [loss, setLoss] = useState(false);
  const orchestrator = useMemo(() => new Http3Orchestrator(), []);
  const run = orchestrator.runRequests(['/a', '/b', '/c', '/d'], loss ? { lostStreamId: 4n } : {});

  return (
    <DemoShell
      title="HTTP/3 over QUIC"
      desc="Compare QUIC per-stream progress with HTTP/2 TCP transport HOL."
    >
      <main style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 16 }}>
        <section style={PANEL_STYLE} aria-label="HTTP/3 streams">
          <button
            type="button"
            data-testid="h3-quic-loss-toggle"
            style={BUTTON_STYLE}
            onClick={() => setLoss((value) => !value)}
          >
            {loss ? 'Disable QUIC Stream Loss' : 'Enable QUIC Stream Loss'}
          </button>
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {run.streams.map((stream) => (
              <div key={String(stream.id)} data-testid={`h3-stream-${stream.id}`}>
                Stream {String(stream.id)} {stream.path}: {stream.status}
              </div>
            ))}
          </div>
        </section>
        <aside style={PANEL_STYLE} aria-label="HTTP/3 frame order" data-testid="demo-trace-log">
          <h3 style={{ marginTop: 0 }}>Frame Order</h3>
          {run.annotations.map((annotation, index) => (
            <div key={`${annotation}-${index}`}>{annotation}</div>
          ))}
        </aside>
      </main>
    </DemoShell>
  );
}
