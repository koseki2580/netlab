import { useState } from 'react';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  lessonChoice,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  DELAY_FIRST_PROBE_TIME_MS,
  MAX_UNICAST_SOLICIT,
  REACHABLE_TIME_MS,
  RETRANS_TIMER_MS,
  dad,
  eui64Steps,
  lessonScenario,
  nudTimeline,
  slaacAddress,
  stateSpans,
  type AddressState,
  type NdEvent,
  type NdState,
} from './ipv6Nd';

type Answer = 'drop-now' | 'resolve-again' | 'probe-later' | 'keeps-forever';
const ANSWERS: readonly Answer[] = ['drop-now', 'resolve-again', 'probe-later', 'keeps-forever'];

const PREFIX = '2001:db8:1::/64';
const MACS = ['00:1a:2b:3c:4d:5e', '02:00:5e:10:00:01', '3c:22:fb:7a:01:9c'] as const;
const SECOND_SEND_MS = 40_000;

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

const seconds = (ms: number) => `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 3)} s`;
const hex2 = (byte: number) => byte.toString(16).padStart(2, '0');

const STATE_COLOUR: Record<NdState, string> = {
  NONE: 'var(--netlab-text-muted)',
  INCOMPLETE: 'var(--netlab-accent-purple)',
  REACHABLE: 'var(--netlab-accent-green)',
  STALE: 'var(--netlab-accent-yellow)',
  DELAY: 'var(--netlab-accent-orange)',
  PROBE: 'var(--netlab-accent-red)',
};

/** What A did with the packet it sent at 40 s, read from the model's timeline. */
function answerOf(events: readonly NdEvent[]): Answer {
  const send = events.find((event) => event.kind === 'send' && event.atMs === SECOND_SEND_MS);
  const later = events.filter((event) => event.atMs >= SECOND_SEND_MS);
  const deleted = later.find((event) => event.kind === 'deleted');
  if (!deleted) return 'keeps-forever';
  if (deleted.atMs === SECOND_SEND_MS) return 'drop-now';
  if (send?.state === 'INCOMPLETE' || later.some((event) => event.kind === 'ns-multicast'))
    return 'resolve-again';
  return 'probe-later';
}

const CHART_W = 640;
const CHART_UNTIL_MS = 80_000;

