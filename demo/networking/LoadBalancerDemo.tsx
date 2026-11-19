import { useEffect, useMemo, useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { LessonCanvas, LessonPanel, LessonSplit } from '../components/LessonPanel';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  lessonChoice,
} from '../components/lessonStyles';
import { NetlabProvider } from '../components/PhoneNetlabProvider';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  REQUESTS,
  SERVERS,
  SERVER_IPS,
  VIP,
  assign,
  lbTopology,
  peakOpen,
  synToVip,
  type Algorithm,
} from './loadBalancer';

const PANEL_STYLE: React.CSSProperties = {
  background: 'var(--netlab-bg-primary)',
  borderLeft: '1px solid var(--netlab-bg-surface)',
  padding: 12,
  display: 'grid',
  gap: 12,
  alignContent: 'start',
};

const ALGORITHMS: readonly {
  id: Algorithm;
  en: string;
  ja: string;
  how: readonly [string, string];
}[] = [
  {
    id: 'round-robin',
    en: 'Round robin',
    ja: 'ラウンドロビン',
    how: ['Each server in turn.', 'サーバに順番に割り当てます。'],
  },
  {
    id: 'least-connections',
    en: 'Least connections',
    ja: '最小接続',
    how: [
      'The server with the fewest open connections.',
      'いま抱えている接続がいちばん少ないサーバに割り当てます。',
    ],
  },
  {
    id: 'source-hash',
    en: 'Source-IP hash',
    ja: '送信元 IP のハッシュ',
    how: [
      'A hash of the client’s address picks the server, so a client always lands on the same one.',
      'クライアントのアドレスのハッシュでサーバを決めるので、同じクライアントはいつも同じサーバに行きます。',
    ],
  },
];

