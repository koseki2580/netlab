import { useMemo, useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { TcpCongestionPanel } from '../../src/components/simulation/TcpCongestionPanel';
import { TcpCongestionControl } from '../../src/layers/l4-transport/TcpCongestionControl';
import { DeterministicLossInjector } from '../../src/layers/l4-transport/TcpLossInjector';
import { tcpHandshake } from '../../src/scenarios';
import type { TcpCongestionEvent } from '../../src/types/tcp-congestion';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';

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
  const t = useT();
  return (
    <div
      // A label on a plain div is dropped by assistive tech — `aria-label` is
      // prohibited without a role that takes a name, so this one announced
      // nothing at all. `group` rather than `img`: the panel holds the canvas
      // with its focusable devices and zoom controls, and calling that a
      // picture claims it has nothing to interact with.
      role="group"
      aria-label={t('TCP congestion demo topology', 'TCP 輻輳制御デモのトポロジー')}
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
  return (
    <DemoShell
      title="TCP Congestion Control"
      desc="Slow start, fast retransmit, recovery, and RTO on one deterministic trace."
    >
      <TcpCongestionDemoInner />
    </DemoShell>
  );
}

function TcpCongestionDemoInner() {
  const t = useT();
  const initialEvents = useMemo(() => runCongestionScenario(), []);
  const [events, setEvents] = useState<readonly TcpCongestionEvent[]>(initialEvents);

  return (
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
            {t('Run trace', 'トレースを実行')}
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
            {t('Reset', 'リセット')}
          </button>
        </div>

        <TcpCongestionPanel events={events} />

        <section
          aria-label={t('TCP congestion walkthrough', 'TCP 輻輳制御の流れ')}
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
            {t(
              'The first ACKs grow `cwnd` from one MSS through slow start until the threshold is reached.',
              '最初の ACK が届くたびに、`cwnd` は 1 MSS からスロースタートで増えていき、しきい値に達するまで続きます。',
            )}
          </p>
          <p style={{ margin: 0 }}>
            {t(
              'The deterministic drop at sequence 3001 creates duplicate ACKs and triggers fast retransmit before the RTO path is needed.',
              'シーケンス番号 3001 で毎回決まって起きる破棄によって重複 ACK が返り、RTO を待つ前に高速再送が始まります。',
            )}
          </p>
          <p style={{ margin: 0 }}>
            {t(
              'The later drop at sequence 9001 has no recovery ACKs, so the sender falls back to RTO and resets the window.',
              '後で起きるシーケンス番号 9001 の破棄では回復のための ACK が返らないため、送信側は RTO による再送に頼り、ウィンドウをリセットします。',
            )}
          </p>
        </section>
      </div>
    </main>
  );
}
