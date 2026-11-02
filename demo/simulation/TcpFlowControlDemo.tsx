import { useEffect, useState, type CSSProperties } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { PacketStructureViewer } from '../../src/components/simulation/PacketStructureViewer';
import { tcpHandshake } from '../../src/scenarios';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { TcpHeaderOptions } from '../../src/types/packets';
import { NetlabProvider } from '../components/PhoneNetlabProvider';
import { LessonCanvas, LessonPanel, LessonSplit } from '../components/LessonPanel';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  runFlow,
  SERVER_BUFFER,
  TRANSFER_BYTES,
  type FlowRow,
  type FlowRun,
  type ReaderSpeed,
  type RowKind,
} from './tcpFlowLesson';

const TOPOLOGY = tcpHandshake.topology;
const SERVER_MSS = [1460, 1000, 536] as const;

const CARD: CSSProperties = {
  padding: 14,
  border: '1px solid var(--netlab-border)',
  borderRadius: 10,
  background: 'var(--netlab-bg-surface)',
  fontSize: 13,
  lineHeight: 1.6,
};
const LABEL: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--netlab-text-secondary)',
  marginBottom: 4,
};
const CELL: CSSProperties = { padding: '3px 6px', textAlign: 'right', whiteSpace: 'nowrap' };

function useRowName(): (kind: RowKind) => string {
  const t = useT();
  return (kind) => {
    switch (kind) {
      case 'syn':
        return 'SYN';
      case 'syn-ack':
        return 'SYN-ACK';
      case 'ack-3':
        return 'ACK';
      case 'data':
        return t('Data', 'データ');
      case 'ack':
        return 'ACK';
      case 'probe':
        return t('Window probe', 'ウィンドウプローブ');
      case 'probe-ack':
        return t('Answer to the probe', 'プローブへの返事');
      case 'window-update':
        return t('Window update', 'ウィンドウ更新');
    }
  };
}

function useOptionsText(): (options: TcpHeaderOptions) => string {
  const t = useT();
  return (options) =>
    [
      options.mss === undefined ? null : `MSS ${options.mss}`,
      options.windowScale === undefined
        ? null
        : t(`window scale ${options.windowScale}`, `ウィンドウスケール ${options.windowScale}`),
      options.sackPermitted ? t('SACK permitted', 'SACK 許可') : null,
    ]
      .filter((text) => text !== null)
      .join(t(', ', '、'));
}

/** What the two ends offered and what that settled. */
function NegotiatedCard({ run }: { run: FlowRun }) {
  const t = useT();
  const optionsText = useOptionsText();
  const { negotiated } = run;
  return (
    <div style={CARD} data-testid="tcp-negotiated">
      <div style={LABEL}>{t('What the handshake settled', 'ハンドシェイクで決まったこと')}</div>
      <div data-testid="tcp-syn-options">
        {t('SYN offers: ', 'SYN が示した内容：')}
        {optionsText(run.synOptions)}
      </div>
      <div data-testid="tcp-synack-options">
        {t('SYN-ACK offers: ', 'SYN-ACK が示した内容：')}
        {optionsText(run.synAckOptions)}
      </div>
      <div data-testid="tcp-negotiated-mss" style={{ fontWeight: 700 }}>
        {t(
          `Most data in one segment: ${negotiated.clientSendMss} bytes`,
          `1 セグメントのデータの上限：${negotiated.clientSendMss} バイト`,
        )}
      </div>
      <div>
        {t(
          `Window scaling: ${negotiated.windowScaling ? 'in use' : 'not in use'} (shift ${negotiated.serverWindowShift}). SACK: ${negotiated.sackPermitted ? 'allowed' : 'not allowed'}.`,
          `ウィンドウスケール：${negotiated.windowScaling ? '使う' : '使わない'}（シフト ${negotiated.serverWindowShift}）。SACK：${negotiated.sackPermitted ? '使える' : '使えない'}。`,
        )}
      </div>
      <div style={{ color: 'var(--netlab-text-secondary)', marginTop: 4 }}>
        {t(
          "MSS is not one agreed number: each end announces what it will receive, and each sender stays within the other end's figure and its own. Scaling and SACK count only if both ends offered them. This simulator offers SACK but does not use selective acknowledgements. The byte view below does not draw the options yet: it shows the rest of the header.",
          'MSS は 2 人で 1 つに決める値ではありません。それぞれが「自分はここまで受け取れる」と知らせ、送る側は相手の値と自分の値の両方を超えないようにします。スケールと SACK は、両方が示したときだけ使えます。このシミュレータは SACK を示しますが、選択確認応答そのものは行いません。下のバイト表示には、オプションはまだ描かれていません。ヘッダの残りの部分を表示します。',
        )}
      </div>
    </div>
  );
}

