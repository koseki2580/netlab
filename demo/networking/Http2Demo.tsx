import { useMemo, useState, type CSSProperties } from 'react';
import { Http2Orchestrator } from '../../src/layers/l7-application/h2/Http2Orchestrator';
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
  color: 'var(--netlab-bg-primary)',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontWeight: 700,
  padding: '8px 12px',
};

export default function Http2Demo() {
  const [loss, setLoss] = useState(false);
  const orchestrator = useMemo(() => new Http2Orchestrator(), []);
  const run = orchestrator.runMultiplexedRequests(['/a', '/b', '/c', '/d'], {
    transportLoss: loss,
  });

  return (
    <DemoShell
      title="HTTP/2 Multiplexing"
      desc="Compare interleaved HTTP/2 DATA frames with TCP transport HOL."
    >
      <main style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 16 }}>
        <section style={PANEL_STYLE} aria-label="HTTP/2 streams">
          <button
            type="button"
            data-testid="h2-tcp-loss-toggle"
            style={BUTTON_STYLE}
            onClick={() => setLoss((value) => !value)}
          >
            {loss ? 'Disable TCP Loss' : 'Enable TCP Loss'}
          </button>
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {run.streams.map((stream) => (
              <div key={stream.id} data-testid={`h2-stream-${stream.id}`}>
                Stream {stream.id} {stream.path}: {stream.status}
              </div>
            ))}
          </div>
        </section>
        <aside style={PANEL_STYLE} aria-label="HTTP/2 frame order">
          <h3 style={{ marginTop: 0 }}>Frame Order</h3>
          {run.frames
            .filter((frame) => frame.kind === 'DATA')
            .map((frame, index) => (
              <div key={`${frame.streamId}-${index}`} data-testid="h2-data-frame">
                h2:frame(DATA) stream={frame.streamId}
              </div>
            ))}
        </aside>
      </main>
    </DemoShell>
  );
}
