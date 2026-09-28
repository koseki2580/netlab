import { Fragment, useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import {
  TcpCongestionPanel,
  type TcpSsthreshSample,
} from '../../src/components/simulation/TcpCongestionPanel';
import { TcpCongestionControl } from '../../src/layers/l4-transport/TcpCongestionControl';
import { DeterministicLossInjector } from '../../src/layers/l4-transport/TcpLossInjector';
import { tcpHandshake } from '../../src/scenarios';
import type { TcpCongestionEvent } from '../../src/types/tcp-congestion';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';

const NO_EVENTS: readonly TcpCongestionEvent[] = [];
const CONN_ID = '10.0.0.10:12345-203.0.113.10:443';
const MSS = 1000;

export interface CongestionRun {
  readonly events: readonly TcpCongestionEvent[];
  /** ssthresh after each step that could change it; the events do not carry it. */
  readonly ssthreshByStep: readonly TcpSsthreshSample[];
}

export function runCongestionScenario(): readonly TcpCongestionEvent[] {
  return runCongestionTrace().events;
}

export function runCongestionTrace(): CongestionRun {
  const control = new TcpCongestionControl({
    mss: MSS,
    // Two segments, so the window reaches 4000 before the four-segment burst
    // at steps 5–6; with one it was 3000 and the burst overran it.
    iwSegments: 2,
    initialSsthresh: 4000,
  });
  const ssthreshByStep: TcpSsthreshSample[] = [{ stepIndex: 0, ssthresh: control.state.ssthresh }];
  const recordSsthresh = (stepIndex: number) =>
    ssthreshByStep.push({ stepIndex, ssthresh: control.state.ssthresh });
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
    const dupAckStep = seq === 4001 ? 7 : seq === 5001 ? 8 : 9;
    control.onDupAck(3001, dupAckStep);
    recordSsthresh(dupAckStep);
  }

  control.onAckReceived(7001, 120, 10);
  control.onSegmentSent(9001, MSS * 2, 11);
  if (loss.shouldDropSegment(CONN_ID, 9001)) {
    control.onRto(9001, 12);
    recordSsthresh(12);
  }

  return { events: [...control.events], ssthreshByStep };
}

const GLOSSARY: readonly (readonly [string, string, string])[] = [
  [
    'cwnd',
    'The congestion window: how many bytes the sender may have sent and not yet had acknowledged.',
    '輻輳ウィンドウ (congestion window)。送信側が、まだ ACK を受け取っていないまま送ってよいバイト数です。',
  ],
  [
    'ssthresh',
    'The slow-start threshold: while cwnd is below it, each ACK adds one MSS (slow start); once cwnd reaches it, growth slows to about one MSS per round trip (congestion avoidance).',
    'スロースタートしきい値 (slow-start threshold)。cwnd がこれより小さい間は ACK ごとに 1 MSS ずつ増え (スロースタート)、これに達すると往復ごとに約 1 MSS の緩やかな増え方になります (輻輳回避)。',
  ],
  [
    'MSS',
    'The maximum segment size: the most data one TCP segment carries — 1000 bytes in this lesson.',
    '最大セグメントサイズ (maximum segment size)。1 つの TCP セグメントが運ぶデータの上限で、このレッスンでは 1000 バイトです。',
  ],
  [
    'RTO',
    'The retransmission timeout: when no ACK arrives before this timer fires, the sender resends and drops cwnd to one MSS.',
    '再送タイムアウト (retransmission timeout)。このタイマーが切れるまで ACK が届かないと、送信側は再送し、cwnd を 1 MSS に下げます。',
  ],
];

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
  // Empty until the learner runs it. The trace is deterministic, so drawing it
  // at mount made the lesson's one button recompute an identical array — press
  // it and nothing on the screen changed.
  const [run, setRun] = useState<CongestionRun | null>(null);

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
            data-primary-action=""
            onClick={() => setRun(runCongestionTrace())}
            style={{
              border: '1px solid var(--netlab-accent-green)',
              borderRadius: 6,
              background: 'color-mix(in srgb, var(--netlab-accent-green) 18%, transparent)',
              color: 'var(--netlab-text-primary)',
              fontWeight: 700,
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
            onClick={() => setRun(null)}
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

        <TcpCongestionPanel
          events={run?.events ?? NO_EVENTS}
          {...(run ? { ssthreshByStep: run.ssthreshByStep } : {})}
        />

        <dl
          aria-label={t('Terms used on the chart', 'グラフで使う用語')}
          style={{
            margin: '12px 0 0',
            display: 'grid',
            gridTemplateColumns: 'max-content 1fr',
            gap: '4px 10px',
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--netlab-text-secondary)',
          }}
        >
          {GLOSSARY.map(([term, en, ja]) => (
            <Fragment key={term}>
              <dt style={{ fontFamily: 'monospace', color: 'var(--netlab-text-primary)' }}>
                {term}
              </dt>
              <dd style={{ margin: 0 }}>{t(en, ja)}</dd>
            </Fragment>
          ))}
        </dl>

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
              'The first ACKs grow cwnd from two MSS (2000 bytes) through slow start until it reaches ssthresh, 4000 bytes.',
              '最初の ACK が届くたびに、cwnd は 2 MSS (2000 バイト) からスロースタートで増えていき、ssthresh の 4000 バイトに達するまで続きます。',
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
