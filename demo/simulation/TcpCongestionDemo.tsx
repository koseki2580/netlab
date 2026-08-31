import { useMemo, useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { TcpCongestionPanel } from '../../src/components/simulation/TcpCongestionPanel';
import { TcpCongestionControl } from '../../src/layers/l4-transport/TcpCongestionControl';
import { DeterministicLossInjector } from '../../src/layers/l4-transport/TcpLossInjector';
import { tcpHandshake } from '../../src/scenarios';
import type { TcpCongestionEvent } from '../../src/types/tcp-congestion';
import DemoShell from '../DemoShell';

const CONN_ID = '10.0.0.10:12345-203.0.113.10:443';
const MSS = 1000;

function runCongestionScenario(): readonly TcpCongestionEvent[] {
  const control = new TcpCongestionControl({ mss: MSS, initialSsthresh: 4000 });
  const loss = new DeterministicLossInjector(new Map([[CONN_ID, [3001, 9001]]]), {
    oneShot: true,
  });

  control.onSegmentSent(1001, MSS, 1);
  control.onAckReceived(2001, 100, 2);
  control.onSegmentSent(2001, MSS, 3);
  control.onAckReceived(3001, 100, 4);

  for (const seq of [3001, 4001, 5001, 6001]) {
    control.onSegmentSent(seq, MSS, seq === 3001 ? 5 : 6);
    if (loss.shouldDropSegment(CONN_ID, seq)) {
      continue;
    }
    control.onDupAck(3001, seq === 4001 ? 7 : seq === 5001 ? 8 : 9);
  }

  control.onAckReceived(7001, 120, 10);
  control.onSegmentSent(9001, MSS * 2, 11);
  if (loss.shouldDropSegment(CONN_ID, 9001)) {
    control.onRto(9001, 12);
  }

  return [...control.events];
}

function TopologyPanel() {
  return (
    <div
      // A label on a plain div is dropped by assistive tech — `aria-label` is
      // prohibited without a role that takes a name, so this one announced
      // nothing at all. `group` rather than `img`: the panel holds the canvas
      // with its focusable devices and zoom controls, and calling that a
      // picture claims it has nothing to interact with.
      role="group"
      aria-label="TCP congestion demo topology"
      style={{
        position: 'relative',
        height: 240,
        border: '1px solid var(--netlab-border-subtle)',
        borderRadius: 8,
        background: 'var(--netlab-bg-surface)',
        marginBottom: 14,
        overflow: 'hidden',
      }}
    >
      <NetlabProvider defaultTopology={tcpHandshake.topology}>
        <NetlabCanvas style={{ height: 240 }} />
      </NetlabProvider>
    </div>
  );
}

export default function TcpCongestionDemo() {
  const initialEvents = useMemo(() => runCongestionScenario(), []);
  const [events, setEvents] = useState<readonly TcpCongestionEvent[]>(initialEvents);

  return (
    <DemoShell
      title="TCP Congestion Control"
      desc="Slow start, fast retransmit, recovery, and RTO on one deterministic trace."
    >
      <main
        style={{
          height: '100%',
          overflow: 'auto',
          padding: 18,
          background: 'var(--netlab-bg-canvas)',
          color: 'var(--netlab-text-primary)',
        }}
      >
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <TopologyPanel />

          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <button
              type="button"
              data-testid="tcp-congestion-run"
              onClick={() => setEvents(runCongestionScenario())}
              style={{
                border: '1px solid var(--netlab-border-strong)',
                borderRadius: 6,
                background: 'var(--netlab-bg-panel)',
                color: 'var(--netlab-text-primary)',
                padding: '8px 12px',
                fontFamily: 'monospace',
                cursor: 'pointer',
              }}
            >
              Run trace
            </button>
            <button
              type="button"
              data-testid="tcp-congestion-reset"
              onClick={() => setEvents([])}
              style={{
                border: '1px solid var(--netlab-border-subtle)',
                borderRadius: 6,
                background: 'transparent',
                color: 'var(--netlab-text-secondary)',
                padding: '8px 12px',
                fontFamily: 'monospace',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>

          <TcpCongestionPanel events={events} />

          <section
            aria-label="TCP congestion walkthrough"
            style={{
              marginTop: 14,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
              fontSize: 13,
              lineHeight: 1.6,
              color: 'var(--netlab-text-secondary)',
            }}
          >
            <p style={{ margin: 0 }}>
              The first ACKs grow `cwnd` from one MSS through slow start until the threshold is
              reached.
            </p>
            <p style={{ margin: 0 }}>
              The deterministic drop at sequence 3001 creates duplicate ACKs and triggers fast
              retransmit before the RTO path is needed.
            </p>
            <p style={{ margin: 0 }}>
              The later drop at sequence 9001 has no recovery ACKs, so the sender falls back to RTO
              and resets the window.
            </p>
          </section>
        </div>
      </main>
    </DemoShell>
  );
}
