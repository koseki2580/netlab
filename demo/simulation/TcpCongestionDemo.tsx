import { Fragment, useMemo, useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import {
  TcpCongestionPanel,
  type TcpSsthreshSample,
} from '../../src/components/simulation/TcpCongestionPanel';
import { TcpCongestionControl } from '../../src/layers/l4-transport/TcpCongestionControl';
import { DeterministicLossInjector } from '../../src/layers/l4-transport/TcpLossInjector';
import { tcpHandshake } from '../../src/scenarios';
import type { TcpCongestionEvent, TcpCongestionState } from '../../src/types/tcp-congestion';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';

const NO_EVENTS: readonly TcpCongestionEvent[] = [];
const CONN_ID = '10.0.0.10:12345-203.0.113.10:443';
const MSS = 1000;

export interface CongestionRun {
  readonly events: readonly TcpCongestionEvent[];
  /** ssthresh after each step that could change it; the events do not carry it. */
  readonly ssthreshByStep: readonly TcpSsthreshSample[];
  /** The sender's numbers around each step that sets ssthresh or deflates cwnd. */
  readonly working: readonly CongestionWorking[];
}

/** What the sender held just before a step, and what it held after. */
export interface CongestionWorking {
  readonly stepIndex: number;
  readonly kind: 'fast-retransmit' | 'deflate' | 'rto';
  readonly mss: number;
  readonly inflightBefore: number;
  readonly cwndBefore: number;
  readonly ssthreshBefore: number;
  readonly ssthresh: number;
  readonly cwnd: number;
}

/**
 * The arithmetic of one step, in the numbers the engine held. The rule is the
 * engine's own (`lossWindowThreshold`): half the larger of the bytes in flight
 * and cwnd, but never less than two segments.
 */
export function congestionWorkingText(
  working: CongestionWorking,
  t: (en: string, ja: string) => string,
): string {
  const { mss, inflightBefore, cwndBefore, ssthresh, cwnd } = working;
  if (working.kind === 'deflate') {
    return t(
      `The new ACK ends fast recovery: cwnd deflates to ssthresh = ${cwnd} B.`,
      `新しい ACK で高速リカバリが終わり、cwnd は ssthresh と同じ ${cwnd} B に戻ります。`,
    );
  }

  const half = Math.floor(Math.max(inflightBefore, cwndBefore) / 2);
  const numbers = `max(max(${inflightBefore}, ${cwndBefore}) ÷ 2, 2 × ${mss}) = max(${half}, ${2 * mss}) = ${ssthresh} B`;
  if (working.kind === 'fast-retransmit') {
    const window = `cwnd = ssthresh + 3 × MSS = ${ssthresh} + 3 × ${mss} = ${cwnd} B`;
    return t(
      `ssthresh = max(max(in flight, cwnd) ÷ 2, 2 × MSS) = ${numbers}. ${window}.`,
      `ssthresh = max(max(送信中, cwnd) ÷ 2, 2 × MSS) = ${numbers}。${window}。`,
    );
  }

  const unchanged = working.ssthreshBefore === ssthresh;
  const window = `cwnd = 1 × MSS = ${cwnd} B`;
  return t(
    `ssthresh = max(max(in flight, cwnd) ÷ 2, 2 × MSS) = ${numbers}${unchanged ? ', so it does not change' : ''}. ${window}.`,
    `ssthresh = max(max(送信中, cwnd) ÷ 2, 2 × MSS) = ${numbers}${unchanged ? ' で、変わりません' : ''}。${window}。`,
  );
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
  const working: CongestionWorking[] = [];
  /** Run one step, and keep its numbers if it turned out to be a `kind` step. */
  const withWorking = (
    stepIndex: number,
    kind: CongestionWorking['kind'],
    step: () => void,
    applies: (before: TcpCongestionState, after: TcpCongestionState) => boolean,
  ) => {
    const before = control.state;
    step();
    const after = control.state;
    if (!applies(before, after)) return;
    working.push({
      stepIndex,
      kind,
      mss: after.mss,
      inflightBefore: before.inflight,
      cwndBefore: before.cwnd,
      ssthreshBefore: before.ssthresh,
      ssthresh: after.ssthresh,
      cwnd: after.cwnd,
    });
  };
  const loss = new DeterministicLossInjector(new Map([[CONN_ID, [3001, 9001, 10001]]]), {
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
    withWorking(
      dupAckStep,
      'fast-retransmit',
      () => control.onDupAck(3001, dupAckStep),
      (before, after) => before.phase !== 'fast-recovery' && after.phase === 'fast-recovery',
    );
    recordSsthresh(dupAckStep);
  }

  withWorking(
    10,
    'deflate',
    () => control.onAckReceived(7001, 120, 10),
    (before) => before.phase === 'fast-recovery',
  );
  // cwnd is 2000, so two segments go out: one segment never carries more than
  // the MSS. Both are lost, so no ACK — not even a duplicate — comes back.
  const tail = [9001, 10001];
  for (const seq of tail) {
    control.onSegmentSent(seq, MSS, 11);
  }
  if (tail.every((seq) => loss.shouldDropSegment(CONN_ID, seq))) {
    withWorking(
      12,
      'rto',
      () => control.onRto(9001, 12),
      () => true,
    );
    recordSsthresh(12);
  }

  return { events: [...control.events], ssthreshByStep, working };
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
  const notesByStep = useMemo(
    () =>
      run?.working.map((working) => ({
        stepIndex: working.stepIndex,
        text: congestionWorkingText(working, t),
      })),
    [run, t],
  );

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
          {...(notesByStep ? { notesByStep } : {})}
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
              'The later drops at sequences 9001 and 10001 have no recovery ACKs, so the sender falls back to RTO and resets the window. Both segments are still unacknowledged, so 2000 bytes stay in flight; the sender resends the oldest of them, 9001.',
              '後で起きるシーケンス番号 9001 と 10001 の破棄では回復のための ACK が返らないため、送信側は RTO による再送に頼り、ウィンドウをリセットします。2 つのセグメントはどちらもまだ ACK されていないので、送信中は 2000 バイトのままです。送信側はそのうち最も古い 9001 を再送します。',
            )}
          </p>
        </section>
      </div>
    </main>
  );
}
