import { useMemo, useState } from 'react';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  lessonChoice,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  AIR_EXCHANGE_MS,
  APS,
  CALL_GAP_BUDGET_MS,
  CORRIDOR_M,
  DEFAULT_POLICY,
  DEFAULT_RADIUS_RTT_MS,
  EAP_ROUND_TRIPS,
  ROAM_METHODS,
  VOICE_PACKET_MS,
  callVerdict,
  packetPath,
  roamTime,
  rssiDbm,
  walk,
  type ApId,
  type RoamMethod,
  type RoamStepId,
  type Switching,
} from './wifiRoaming';

type Answer = 'both' | 'only-ft' | 'only-full' | 'neither';
const ANSWERS: readonly Answer[] = ['both', 'only-ft', 'only-full', 'neither'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

const dbm = (value: number) => `${value.toFixed(1)} dBm`;

/** Which answer two call verdicts match. */
function answerOf(full: boolean, ft: boolean): Answer {
  if (full && ft) return 'both';
  if (ft) return 'only-ft';
  return full ? 'only-full' : 'neither';
}

const AP_COLOURS: Readonly<Record<ApId, string>> = {
  AP1: 'var(--netlab-accent-cyan)',
  AP2: 'var(--netlab-accent-green)',
  AP3: 'var(--netlab-accent-orange)',
};

const CHART_W = 360;
const CHART_H = 150;
const TOP_DBM = -40;
const BOTTOM_DBM = -90;
const xOf = (m: number) => (m / CORRIDOR_M) * CHART_W;
const yOf = (value: number) =>
  ((TOP_DBM - Math.max(BOTTOM_DBM, value)) / (TOP_DBM - BOTTOM_DBM)) * CHART_H;

/** The signal of each AP along the corridor, the threshold, and where the client roams. */
function CorridorChart({ thresholdDbm }: { thresholdDbm: number }) {
  const t = useT();
  const result = useMemo(() => walk({ ...DEFAULT_POLICY, thresholdDbm }), [thresholdDbm]);
  // Labels are 10 user units in a 424-wide viewBox; below 390 px they would shrink under 9 px,
  // so the chart keeps that width and scrolls sideways inside its card instead.
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`-48 -18 ${CHART_W + 64} ${CHART_H + 46}`}
        style={{ width: '100%', maxWidth: 560, minWidth: 390 }}
        role="img"
        aria-label={t(
          `Signal of three access points along a ${CORRIDOR_M} m corridor; the client roams at ${result.roams.map((roam) => `${roam.atM} m`).join(' and ')}`,
          `${CORRIDOR_M} m の廊下に沿った 3 台の AP の電波強度。端末は ${result.roams.map((roam) => `${roam.atM} m`).join(' と ')} でローミングします`,
        )}
      >
        {[-40, -50, -60, -70, -80, -90].map((value) => (
          <g key={value}>
            <line
              x1={0}
              x2={CHART_W}
              y1={yOf(value)}
              y2={yOf(value)}
              stroke="var(--netlab-border-subtle)"
            />
            <text
              x={-6}
              y={yOf(value) + 4}
              textAnchor="end"
              fontSize={10}
              fill="var(--netlab-text-secondary)"
            >
              {value}
            </text>
          </g>
        ))}
        <line
          x1={0}
          x2={CHART_W}
          y1={yOf(thresholdDbm)}
          y2={yOf(thresholdDbm)}
          stroke="var(--netlab-accent-yellow)"
          strokeDasharray="5 4"
          strokeWidth={1.5}
        />
        {APS.map((ap) => {
          const points = Array.from({ length: CORRIDOR_M + 1 }, (_, m) =>
            [xOf(m).toFixed(1), yOf(rssiDbm(ap.x, m)).toFixed(1)].join(','),
          ).join(' ');
          return (
            <g key={ap.id}>
              <polyline points={points} fill="none" stroke={AP_COLOURS[ap.id]} strokeWidth={2} />
              <text
                x={xOf(ap.x)}
                y={-6}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill={AP_COLOURS[ap.id]}
              >
                {ap.id}
              </text>
            </g>
          );
        })}
        {result.roams.map((roam) => (
          <g key={roam.atM}>
            <line
              x1={xOf(roam.atM)}
              x2={xOf(roam.atM)}
              y1={0}
              y2={CHART_H}
              stroke="var(--netlab-accent-red)"
              strokeWidth={1.5}
            />
            <circle
              cx={xOf(roam.atM)}
              cy={yOf(roam.fromDbm)}
              r={3.5}
              fill="var(--netlab-accent-red)"
            />
            <text
              x={xOf(roam.atM)}
              y={CHART_H + 14}
              textAnchor="middle"
              fontSize={10}
              fill="var(--netlab-accent-red)"
            >
              {`${roam.atM} m`}
            </text>
          </g>
        ))}
        <text
          x={CHART_W / 2}
          y={CHART_H + 26}
          textAnchor="middle"
          fontSize={10}
          fill="var(--netlab-text-secondary)"
        >
          {t('position in the corridor →  (dBm on the left)', '廊下の位置 →（左は dBm）')}
        </text>
      </svg>
    </div>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function WifiRoamingLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [radiusRttMs, setRadiusRttMs] = useState(DEFAULT_RADIUS_RTT_MS);
  const [thresholdDbm, setThresholdDbm] = useState(DEFAULT_POLICY.thresholdDbm);
  const [mode, setMode] = useState<Switching>('central');
  const [dstAp, setDstAp] = useState<ApId>('AP3');

  const asked = {
    full: callVerdict(roamTime('full-8021x').totalMs),
    ft: callVerdict(roamTime('ft').totalMs),
  };
  const truth = answerOf(asked.full.survives, asked.ft.survives);
  const walked = walk({ ...DEFAULT_POLICY, thresholdDbm });
  const path = packetPath(mode, dstAp);

  const answerName = (answer: Answer) =>
    ({
      both: t('It survives both ways', 'どちらの方法でも切れない'),
      'only-ft': t('It survives only with 802.11r', '802.11r のときだけ切れない'),
      'only-full': t('It survives only with full 802.1X', '802.1X をやり直すときだけ切れない'),
      neither: t('It breaks both ways', 'どちらの方法でも途切れる'),
    })[answer];
  const methodName = (method: RoamMethod) =>
    ({
      'full-8021x': t('Full 802.1X re-authentication', '802.1X 認証のやり直し'),
      ft: t('802.11r fast transition', '802.11r 高速ローミング（FT）'),
    })[method];
  const stepName = (id: RoamStepId) =>
    ({
      'open-auth': t('802.11 authentication (Open System)', '802.11 認証（Open System）'),
      reassoc: t('Reassociation', '再アソシエーション'),
      eap: t(
        `EAP over RADIUS, ${EAP_ROUND_TRIPS} round trips`,
        `RADIUS を介した EAP、${EAP_ROUND_TRIPS} 往復`,
      ),
      'four-way': t('Four-way handshake', '4 ウェイハンドシェイク'),
      'ft-auth': t('FT authentication (keys already derived)', 'FT 認証（鍵は導出済み）'),
    })[id];
  const nodeName = (node: string) =>
    node === 'Phone A'
      ? t('Phone A', '電話 A')
      : node === 'Phone B'
        ? t('Phone B', '電話 B')
        : node;

  return (
    <div
      style={{
        maxWidth: 820,
        margin: '0 auto',
        padding: 16,
        display: 'grid',
        gap: 12,
        gridTemplateColumns: 'minmax(0, 1fr)',
        alignContent: 'start',
        overflowY: 'auto',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>{t('Walking through the office', 'オフィスを歩きながら')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `In an office the access points (APs) do not work alone: a wireless LAN controller (WLC) manages them all, over CAPWAP tunnels (RFC 5415). A user on a voice call walks down a ${CORRIDOR_M} m corridor past AP1, AP2 and AP3. As one AP fades and the next grows stronger, the phone leaves the old AP and joins the new one: it roams. While it does, no voice gets through.`,
            `オフィスでは、アクセスポイント（AP）は単独で動いていません。無線 LAN コントローラ（WLC）が CAPWAP トンネル（RFC 5415）を通してすべてを管理しています。音声通話中の人が、AP1・AP2・AP3 の前を通って ${CORRIDOR_M} m の廊下を歩きます。今の AP の電波が弱まり、次の AP が強くなると、電話は古い AP を離れて新しい AP につなぎ直します。これがローミングです。つなぎ直している間、音声は届きません。`,
          )}
        </p>
        <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
          {t(
            'The network uses WPA2/WPA3-Enterprise: every phone logs in with 802.1X against a RADIUS server. On each roam the phone can either log in again from scratch, or, if the network and phone support 802.11r, use a fast transition (FT).',
            'このネットワークは WPA2/WPA3-Enterprise で、どの電話も RADIUS サーバに対して 802.1X でログインします。ローミングのたびに、電話は最初からログインし直すか、ネットワークと電話が 802.11r に対応していれば高速ローミング（FT）を使います。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="roam-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `The call can hide a gap of up to ${CALL_GAP_BUDGET_MS} ms. The RADIUS server is a ${DEFAULT_RADIUS_RTT_MS} ms round trip away. Does the call survive the roam from AP1 to AP2?`,
            `この通話は ${CALL_GAP_BUDGET_MS} ms までの途切れなら隠せます。RADIUS サーバまでは往復 ${DEFAULT_RADIUS_RTT_MS} ms です。AP1 から AP2 へのローミングで、通話は切れずにすむでしょうか？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {ANSWERS.map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={guess === answer}
              data-testid={`roam-guess-${answer}`}
              disabled={revealed}
              onClick={() => setGuess(answer)}
              style={{ ...lessonChoice(guess === answer), textAlign: 'left' }}
            >
              {guess === answer ? '✓ ' : ''}
              {answerName(answer)}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="roam-reveal"
            data-right={String(guess === truth)}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {guess === truth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `${answerName(truth)}. Logging in again costs ${EAP_ROUND_TRIPS} EAP round trips to the RADIUS server, ${EAP_ROUND_TRIPS} × ${DEFAULT_RADIUS_RTT_MS} ms, so the roam takes ${asked.full.gapMs} ms: more than ${CALL_GAP_BUDGET_MS} ms, and about ${asked.full.packetsLost} voice packets are missing. With 802.11r the keys for the new AP were derived from the first login ahead of time, so the roam is just two frame exchanges with the AP: ${asked.ft.gapMs} ms.`,
              `答えは「${answerName(truth)}」です。ログインし直すと RADIUS サーバとの EAP が ${EAP_ROUND_TRIPS} 往復、${EAP_ROUND_TRIPS} × ${DEFAULT_RADIUS_RTT_MS} ms かかり、ローミングは ${asked.full.gapMs} ms になります。${CALL_GAP_BUDGET_MS} ms を超え、音声パケットが約 ${asked.full.packetsLost} 個抜けます。802.11r では、新しい AP 用の鍵が最初のログインからあらかじめ導出されているので、ローミングは AP との 2 回のフレーム交換だけ、${asked.ft.gapMs} ms で終わります。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="roam-reveal-button"
            disabled={!guess}
            style={{ ...LESSON_TEAL_BUTTON, marginTop: 8, opacity: guess ? 1 : 0.5 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Time the roams', 'ローミングを計る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="roam-times">
          <div style={LESSON_LABEL}>{t('What each roam waits for', 'ローミングが待つもの')}</div>
          {ROAM_METHODS.map((method) => {
            const time = roamTime(method, radiusRttMs);
            const verdict = callVerdict(time.totalMs);
            return (
              <div key={method} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700, margin: '4px 0' }}>{methodName(method)}</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {time.steps.map((step) => (
                        <tr key={step.id}>
                          <td style={cell}>{stepName(step.id)}</td>
                          <td style={mono}>{`${step.ms} ms`}</td>
                        </tr>
                      ))}
                      <tr
                        data-testid={`roam-total-${method}`}
                        data-ms={time.totalMs}
                        data-survives={String(verdict.survives)}
                      >
                        <td style={{ ...cell, fontWeight: 700 }}>
                          {verdict.survives
                            ? t(
                                `Total — the call survives (≤ ${CALL_GAP_BUDGET_MS} ms)`,
                                `合計 — 通話は切れない（${CALL_GAP_BUDGET_MS} ms 以内）`,
                              )
                            : t(
                                `Total — the call breaks up (> ${CALL_GAP_BUDGET_MS} ms)`,
                                `合計 — 通話が途切れる（${CALL_GAP_BUDGET_MS} ms 超）`,
                              )}
                        </td>
                        <td style={{ ...mono, fontWeight: 700 }}>{`${time.totalMs} ms`}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {t('RADIUS round trip', 'RADIUS の往復時間')}
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={radiusRttMs}
              data-testid="roam-radius"
              onChange={(event) => setRadiusRttMs(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{`${radiusRttMs} ms`}</span>
          </label>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Assumptions for this lesson: ${AIR_EXCHANGE_MS} ms per frame exchange over the air, ${EAP_ROUND_TRIPS} EAP round trips (the real number depends on the EAP method and certificate sizes), and the time spent scanning for the next AP left out. A ${CALL_GAP_BUDGET_MS} ms gap budget stands for the phone's jitter buffer and packet-loss concealment; voice is one packet every ${VOICE_PACKET_MS} ms. In 802.11r the controller holds the top key (PMK-R0) and hands each AP its own key (PMK-R1), which is why the RADIUS server is no longer in the roam. Caching the key per AP (PMK caching, OKC) is another way to skip the full login.`,
              `このレッスンの仮定：無線でのフレーム交換 1 回を ${AIR_EXCHANGE_MS} ms、EAP を ${EAP_ROUND_TRIPS} 往復（実際の回数は EAP 方式や証明書の大きさで変わります）とし、次の AP を探すスキャンの時間は含めていません。${CALL_GAP_BUDGET_MS} ms の許容は、電話のジッタバッファとパケットロス補償を表しています。音声は ${VOICE_PACKET_MS} ms ごとに 1 パケットです。802.11r ではコントローラが上位の鍵（PMK-R0）を持ち、AP ごとの鍵（PMK-R1）を各 AP へ配るので、ローミングに RADIUS サーバが出てきません。AP ごとに鍵をキャッシュする方法（PMK キャッシュ、OKC）でも、ログインのやり直しを省けます。`,
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="roam-corridor">
          <div style={LESSON_LABEL}>{t('Where the phone roams', '電話がローミングする場所')}</div>
          <CorridorChart thresholdDbm={thresholdDbm} />
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {t('Roam threshold', 'ローミングのしきい値')}
            <input
              type="range"
              min={-85}
              max={-60}
              step={5}
              value={thresholdDbm}
              data-testid="roam-threshold"
              onChange={(event) => setThresholdDbm(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{`${thresholdDbm} dBm`}</span>
          </label>
          <p
            data-testid="roam-points"
            data-points={walked.roams.map((roam) => roam.atM).join(',')}
            data-weakest={walked.weakestDbm.toFixed(1)}
            style={{ margin: '8px 0 0', fontWeight: 700, lineHeight: 1.7 }}
          >
            {t(
              `Roams: ${walked.roams.map((roam) => `${roam.from} → ${roam.to} at ${roam.atM} m (${dbm(roam.fromDbm)} → ${dbm(roam.toDbm)})`).join('; ')}. Weakest signal while connected: ${dbm(walked.weakestDbm)}.`,
              `ローミング：${walked.roams.map((roam) => `${roam.atM} m で ${roam.from} → ${roam.to}（${dbm(roam.fromDbm)} → ${dbm(roam.toDbm)}）`).join('、')}。接続中のいちばん弱い電波：${dbm(walked.weakestDbm)}。`,
            )}
          </p>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              `The phone roams when its AP is weaker than the threshold and another AP is at least ${DEFAULT_POLICY.marginDb} dB stronger. Only the client decides when to roam. A “sticky” client with a low threshold clings to a distant AP: try −85 dBm. At such a weak signal it falls back to slow data rates and takes airtime from everyone on that AP. 802.11k lets the AP send a neighbour report (which APs are nearby, on which channels), so the client scans only those instead of every channel. 802.11v lets the network send a BSS transition management request suggesting a better AP. Both help the client choose; neither forces it.`,
              `電話は、今の AP がしきい値より弱く、しかも別の AP が ${DEFAULT_POLICY.marginDb} dB 以上強いときにローミングします。いつローミングするかを決めるのは端末だけです。しきい値が低い「スティッキー（しがみつく）クライアント」は、遠くの AP にしがみつきます。−85 dBm を試してみてください。電波が弱いと遅い通信速度に落ち、その AP のほかの端末の通信時間まで奪います。802.11k では AP が近隣レポート（近くの AP とそのチャネル）を送るので、端末は全チャネルではなくそのチャネルだけをスキャンすれば済みます。802.11v ではネットワークが BSS Transition Management 要求で、よりよい AP を勧められます。どちらも端末の判断を助けますが、強制はしません。`,
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Simplified: the signal follows a log-distance model (−40 dBm at 1 m, falling 30 dB per tenfold distance), with no walls, fading or ceiling height, and the phone checks once per metre. Real phones use their own, vendor-specific roaming rules.',
              '簡略化：電波は距離の対数モデル（1 m で −40 dBm、距離が 10 倍で 30 dB 低下）に従い、壁・フェージング・天井の高さは考えていません。電話は 1 m ごとに判定します。実際の電話は、メーカーごとの独自のルールでローミングします。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="roam-capwap">
          <div style={LESSON_LABEL}>
            {t('Where a packet travels: CAPWAP', 'パケットの通り道：CAPWAP')}
          </div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              'Each AP keeps a CAPWAP tunnel to the controller (control on UDP 5246, data on UDP 5247). Phone A is on AP1 and calls Phone B. AP1 and AP2 hang off switch SW1, AP3 off SW2; both switches and the WLC connect to Core.',
              '各 AP はコントローラとの間に CAPWAP トンネルを張っています（制御は UDP 5246、データは UDP 5247）。電話 A は AP1 につながり、電話 B に発信します。AP1 と AP2 はスイッチ SW1 に、AP3 は SW2 につながり、両方のスイッチと WLC は Core につながっています。',
            )}
          </p>
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['central', 'local'] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                data-testid={`roam-mode-${id}`}
                onClick={() => setMode(id)}
                style={{ ...lessonChoice(mode === id), minHeight: 44 }}
              >
                {mode === id ? '✓ ' : ''}
                {id === 'central'
                  ? t('Central switching', 'セントラルスイッチング')
                  : t('Local switching', 'ローカルスイッチング')}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {(['AP2', 'AP3'] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={dstAp === id}
                data-testid={`roam-dst-${id}`}
                onClick={() => setDstAp(id)}
                style={{ ...lessonChoice(dstAp === id), minHeight: 44 }}
              >
                {dstAp === id ? '✓ ' : ''}
                {t(`Phone B on ${id}`, `電話 B は ${id}`)}
              </button>
            ))}
          </div>
          <p
            data-testid="roam-path"
            data-hops={path.hops.join(' > ')}
            data-links={path.wiredLinks}
            data-via-wlc={String(path.viaController)}
            style={{ margin: '10px 0 0', fontFamily: 'monospace', lineHeight: 1.8 }}
          >
            {path.hops.map((hop, index) => (
              <span key={`${hop}-${index}`}>
                {index > 0 ? ' → ' : ''}
                <span
                  style={{
                    fontWeight: hop === 'WLC' ? 700 : 400,
                    color:
                      hop === 'WLC' ? 'var(--netlab-accent-red)' : 'var(--netlab-text-primary)',
                  }}
                >
                  {nodeName(hop)}
                </span>
              </span>
            ))}
          </p>
          <p style={{ margin: '6px 0 0', fontWeight: 700 }}>
            {path.viaController
              ? t(
                  `${path.wiredLinks} cable links, through the controller.`,
                  `ケーブル ${path.wiredLinks} 区間、コントローラ経由です。`,
                )
              : t(
                  `${path.wiredLinks} cable links, without touching the controller.`,
                  `ケーブル ${path.wiredLinks} 区間、コントローラを通りません。`,
                )}
          </p>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'With central switching every client frame rides the tunnel to the controller and back, even between two APs on the same switch. The upside: the client’s VLAN and IP address live at the controller, so roaming from AP to AP never changes them, and policy is applied in one place. With local switching the AP bridges the traffic onto the wired VLAN itself, which is shorter and keeps a remote office working if the link to the controller is slow, but every AP’s switch port must carry the clients’ VLANs.',
              'セントラルスイッチングでは、同じスイッチにつながる 2 台の AP の間でも、端末のフレームはすべてトンネルでコントローラまで行って戻ってきます。その代わり、端末の VLAN と IP アドレスはコントローラ側にあるので、AP をまたいでローミングしても変わらず、ポリシーも 1 か所で適用できます。ローカルスイッチングでは AP 自身が通信を有線の VLAN へ流すので、経路が短く、コントローラへの回線が遅い拠点でも動き続けますが、どの AP のスイッチポートにも端末の VLAN を通しておく必要があります。',
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Simplified: one controller, a tree-shaped wired network, and both phones in the same VLAN. Vendors name the modes differently (for example, local switching at a branch AP).',
              '簡略化：コントローラは 1 台、有線ネットワークは木の形、2 台の電話は同じ VLAN にいるとしています。モードの呼び方はメーカーによって異なります（拠点の AP でのローカルスイッチングなど）。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function WifiRoamingDemo() {
  return (
    <DemoShell
      title="Wi-Fi roaming and controllers"
      desc="A voice call walks past three access points: when the phone roams, how long the roam takes, and where its packets travel"
    >
      <WifiRoamingLesson />
    </DemoShell>
  );
}