/** Sends one request through the simulator when asked, inside the provider of its server. */
function Sender({
  request,
  onSent,
}: {
  request: { backend: number; port: number } | null;
  onSent: (text: string) => void;
}) {
  const { engine } = useSimulation();
  const t = useT();
  useEffect(() => {
    if (!request) return;
    let live = true;
    void (async () => {
      const packet = synToVip(request.backend, request.port);
      await engine.send(packet);
      const trace = engine.getState().traces.find((candidate) => candidate.packetId === packet.id);
      const rewrite = trace?.hops.find((hop) => hop.natTranslation)?.natTranslation;
      if (!live) return;
      onSent(
        rewrite && trace?.status === 'delivered'
          ? t(
              `The load balancer rewrote the destination ${rewrite.preDstIp}:${rewrite.preDstPort} to ${rewrite.postDstIp}:${rewrite.postDstPort}, and ${SERVERS[request.backend]} received it. The client only ever sees the VIP.`,
              `ロードバランサが宛先 ${rewrite.preDstIp}:${rewrite.preDstPort} を ${rewrite.postDstIp}:${rewrite.postDstPort} に書き換え、${SERVERS[request.backend]} が受け取りました。クライアントから見えるのは VIP だけです。`,
            )
          : t('The request did not arrive.', 'リクエストは届きませんでした。'),
      );
    })();
    return () => {
      live = false;
    };
  }, [request, engine, onSent, t]);
  return null;
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function LoadBalancerLesson() {
  const t = useT();
  const [algorithm, setAlgorithm] = useState<Algorithm>('round-robin');
  const [up, setUp] = useState<boolean[]>(() => SERVERS.map(() => true));
  const [guess, setGuess] = useState<Algorithm | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState(0);
  const [sending, setSending] = useState<{ backend: number; port: number } | null>(null);
  const [sentText, setSentText] = useState<string | null>(null);
  const assignments = useMemo(() => assign(algorithm, REQUESTS, up), [algorithm, up]);
  const peaks = peakOpen(assignments);
  const counts = SERVERS.map((_, server) => assignments.filter((a) => a.server === server).length);
  const lowerPeak =
    Math.max(...peakOpen(assign('least-connections', REQUESTS))) <
    Math.max(...peakOpen(assign('round-robin', REQUESTS)))
      ? 'least-connections'
      : 'round-robin';
  const backend = sending?.backend ?? assignments[selected]?.server ?? 0;
  const topology = useMemo(() => lbTopology(backend), [backend]);

  return (
    <NetlabProvider key={backend} topology={topology}>
      <SimulationProvider useMainThread>
        <Sender request={sending} onSent={setSentText} />
        <LessonSplit>
          <LessonCanvas canvas={<NetlabCanvas />} />
          <LessonPanel defaultWidth={480} maxWidth={760} style={PANEL_STYLE}>
            <div style={LESSON_CARD}>
              <div style={LESSON_LABEL}>{t('Load balancer', 'ロードバランサ')}</div>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                {t(
                  `Clients connect to one address, the VIP ${VIP}. The load balancer picks a server for each connection and rewrites the destination to it. A health check takes a server that stops answering out of the choice.`,
                  `クライアントがつなぐのは 1 つのアドレス、VIP の ${VIP} だけです。ロードバランサは接続ごとにサーバを選び、宛先をそのサーバに書き換えます。応答しなくなったサーバは、ヘルスチェックで選ぶ対象から外れます。`,
                )}
              </p>
            </div>

            <div style={LESSON_CARD} data-testid="lb-predict">
              <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
              <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
                {t(
                  'Twelve requests come in; every third one keeps its connection open four times as long. Which leaves the busiest server with fewer connections open at once?',
                  '12 件のリクエストが届き、3 件に 1 件は接続を 4 倍長く使います。いちばん忙しいサーバが同時に抱える接続が少なくて済むのは、どちら？',
                )}
              </p>
              <div
                role="radiogroup"
                aria-label={t('Your prediction', '予想')}
                style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
              >
                {(['round-robin', 'least-connections'] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={guess === id}
                    data-testid={`lb-guess-${id}`}
                    disabled={revealed}
                    onClick={() => setGuess(id)}
                    style={lessonChoice(guess === id)}
                  >
                    {guess === id ? '✓ ' : ''}
                    {t(
                      ...([
                        ALGORITHMS.find((a) => a.id === id)!.en,
                        ALGORITHMS.find((a) => a.id === id)!.ja,
                      ] as const),
                    )}
                  </button>
                ))}
              </div>
              {revealed ? (
                <p
                  data-testid="lb-reveal"
                  data-right={String(guess === lowerPeak)}
                  role="status"
                  style={{ margin: '8px 0 0', lineHeight: 1.7 }}
                >
                  <strong>
                    {guess === lowerPeak
                      ? t('As you predicted. ', '予想どおりです。')
                      : t('Not what you predicted. ', '予想とちがいました。')}
                  </strong>
                  {t(
                    'Round robin counts requests, not work: here every long request falls on web1 in turn. Least connections looks at what is still open, so the long ones spread out.',
                    'ラウンドロビンは件数を数えるだけで、仕事の重さは見ません。ここでは長いリクエストが順番の都合で毎回 web1 に当たります。最小接続はまだ開いている接続を見るので、長いものが散らばります。',
                  )}
                </p>
              ) : (
                <button
                  type="button"
                  data-testid="lb-reveal-button"
                  disabled={!guess}
                  style={{ ...LESSON_TEAL_BUTTON, marginTop: 8, opacity: guess ? 1 : 0.5 }}
                  onClick={() => setRevealed(true)}
                >
                  {t('Compare them below', '下で比べる')}
                </button>
              )}
            </div>

            <div style={LESSON_CARD} data-testid="lb-algorithms">
              <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ALGORITHMS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="tab"
                    aria-selected={algorithm === a.id}
                    data-testid={`lb-algorithm-${a.id}`}
                    onClick={() => setAlgorithm(a.id)}
                    style={lessonChoice(algorithm === a.id)}
                  >
                    {t(a.en, a.ja)}
                  </button>
                ))}
              </div>
              <p style={{ margin: '8px 0' }}>
                {t(...ALGORITHMS.find((a) => a.id === algorithm)!.how)}
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                {SERVERS.map((name, index) => (
                  <label
                    key={name}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 44 }}
                  >
                    <input
                      type="checkbox"
                      data-testid={`lb-up-${name}`}
                      checked={up[index]}
                      onChange={() =>
                        setUp((previous) =>
                          previous.map((value, i) => (i === index ? !value : value)),
                        )
                      }
                      style={{ width: 20, height: 20 }}
                    />
                    {t(`${name} passes its health check`, `${name} はヘルスチェックに合格`)}
                  </label>
                ))}
              </div>
              <div data-testid="lb-servers" style={{ display: 'grid', gap: 4 }}>
                {SERVERS.map((name, index) => (
                  <div
                    key={name}
                    data-server={name}
                    data-requests={counts[index]}
                    data-peak={peaks[index]}
                  >
                    <span style={{ fontFamily: 'monospace' }}>{name}</span>{' '}
                    <span
                      aria-hidden
                      style={{
                        display: 'inline-block',
                        height: 10,
                        width: `${(peaks[index] ?? 0) * 24}px`,
                        background: 'var(--netlab-accent-cyan)',
                        verticalAlign: 'middle',
                      }}
                    />{' '}
                    {t(
                      `${counts[index]} requests, at most ${peaks[index]} open at once`,
                      `${counts[index]} 件、同時に最大 ${peaks[index]} 接続`,
                    )}
                  </div>
                ))}
              </div>
              <table
                style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 8 }}
              >
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                    <th style={{ padding: 2 }}>#</th>
                    <th style={{ padding: 2 }}>{t('Client', 'クライアント')}</th>
                    <th style={{ padding: 2 }}>{t('Long?', '長い？')}</th>
                    <th style={{ padding: 2 }}>{t('Server', 'サーバ')}</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment, index) => (
                    <tr
                      key={assignment.request.id}
                      data-testid={`lb-row-${assignment.request.id}`}
                      aria-selected={selected === index}
                      onClick={() => setSelected(index)}
                      style={{
                        cursor: 'pointer',
                        background: selected === index ? 'var(--netlab-bg-surface)' : undefined,
                      }}
                    >
                      <td style={{ padding: 2 }}>{assignment.request.id}</td>
                      <td style={{ padding: 2, fontFamily: 'monospace' }}>
                        {assignment.request.clientIp}
                      </td>
                      <td style={{ padding: 2 }}>
                        {assignment.request.duration > 2 ? t('long', '長い') : ''}
                      </td>
                      <td style={{ padding: 2, fontFamily: 'monospace' }}>
                        {SERVERS[assignment.server]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={LESSON_CARD} data-testid="lb-send">
              <div style={LESSON_LABEL}>
                {t('One request, on the simulator', '1 件を、シミュレータで')}
              </div>
              <button
                type="button"
                data-testid="lb-send-button"
                style={LESSON_TEAL_BUTTON}
                onClick={() => {
                  setSentText(null);
                  setSending({
                    backend: assignments[selected]?.server ?? 0,
                    port: 50000 + selected,
                  });
                }}
              >
                {t(
                  `Send request ${assignments[selected]?.request.id ?? 1} to the VIP`,
                  `リクエスト ${assignments[selected]?.request.id ?? 1} を VIP に送る`,
                )}
              </button>
              {sentText ? (
                <p
                  data-testid="lb-sent"
                  role="status"
                  style={{ margin: '8px 0 0', lineHeight: 1.7 }}
                >
                  {sentText}
                </p>
              ) : null}
              <p style={{ margin: '8px 0 0', color: 'var(--netlab-text-secondary)', fontSize: 13 }}>
                {t(
                  `Servers: ${SERVER_IPS.join(', ')}. The simulator has no clock, so “open at once” counts requests, one arriving per step.`,
                  `サーバ：${SERVER_IPS.join('、')}。シミュレータには時計がないので、「同時に」は 1 歩に 1 件ずつ届くとして数えています。`,
                )}
              </p>
            </div>
            <PacketTimeline />
          </LessonPanel>
        </LessonSplit>
      </SimulationProvider>
    </NetlabProvider>
  );
}

export default function LoadBalancerDemo() {
  return (
    <DemoShell
      title="Load balancers"
      desc="One VIP, many servers: round robin, least connections and source hash, with health checks"
    >
      <LoadBalancerLesson />
    </DemoShell>
  );
}