/** The entry's state over time as coloured bands, with a marker at the chosen event. */
function NudChart({ events, at }: { events: readonly NdEvent[]; at: number }) {
  const t = useT();
  const x = (ms: number) => (ms / CHART_UNTIL_MS) * CHART_W;
  const spans = stateSpans(events, CHART_UNTIL_MS);
  // On a phone the diagram would shrink its labels below ~9 px, so it keeps a
  // minimum width and scrolls sideways inside its card instead
  // (viewBox 664 wide with 11-unit labels: 664 × 9/11 ≈ 550).
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`-8 -4 ${CHART_W + 24} 62`}
        style={{ width: '100%', minWidth: 550 }}
        role="img"
        aria-label={t(
          `The entry's state from 0 to ${seconds(CHART_UNTIL_MS)}`,
          `0 〜 ${seconds(CHART_UNTIL_MS)} のエントリの状態`,
        )}
      >
        {spans.map((span) => (
          <rect
            key={`${span.state}-${span.fromMs}`}
            x={x(span.fromMs)}
            y={4}
            width={Math.max(1, x(span.toMs) - x(span.fromMs))}
            height={20}
            fill={STATE_COLOUR[span.state]}
            opacity={span.state === 'NONE' ? 0.25 : 0.8}
          />
        ))}
        <line
          x1={x(at)}
          x2={x(at)}
          y1={0}
          y2={30}
          stroke="var(--netlab-text-primary)"
          strokeWidth={2}
        />
        {[0, 20_000, 40_000, 60_000, 80_000].map((ms) => (
          <text
            key={ms}
            x={x(ms)}
            y={44}
            textAnchor="middle"
            fontSize={11}
            fill="var(--netlab-text-secondary)"
          >
            {seconds(ms)}
          </text>
        ))}
      </svg>
    </div>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function Ipv6NdLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [bGone, setBGone] = useState(true);
  const [step, setStep] = useState(0);
  const [mac, setMac] = useState<(typeof MACS)[number]>(MACS[0]);
  const [inUse, setInUse] = useState(false);

  const asked = nudTimeline(lessonScenario(true));
  const truth = answerOf(asked);
  const askedProbes = asked.filter((event) => event.kind === 'ns-unicast');
  const askedDeleted = asked.find((event) => event.kind === 'deleted')!;

  const events = nudTimeline(lessonScenario(bGone));
  const current = events[Math.min(step, events.length - 1)]!;
  const final = events[events.length - 1]!;

  const steps = eui64Steps(mac);
  const address = slaacAddress(PREFIX, mac)!;
  const dadOutcome = dad(address, inUse);
  const dadFinal = dadOutcome.events[dadOutcome.events.length - 1]!;

  const answerName = (answer: Answer) =>
    ({
      'drop-now': t(
        'A notices at once that B is gone: it drops the packet and deletes the entry at 40 s.',
        'A は B がいないことにすぐ気づき、40 秒の時点でパケットを捨ててエントリを消す。',
      ),
      'resolve-again': t(
        'A throws away B’s old MAC, asks for B again by multicast, and gives up a few seconds later.',
        'A は B の古い MAC を捨て、マルチキャストでもう一度 B を探し、数秒後にあきらめる。',
      ),
      'probe-later': t(
        'A sends the packet to B’s old MAC anyway, checks on B only afterwards, and deletes the entry several seconds later.',
        'A はとりあえず B の古い MAC へパケットを送り、あとから B を確かめて、数秒後にエントリを消す。',
      ),
      'keeps-forever': t(
        'A keeps using B’s old MAC; the entry stays until it ages out much later.',
        'A は B の古い MAC を使い続け、エントリはずっと後に古くなるまで残る。',
      ),
    })[answer];

  const eventName = (event: NdEvent) =>
    ({
      send: t('A sends B a packet', 'A が B へパケットを送る'),
      'ns-multicast': t(
        `Neighbor Solicitation #${event.solicit} to B’s solicited-node group`,
        `B の要請ノードマルチキャストへ近隣要請（NS）#${event.solicit}`,
      ),
      'ns-unicast': t(
        `Neighbor Solicitation #${event.solicit} straight to B’s cached MAC`,
        `キャッシュにある B の MAC へ直接、近隣要請（NS）#${event.solicit}`,
      ),
      na: t('B answers with a Neighbor Advertisement', 'B が近隣広告（NA）で答える'),
      'reachable-expired': t(
        `${seconds(REACHABLE_TIME_MS)} with no sign that B is there`,
        `B がいる証拠のないまま ${seconds(REACHABLE_TIME_MS)} 経過`,
      ),
      'delay-expired': t(
        `${seconds(DELAY_FIRST_PROBE_TIME_MS)} after the packet, still no sign of B`,
        `パケットから ${seconds(DELAY_FIRST_PROBE_TIME_MS)} たっても B の証拠がない`,
      ),
      deleted: t(
        `No answer ${seconds(RETRANS_TIMER_MS)} after the last solicitation: entry deleted`,
        `最後の NS から ${seconds(RETRANS_TIMER_MS)} 待っても応答なし：エントリを削除`,
      ),
    })[event.kind];
  const stateName = (state: NdState) =>
    state === 'NONE' ? t('(no entry)', '（エントリなし）') : state;
  const addressStateName = (state: AddressState) =>
    ({
      tentative: t('tentative (not usable yet)', '仮（tentative、まだ使えない）'),
      preferred: t('preferred (in use)', '優先（preferred、使用中）'),
      duplicate: t('duplicate (never used)', '重複（duplicate、使わない）'),
    })[state];

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
        <div style={LESSON_LABEL}>{t('The neighbour cache', '近隣キャッシュ')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'IPv6 has no ARP. To send to a neighbour on the same link, a host asks for its MAC with an ICMPv6 Neighbor Solicitation and keeps the answer in its neighbour cache. Each cache entry also has a state that records how sure the host is that the neighbour is still there.',
            'IPv6 には ARP がありません。同じリンク上の相手へ送るとき、ホストは ICMPv6 の近隣要請（Neighbor Solicitation）で相手の MAC を尋ね、答えを近隣キャッシュに覚えます。キャッシュの各エントリには、相手がまだそこにいるとどれくらい確かかを表す「状態」もあります。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="nd-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'Host A sends host B a packet at 0 s and learns B’s MAC. Nothing more passes between them. At 35 s B is unplugged. At 40 s A sends B another UDP packet (UDP gives A no hint whether it arrived). What happens?',
            'ホスト A は 0 秒に B へパケットを送り、B の MAC を覚えました。その後は何もやり取りしていません。35 秒に B のケーブルが抜かれました。40 秒に A は B へもう 1 つ UDP のパケットを送ります（UDP では届いたかどうか A にはわかりません）。どうなる？',
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
              data-testid={`nd-guess-${answer}`}
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
            data-testid="nd-reveal"
            data-right={String(guess === truth)}
            data-deleted-at={askedDeleted.atMs}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {guess === truth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `With ${seconds(REACHABLE_TIME_MS)} gone by since B last answered, the entry is STALE, but a STALE entry is still used: A sends the packet to B’s old MAC at once and moves the entry to DELAY. It waits ${seconds(DELAY_FIRST_PROBE_TIME_MS)} for any sign of B, then moves to PROBE and sends ${askedProbes.length} Neighbor Solicitations straight to B’s MAC at ${askedProbes.map((e) => seconds(e.atMs)).join(', ')}. No answer comes, so the entry is deleted at ${seconds(askedDeleted.atMs)}, ${seconds(askedDeleted.atMs - SECOND_SEND_MS)} after the packet, which was lost. Waiting before probing gives a protocol such as TCP the chance to confirm B first, so a healthy neighbour usually needs no probe at all.`,
              `B が最後に答えてから ${seconds(REACHABLE_TIME_MS)} 以上たっているのでエントリは STALE ですが、STALE のエントリもそのまま使われます。A はすぐに B の古い MAC へパケットを送り、エントリを DELAY にします。${seconds(DELAY_FIRST_PROBE_TIME_MS)} のあいだ B がいる証拠を待ち、なければ PROBE に移って、${askedProbes.map((e) => seconds(e.atMs)).join('、')} に B の MAC へ直接 NS を ${askedProbes.length} 回送ります。応答がないので、パケットから ${seconds(askedDeleted.atMs - SECOND_SEND_MS)} 後の ${seconds(askedDeleted.atMs)} にエントリが消えます。パケットは失われました。確かめる前に少し待つことで TCP などが先に B の存在を確認でき、元気な相手ならたいてい確認の NS は要りません。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="nd-reveal-button"
            disabled={!guess}
            style={{ ...LESSON_TEAL_BUTTON, marginTop: 8, opacity: guess ? 1 : 0.5 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Step through the timeline', 'タイムラインを見る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="nd-timeline">
          <div style={LESSON_LABEL}>
            {t('1. Neighbour unreachability detection', '1. 近隣到達不能検知（NUD）')}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {[true, false].map((gone) => (
              <button
                key={String(gone)}
                type="button"
                role="tab"
                aria-selected={bGone === gone}
                data-testid={`nd-scenario-${gone ? 'gone' : 'stays'}`}
                onClick={() => {
                  setBGone(gone);
                  setStep(0);
                }}
                style={{ ...lessonChoice(bGone === gone), minHeight: 44 }}
              >
                {bGone === gone ? '✓ ' : ''}
                {gone ? t('B unplugged at 35 s', 'B は 35 秒に抜かれる') : t('B stays', 'B は残る')}
              </button>
            ))}
          </div>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>
              {t(
                `Event ${step + 1} of ${events.length}`,
                `イベント ${step + 1} / ${events.length}`,
              )}
            </span>
            <input
              type="range"
              min={0}
              max={events.length - 1}
              value={Math.min(step, events.length - 1)}
              data-testid="nd-step"
              onChange={(event) => setStep(Number(event.target.value))}
              style={{ minHeight: 44, width: '100%' }}
            />
          </label>
          <p
            data-testid="nd-state"
            data-state={current.state}
            data-at={current.atMs}
            style={{ margin: '4px 0 8px', fontWeight: 700, lineHeight: 1.6 }}
          >
            {`${seconds(current.atMs)}: ${eventName(current)} → `}
            <span style={{ fontFamily: 'monospace', color: STATE_COLOUR[current.state] }}>
              {stateName(current.state)}
            </span>
          </p>
          <NudChart events={events} at={current.atMs} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12 }}>
            {(['INCOMPLETE', 'REACHABLE', 'STALE', 'DELAY', 'PROBE', 'NONE'] as const).map(
              (state) => (
                <span key={state} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span
                    aria-hidden
                    style={{
                      width: 10,
                      height: 10,
                      background: STATE_COLOUR[state],
                      display: 'inline-block',
                    }}
                  />
                  {stateName(state)}
                </span>
              ),
            )}
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Time', '時刻')}</th>
                  <th style={cell}>{t('What happens', '起きること')}</th>
                  <th style={cell}>{t('Entry for B', 'B のエントリ')}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event, index) => (
                  <tr
                    key={index}
                    data-testid={`nd-event-${index}`}
                    style={{
                      fontWeight: index === step ? 700 : 400,
                      background: index === step ? 'var(--netlab-bg-surface)' : undefined,
                    }}
                  >
                    <td style={mono}>{seconds(event.atMs)}</td>
                    <td style={cell}>{eventName(event)}</td>
                    <td style={mono}>{stateName(event.state)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            data-testid="nd-final"
            data-state={final.state}
            data-at={final.atMs}
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            {final.state === 'NONE'
              ? t(
                  `After ${MAX_UNICAST_SOLICIT} unanswered probes the entry is gone at ${seconds(final.atMs)}. A’s next packet to B starts again from INCOMPLETE with a multicast Neighbor Solicitation, and if that goes unanswered too the sender gets an ICMPv6 “address unreachable”.`,
                  `${MAX_UNICAST_SOLICIT} 回の確認に応答がなく、${seconds(final.atMs)} にエントリが消えます。A が次に B へ送るときは INCOMPLETE からやり直してマルチキャストで NS を送り、それにも応答がなければ送信元に ICMPv6 の「アドレス到達不能」が返ります。`,
                )
              : t(
                  `B answered the first probe, so the entry is REACHABLE again and turns STALE at ${seconds(final.atMs)}. A STALE entry costs nothing: nothing is checked until A has something to send.`,
                  `B が最初の確認に答えたので、エントリは REACHABLE に戻り、${seconds(final.atMs)} にまた STALE になります。STALE のエントリには費用がかかりません。A が送るものを持つまで何も確かめないからです。`,
                )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Simplified: the timers are RFC 4861’s defaults (ReachableTime ${seconds(REACHABLE_TIME_MS)}, DELAY_FIRST_PROBE_TIME ${seconds(DELAY_FIRST_PROBE_TIME_MS)}, RetransTimer ${seconds(RETRANS_TIMER_MS)}, ${MAX_UNICAST_SOLICIT} unicast probes). Real hosts multiply ReachableTime by a random factor between 0.5 and 1.5, and routers can advertise other values. The link delay is taken as zero. A TCP acknowledgement from B would count as proof that B is there and move a DELAY entry straight back to REACHABLE without any probe; this lesson’s UDP traffic gives no such proof.`,
              `簡略化：タイマーは RFC 4861 の既定値です（ReachableTime ${seconds(REACHABLE_TIME_MS)}、DELAY_FIRST_PROBE_TIME ${seconds(DELAY_FIRST_PROBE_TIME_MS)}、RetransTimer ${seconds(RETRANS_TIMER_MS)}、ユニキャストの確認 ${MAX_UNICAST_SOLICIT} 回）。実際のホストは ReachableTime に 0.5〜1.5 のランダムな係数を掛け、ルータが別の値を広告することもあります。リンクの遅延は 0 としています。B からの TCP の ACK は B がいる証拠になり、DELAY のエントリを確認なしで REACHABLE に戻しますが、このレッスンの UDP の通信にはその証拠がありません。`,
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="nd-slaac-card">
          <div style={LESSON_LABEL}>
            {t('2. An address from a Router Advertisement', '2. ルータ広告からアドレスを作る')}
          </div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              `A router’s Router Advertisement carries the prefix ${PREFIX}. With stateless autoconfiguration (SLAAC) the host adds a 64-bit interface ID of its own. The classic way to make one is EUI-64, from the MAC. Pick a MAC:`,
              `ルータのルータ広告（RA）がプレフィックス ${PREFIX} を運んできました。SLAAC では、ホストが自分で 64 ビットのインタフェース ID を付け足します。昔からの作り方は MAC から作る EUI-64 です。MAC を選んでください。`,
            )}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {MACS.map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={mac === option}
                data-testid={`nd-mac-${option.split(':').join('')}`}
                onClick={() => setMac(option)}
                style={{ ...lessonChoice(mac === option), minHeight: 44 }}
              >
                {mac === option ? '✓ ' : ''}
                {option}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={cell}>{t('MAC', 'MAC')}</td>
                  <td style={mono}>{steps.mac}</td>
                </tr>
                <tr>
                  <td style={cell}>{t('Insert ff:fe in the middle', '真ん中に ff:fe を入れる')}</td>
                  <td style={mono}>{steps.withFffe}</td>
                </tr>
                <tr>
                  <td style={cell}>
                    {t(
                      'Flip the U/L bit (0x02) of the first byte',
                      '先頭バイトの U/L ビット（0x02）を反転',
                    )}
                  </td>
                  <td
                    style={mono}
                  >{`${hex2(steps.firstByteBefore)} → ${hex2(steps.firstByteAfter)}`}</td>
                </tr>
                <tr>
                  <td style={cell}>{t('Interface ID', 'インタフェース ID')}</td>
                  <td style={mono}>{steps.interfaceId}</td>
                </tr>
                <tr>
                  <td style={cell}>{t('Address', 'アドレス')}</td>
                  <td
                    style={{ ...mono, fontWeight: 700 }}
                    data-testid="nd-slaac"
                    data-address={address}
                  >
                    {address}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'The address is written with “:0:” rather than “::” where only one group is zero: RFC 5952 keeps “::” for two or more. An EUI-64 ID carries the MAC, so the same device can be recognised on every network it joins. Most modern operating systems therefore do not use it for global addresses by default: they use a stable ID that looks random and changes from network to network (RFC 7217), plus short-lived temporary addresses for outgoing connections (RFC 8981). The steps that follow are the same whichever ID was chosen.',
              '0 のグループが 1 つだけのところは「::」ではなく「:0:」と書きます。RFC 5952 では「::」は 2 つ以上続く 0 にだけ使うからです。EUI-64 の ID には MAC がそのまま入っているので、同じ機器がどのネットワークにいても見分けられてしまいます。そのため最近の多くの OS は、グローバルアドレスには初期設定で使わず、ネットワークごとに変わるランダムに見える固定の ID（RFC 7217）と、外へ接続するための短命な一時アドレス（RFC 8981）を使います。どの ID を選んでも、このあとの手順は同じです。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="nd-dad-card">
          <div style={LESSON_LABEL}>
            {t('3. Duplicate address detection', '3. 重複アドレス検出（DAD）')}
          </div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              `Before using ${address} the host checks that nobody else has it. Does another node on the link already use it?`,
              `${address} を使う前に、ホストはほかに誰も使っていないかを確かめます。リンク上のほかのノードがすでにこのアドレスを使っていますか？`,
            )}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {[false, true].map((option) => (
              <button
                key={String(option)}
                type="button"
                role="tab"
                aria-selected={inUse === option}
                data-testid={`nd-in-use-${option ? 'yes' : 'no'}`}
                onClick={() => setInUse(option)}
                style={{ ...lessonChoice(inUse === option), minHeight: 44 }}
              >
                {inUse === option ? '✓ ' : ''}
                {option ? t('Yes, another node has it', 'はい、使っている') : t('No', 'いいえ')}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={cell}>{t('NS source', 'NS の送信元')}</td>
                  <td
                    style={mono}
                  >{`${dadOutcome.probe.source} ${t('(unspecified)', '（未指定アドレス）')}`}</td>
                </tr>
                <tr>
                  <td style={cell}>{t('NS destination', 'NS の宛先')}</td>
                  <td style={mono} data-testid="nd-dad-destination">
                    {dadOutcome.probe.destination}
                  </td>
                </tr>
                <tr>
                  <td style={cell}>{t('Target', 'ターゲット')}</td>
                  <td style={mono}>{dadOutcome.probe.target}</td>
                </tr>
                {dadOutcome.events.map((event, index) => (
                  <tr key={index}>
                    <td style={mono}>{seconds(event.atMs)}</td>
                    <td style={cell}>{addressStateName(event.state)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            data-testid="nd-dad"
            data-state={dadFinal.state}
            data-usable={String(dadOutcome.usable)}
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            {dadOutcome.usable
              ? t(
                  `No Neighbor Advertisement came back within ${seconds(RETRANS_TIMER_MS)}, so the address leaves the tentative state and is used.`,
                  `${seconds(RETRANS_TIMER_MS)} 以内に近隣広告（NA）が返ってこなかったので、アドレスは仮の状態を抜けて使われ始めます。`,
                )
              : t(
                  'The other node answers with a Neighbor Advertisement for the target, sent to all nodes (ff02::1) because the question came from ::. The address is marked duplicate and never used; the host logs an error. If the duplicate is a link-local address built from the hardware address, RFC 4862 says IPv6 on that interface should be turned off.',
                  'ほかのノードがターゲットについて近隣広告（NA）で答えます。問い合わせの送信元が :: なので、答えは全ノード宛て（ff02::1）に送られます。アドレスは重複とされ、使われません。ホストはエラーを記録します。重複したのがハードウェアアドレスから作ったリンクローカルアドレスなら、RFC 4862 ではそのインタフェースの IPv6 を止めるべきとしています。',
                )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'The host asks from :: because it may not use an address it has not yet checked. The link-local address (fe80::/64 plus the interface ID) goes through the same check first. Simplified: one probe, sent at once; real hosts wait a short random time before it.',
              'まだ確かめていないアドレスは使えないので、ホストは :: から問い合わせます。リンクローカルアドレス（fe80::/64 ＋ インタフェース ID）も先に同じ確認を受けます。簡略化：確認は 1 回で、すぐに送ります。実際のホストは送る前に短いランダムな時間だけ待ちます。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function Ipv6NdDemo() {
  return (
    <DemoShell
      title="IPv6 Neighbor Discovery"
      desc="The neighbour cache's states over time, an address from a Router Advertisement, and the duplicate check before it is used"
    >
      <Ipv6NdLesson />
    </DemoShell>
  );
}