function Rows({
  rows,
  onChoose,
  chosen,
}: {
  rows: readonly FlowRow[];
  onChoose: (row: FlowRow) => void;
  chosen: string | null;
}) {
  const t = useT();
  const name = useRowName();
  const value = (number: number | null) => (number === null ? '—' : String(number));
  return (
    <div style={{ overflow: 'auto', maxHeight: 320 }} data-testid="tcp-flow-rows">
      <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
        <caption style={{ ...LABEL, textAlign: 'left' }}>
          {t(
            'Every segment, in order. Choose one to read its header below.',
            'すべてのセグメントを順に並べました。選ぶと、下でヘッダを読めます。',
          )}
        </caption>
        <thead>
          <tr>
            {[
              t('Round', '回'),
              t('Segment', 'セグメント'),
              t('Bytes', 'バイト'),
              t('Window', 'ウィンドウ'),
              'cwnd',
              'rwnd',
              t('In flight', '送信中'),
            ].map((heading) => (
              <th key={heading} scope="col" style={CELL}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const fromServer =
              row.kind === 'ack' || row.kind === 'probe-ack' || row.kind === 'window-update';
            const closed = fromServer && row.window === 0;
            return (
              <tr
                key={row.packetId || index}
                data-testid={`tcp-flow-row-${index}`}
                data-kind={row.kind}
                style={{
                  background:
                    row.packetId === chosen
                      ? 'color-mix(in srgb, var(--netlab-accent-cyan) 22%, transparent)'
                      : closed
                        ? 'color-mix(in srgb, var(--netlab-accent-orange) 16%, transparent)'
                        : undefined,
                }}
              >
                <td style={CELL}>{value(row.round)}</td>
                <td style={{ ...CELL, textAlign: 'left' }}>
                  <button
                    type="button"
                    data-testid={`tcp-flow-pick-${index}`}
                    aria-pressed={row.packetId === chosen}
                    onClick={() => onChoose(row)}
                    style={{
                      all: 'unset',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      minHeight: 24,
                    }}
                  >
                    {name(row.kind)}
                  </button>
                </td>
                <td style={CELL}>{row.length}</td>
                <td style={CELL} data-testid={`tcp-flow-window-${index}`}>
                  {fromServer ? value(row.window) : '—'}
                </td>
                <td style={CELL}>{value(row.cwnd)}</td>
                <td style={CELL}>{value(row.rwnd)}</td>
                <td style={CELL}>{value(row.inFlight)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Summary({ run }: { run: FlowRun }) {
  const t = useT();
  return (
    <div style={CARD} data-testid="tcp-flow-summary" role="status">
      <div style={LABEL}>{t('What happened', '起きたこと')}</div>
      <div data-testid="tcp-flow-delivered">
        {t(
          `${run.delivered} of ${TRANSFER_BYTES} bytes arrived. The largest data segment carried ${run.largestSegment} bytes.`,
          `${TRANSFER_BYTES} バイトのうち ${run.delivered} バイトが届きました。いちばん大きいデータのセグメントは ${run.largestSegment} バイトです。`,
        )}
      </div>
      {run.sawZeroWindow ? (
        <div data-testid="tcp-flow-stopped">
          {t(
            `The window reached 0, so the sender stopped. It sent ${run.probes} one-byte window ${run.probes === 1 ? 'probe' : 'probes'}, each answered with the current window, and the receiver took none of those bytes. Then ${run.updates} window ${run.updates === 1 ? 'update' : 'updates'} opened it again.`,
            `ウィンドウが 0 になったので、送信側は止まりました。1 バイトのウィンドウプローブを ${run.probes} 回送り、受信側はそのたびにいまのウィンドウを返しましたが、そのバイトは受け取っていません。そのあと、ウィンドウ更新 ${run.updates} 回でまた開きました。`,
          )}
        </div>
      ) : (
        <div data-testid="tcp-flow-never-stopped">
          {t(
            'The window never reached 0: the sender was never made to stop.',
            'ウィンドウは 0 になりませんでした。送信側が止められることはありませんでした。',
          )}
        </div>
      )}
    </div>
  );
}

/** The window of the chosen segment, as the field in its header says it. */
function ChosenSegment() {
  const t = useT();
  const { state } = useSimulation();
  const transport = state.selectedPacket?.frame.payload.payload;
  if (!transport || !('seq' in transport)) return null;
  return (
    <div data-testid="tcp-flow-field" style={CARD}>
      {t('Window field of this segment: ', 'このセグメントのウィンドウ欄：')}
      <strong data-testid="tcp-flow-field-value">{transport.windowSize ?? 65535}</strong>
    </div>
  );
}

function FlowControlInner() {
  const t = useT();
  const { engine } = useSimulation();
  const [speed, setSpeed] = useState<ReaderSpeed>('stops');
  const [mss, setMss] = useState<number>(SERVER_MSS[1]);
  const [run, setRun] = useState<FlowRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);

  // A changed setting makes the rows on screen those of another run.
  useEffect(() => {
    setRun(null);
    setChosen(null);
  }, [speed, mss]);

  const start = async () => {
    setBusy(true);
    setChosen(null);
    setRun(await runFlow(engine, TOPOLOGY, mss, speed));
    setBusy(false);
  };

  const choose = (row: FlowRow) => {
    engine.selectTrace(row.packetId);
    engine.selectHop(0);
    setChosen(row.packetId);
  };

  const speeds: readonly [ReaderSpeed, string][] = [
    ['fast', t('Reads everything at once', 'すぐ全部読む')],
    ['slow', t('Reads slowly (500 bytes a round)', 'ゆっくり読む（1 回 500 バイト）')],
    ['stops', t('Stops reading for a while', 'しばらく読むのをやめる')],
  ];

  return (
    <LessonSplit>
      <LessonCanvas canvas={<NetlabCanvas />} />
      <LessonPanel
        defaultWidth={560}
        maxWidth={760}
        style={{ background: 'var(--netlab-bg-primary)', overflow: 'auto' }}
      >
        <div style={{ display: 'grid', gap: 12, padding: 16 }}>
          <div style={CARD}>
            <div data-testid="lesson-lead" style={{ fontSize: 16, fontWeight: 700 }}>
              {t(
                'TCP never sends more than the receiver says it has room for.',
                'TCP は、受信側が「まだ入る」と言った分までしか送りません。',
              )}
            </div>
            <div style={{ marginTop: 6 }} data-testid="tcp-flow-rule">
              {t(
                `Every segment from the Server says how much room is left: its window (rwnd). The Client keeps the bytes in flight within the smaller of rwnd and its own cwnd. Here the Server has room for ${SERVER_BUFFER} bytes and the Client sends ${TRANSFER_BYTES}. Bytes stay in the Server's buffer until its application reads them, so make the application slow and watch.`,
                `Server のセグメントには、あとどれだけ入るか（ウィンドウ、rwnd）が書かれています。Client は、送信中のバイトが rwnd と自分の cwnd の小さいほうを超えないようにします。ここでは Server に ${SERVER_BUFFER} バイトの空きがあり、Client が ${TRANSFER_BYTES} バイトを送ります。届いたデータは、Server のアプリが読むまでバッファに残ります。アプリを遅くして、様子を見てください。`,
              )}
            </div>
          </div>

          <fieldset style={{ ...CARD, margin: 0 }}>
            <legend style={LABEL}>{t("The Server's application", 'Server のアプリ')}</legend>
            {speeds.map(([value, label]) => (
              <label key={value} style={{ display: 'block', minHeight: 28 }}>
                <input
                  type="radio"
                  name="tcp-flow-speed"
                  data-testid={`tcp-flow-speed-${value}`}
                  checked={speed === value}
                  onChange={() => setSpeed(value)}
                />{' '}
                {label}
              </label>
            ))}
          </fieldset>

          <fieldset style={{ ...CARD, margin: 0 }}>
            <legend style={LABEL}>{t("The Server's MSS", 'Server の MSS')}</legend>
            {SERVER_MSS.map((value) => (
              <label
                key={value}
                style={{ display: 'inline-block', minHeight: 28, marginRight: 14 }}
              >
                <input
                  type="radio"
                  name="tcp-flow-mss"
                  data-testid={`tcp-flow-mss-${value}`}
                  checked={mss === value}
                  onChange={() => setMss(value)}
                />{' '}
                {value}
              </label>
            ))}
          </fieldset>

          <button
            type="button"
            data-testid="tcp-flow-run"
            data-primary-action=""
            disabled={busy}
            onClick={() => void start()}
            style={{
              minHeight: 44,
              padding: '8px 14px',
              borderRadius: 6,
              border: 'none',
              background: '#0f766e',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            {t(
              `▶ Connect and send ${TRANSFER_BYTES} bytes`,
              `▶ 接続して ${TRANSFER_BYTES} バイト送る`,
            )}
          </button>

          {run ? (
            <>
              <Summary run={run} />
              <NegotiatedCard run={run} />
              <div style={CARD}>
                <Rows rows={run.rows} onChoose={choose} chosen={chosen} />
              </div>
              <ChosenSegment />
              <details data-testid="lesson-more" style={CARD}>
                <summary style={{ cursor: 'pointer' }}>
                  {t('A little more detail', 'もう少し詳しく')}
                </summary>
                <div style={{ marginTop: 4, color: 'var(--netlab-text-secondary)' }}>
                  {t(
                    'A probe is needed because a window update can be lost: without probes the two ends would wait for each other for ever (RFC 9293 §3.8.6.1). The wait between probes grows each time. Neither end acts on a few bytes of room: the receiver keeps the window shut until min(half its buffer, one MSS) is free, and the sender waits for a full segment (RFC 9293 §3.8.6.2, silly window syndrome). A round here stands for one round trip; every segment is acknowledged, and nothing is lost.',
                    'プローブが必要なのは、ウィンドウ更新が失われることがあるからです。プローブがなければ、両者は相手を永久に待ち続けます（RFC 9293 §3.8.6.1）。プローブの間隔は回を追うごとに長くなります。また、どちらも数バイトの空きでは動きません。受信側は「バッファの半分」と「1 MSS」の小さいほうが空くまでウィンドウを閉じたままにし、送信側は 1 セグメント分たまるまで待ちます（RFC 9293 §3.8.6.2、SWS 回避）。この画面の「回」は 1 往復にあたります。セグメントはすべて確認応答され、失われません。',
                  )}
                </div>
              </details>
              <PacketStructureViewer />
            </>
          ) : null}
        </div>
      </LessonPanel>
    </LessonSplit>
  );
}

export default function TcpFlowControlDemo() {
  return (
    <DemoShell
      title="TCP Flow Control"
      desc="Slow the receiving application and watch the window close, the sender stop, and a window update restart it."
    >
      <NetlabProvider topology={TOPOLOGY}>
        <SimulationProvider>
          <FlowControlInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
