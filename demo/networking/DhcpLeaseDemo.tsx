import { useState } from 'react';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  LESSON_TEAL_BUTTON_DISABLED,
  lessonChoice,
  predictionMark,
} from '../components/lessonStyles';
import { LessonChallenges } from '../components/LessonChallenges';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  MIN_RETRY_S,
  leaseTimes,
  simulateLease,
  type LeaseEvent,
  type LeaseOutcome,
} from './dhcpLease';
import { dhcpLeaseChallenges } from './dhcpLeaseChallenges';

const H = 3600;
const ASKED = { leaseH: 8, downH: 1 } as const;

type Answer = 'at-once' | 't1' | 't2' | 'expiry';
const ANSWERS: readonly Answer[] = ['at-once', 't1', 't2', 'expiry'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

/** Seconds as h:mm:ss. */
function clock(s: number): string {
  const h = Math.floor(s / H);
  const m = Math.floor((s % H) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** Hours, with a half shown as .5. */
const hours = (s: number) => `${Number((s / H).toFixed(2))} h`;

/** The same, for Japanese sentences: 4 時間. */
const jaHours = (s: number) => `${Number((s / H).toFixed(2))} 時間`;

/** Which answer the moment of first notice matches. */
function answerOf(outcome: LeaseOutcome, leaseS: number, downS: number): Answer {
  const times = leaseTimes(leaseS);
  if (outcome.firstUnansweredS === downS) return 'at-once';
  if (outcome.firstUnansweredS === times.t1S) return 't1';
  return outcome.firstUnansweredS === times.t2S ? 't2' : 'expiry';
}

const CHART_W = 400;
const AXIS_X0 = 16;
const AXIS_X1 = CHART_W - 16;

/** The events on a time line, answered requests filled, unanswered ones hollow. */
function Timeline({ outcome }: { outcome: LeaseOutcome }) {
  const t = useT();
  const endS = outcome.addressLostS ?? outcome.lastLease.expiryS;
  const x = (s: number) => AXIS_X0 + (s / endS) * (AXIS_X1 - AXIS_X0);
  const down = outcome.events.find((e) => e.kind === 'server-down');
  const requests = outcome.events.filter((e) => e.kind === 'renew' || e.kind === 'rebind');
  return (
    <svg
      data-testid="dhcp-lease-timeline"
      viewBox={`0 0 ${CHART_W} 96`}
      style={{ width: '100%', maxWidth: 560 }}
      role="img"
      aria-label={t(
        `Time line to ${hours(endS)}: ${requests.length} requests, ${
          outcome.addressLostS === null ? 'address kept' : `address lost at ${hours(endS)}`
        }`,
        `${jaHours(endS)} までの時間軸：要求 ${requests.length} 回、${
          outcome.addressLostS === null ? 'アドレスは維持' : `${jaHours(endS)} にアドレスを失う`
        }`,
      )}
    >
      <line x1={AXIS_X0} x2={AXIS_X1} y1={48} y2={48} stroke="var(--netlab-border-strong)" />
      {down ? (
        <g>
          <line
            x1={x(down.atS)}
            x2={x(down.atS)}
            y1={24}
            y2={60}
            stroke="var(--netlab-accent-red)"
            strokeWidth={2}
          />
          <text
            x={x(down.atS)}
            y={18}
            textAnchor="start"
            fontSize={12}
            fill="var(--netlab-accent-red)"
          >
            {t('A dies', 'A 停止')}
          </text>
        </g>
      ) : null}
      {requests.map((event, index) => (
        <circle
          key={index}
          cx={x(event.atS)}
          cy={48}
          r={4}
          fill={event.answeredBy ? 'var(--netlab-accent-green)' : 'var(--netlab-bg-primary)'}
          stroke={
            event.kind === 'rebind' ? 'var(--netlab-accent-orange)' : 'var(--netlab-accent-cyan)'
          }
          strokeWidth={2}
        />
      ))}
      <text x={AXIS_X0} y={80} fontSize={12} fill="var(--netlab-text-secondary)">
        0 h
      </text>
      <text
        x={AXIS_X1}
        y={80}
        textAnchor="end"
        fontSize={12}
        fill={
          outcome.addressLostS === null
            ? 'var(--netlab-text-secondary)'
            : 'var(--netlab-accent-red)'
        }
      >
        {outcome.addressLostS === null
          ? hours(endS)
          : t(`${hours(endS)} address lost`, `${hours(endS)} アドレス喪失`)}
      </text>
    </svg>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function DhcpLeaseLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [leaseH, setLeaseH] = useState<number>(ASKED.leaseH);
  const [downH, setDownH] = useState<number>(ASKED.downH);
  const [serverB, setServerB] = useState(false);

  const askedOutcome = simulateLease({
    leaseS: ASKED.leaseH * H,
    serverDownS: ASKED.downH * H,
    serverB: false,
  });
  const askedTimes = leaseTimes(ASKED.leaseH * H);
  const truth = answerOf(askedOutcome, ASKED.leaseH * H, ASKED.downH * H);
  const count = (outcome: LeaseOutcome, kind: LeaseEvent['kind']) =>
    outcome.events.filter((e) => e.kind === kind).length;

  const effectiveDownH = Math.min(downH, leaseH - 0.5);
  const outcome = simulateLease({
    leaseS: leaseH * H,
    serverDownS: effectiveDownH * H,
    serverB,
  });
  const times = leaseTimes(leaseH * H);

  const answerName = (answer: Answer) =>
    ({
      'at-once': t('At 1 h, the moment the server dies', '1 時間後、サーバが止まった瞬間'),
      t1: t('At 4 h', '4 時間後'),
      t2: t('At 7 h', '7 時間後'),
      expiry: t('At 8 h, when the lease runs out', '8 時間後、リースが切れたとき'),
    })[answer];

  const eventName = (event: LeaseEvent) =>
    ({
      ack: t('DHCPACK: lease granted', 'DHCPACK：リース取得'),
      'server-down': t('Server A dies', 'サーバ A が停止'),
      renew: t('DHCPREQUEST (renew)', 'DHCPREQUEST（更新）'),
      rebind: t('DHCPREQUEST (rebind)', 'DHCPREQUEST（再バインド）'),
      expire: t('Lease expires: address removed', 'リース満了：アドレスを削除'),
      discover: t('DHCPDISCOVER (start over)', 'DHCPDISCOVER（最初から）'),
    })[event.kind];
  const sentTo = (event: LeaseEvent) =>
    ({
      ack: t('from A', 'A から'),
      'server-down': '',
      renew: t('unicast to A', 'A へユニキャスト'),
      rebind: t('broadcast', 'ブロードキャスト'),
      expire: '',
      discover: t('broadcast', 'ブロードキャスト'),
    })[event.kind];
  const answer = (event: LeaseEvent) => {
    if (event.kind === 'renew' || event.kind === 'rebind' || event.kind === 'discover')
      return event.answeredBy
        ? t(`DHCPACK from ${event.answeredBy}`, `${event.answeredBy} から DHCPACK`)
        : t('no answer', '応答なし');
    return '';
  };

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
        <div style={LESSON_LABEL}>{t('A DHCP lease', 'DHCP のリース')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'A DHCP server does not give an address away: it lends it for a fixed time, the lease. The client must get the lease extended before it runs out, or give the address up.',
            'DHCP サーバはアドレスを譲るのではなく、決まった時間だけ貸します。これがリースです。クライアントはリースが切れる前に延長してもらうか、アドレスを手放さなければなりません。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="dhcp-lease-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `A laptop gets an ${ASKED.leaseH}-hour lease from server A, its only DHCP server. ${ASKED.downH} hour later server A crashes and stays down. When does the laptop first notice that something is wrong?`,
            `ノート PC が、唯一の DHCP サーバである A から ${ASKED.leaseH} 時間のリースを受け取りました。その ${ASKED.downH} 時間後、サーバ A が落ちてそのまま戻りません。ノート PC が最初に異変に気づくのはいつ？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {ANSWERS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={guess === id}
              data-testid={`dhcp-lease-guess-${id}`}
              disabled={revealed}
              onClick={() => setGuess(id)}
              style={{ ...lessonChoice(guess === id), textAlign: 'left' }}
            >
              {predictionMark(id, guess, truth, revealed)}
              {answerName(id)}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="dhcp-lease-reveal"
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
              `At ${hours(askedOutcome.firstUnansweredS)}. Nothing tells the laptop that the server died: it speaks to the server only when it needs to, and the first time is T1, half the lease, when it unicasts a DHCPREQUEST to renew. Unanswered, it tries ${count(askedOutcome, 'renew')} times in all; at T2 (${hours(askedTimes.t2S)}, 7/8 of the lease) it broadcasts the request to any server, ${count(askedOutcome, 'rebind')} times; at ${hours(askedTimes.expiryS)} the lease ends, the address is removed and it starts over with DHCPDISCOVER. For ${hours(askedTimes.expiryS - ASKED.downH * H)} after the crash the laptop worked normally.`,
              `${jaHours(askedOutcome.firstUnansweredS)}後です。サーバが止まったことをノート PC に知らせるものはありません。ノート PC がサーバに話しかけるのは必要なときだけで、最初はリースの半分の T1 に、更新のための DHCPREQUEST をユニキャストで送るときです。応答がないので合わせて ${count(askedOutcome, 'renew')} 回試し、T2（${jaHours(askedTimes.t2S)}、リースの 7/8）では要求をどのサーバ宛てにもブロードキャストして ${count(askedOutcome, 'rebind')} 回試します。${jaHours(askedTimes.expiryS)}でリースが切れ、アドレスを削除して DHCPDISCOVER から始め直します。落ちてから ${jaHours(askedTimes.expiryS - ASKED.downH * H)}の間、ノート PC は普通に使えていました。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="dhcp-lease-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Follow the lease', 'リースを追う')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="dhcp-lease-lab">
          <div style={LESSON_LABEL}>{t('Change the lease', 'リースを変えてみる')}</div>
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {([false, true] as const).map((withB) => (
              <button
                key={String(withB)}
                type="button"
                role="tab"
                aria-selected={serverB === withB}
                data-testid={withB ? 'dhcp-lease-with-b' : 'dhcp-lease-only-a'}
                onClick={() => setServerB(withB)}
                style={lessonChoice(serverB === withB)}
              >
                {(serverB === withB ? '✓ ' : '') +
                  (withB
                    ? t('Server B on the network too', 'サーバ B もいる')
                    : t('Only server A', 'サーバ A だけ'))}
              </button>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'center',
              marginTop: 8,
            }}
          >
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {t('Lease', 'リース')}
              <input
                type="range"
                min={2}
                max={24}
                step={1}
                value={leaseH}
                data-testid="dhcp-lease-length"
                onChange={(event) => setLeaseH(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{`${leaseH} h`}</span>
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {t('A dies at', 'A の停止')}
              <input
                type="range"
                min={0.5}
                max={leaseH - 0.5}
                step={0.5}
                value={effectiveDownH}
                data-testid="dhcp-lease-down-at"
                onChange={(event) => setDownH(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{`${effectiveDownH} h`}</span>
            </label>
          </div>
          <p
            data-testid="dhcp-lease-result"
            data-first-unanswered={outcome.firstUnansweredS}
            data-address-lost={outcome.addressLostS ?? 'none'}
            data-lease-from={outcome.leaseFrom ?? 'none'}
            style={{ margin: '8px 0 0', fontWeight: 700, lineHeight: 1.7 }}
          >
            {outcome.addressLostS === null
              ? t(
                  `T1 ${hours(times.t1S)}, T2 ${hours(times.t2S)}. First unanswered request at ${hours(outcome.firstUnansweredS)}; server ${outcome.leaseFrom} answers the broadcast and the address is kept.`,
                  `T1 ${jaHours(times.t1S)}、T2 ${jaHours(times.t2S)}。最初の無応答は ${jaHours(outcome.firstUnansweredS)}後。ブロードキャストにサーバ ${outcome.leaseFrom} が応え、アドレスは維持されます。`,
                )
              : t(
                  `T1 ${hours(times.t1S)}, T2 ${hours(times.t2S)}. First unanswered request at ${hours(outcome.firstUnansweredS)}; the address is lost at ${hours(outcome.addressLostS)}.`,
                  `T1 ${jaHours(times.t1S)}、T2 ${jaHours(times.t2S)}。最初の無応答は ${jaHours(outcome.firstUnansweredS)}後、アドレスを失うのは ${jaHours(outcome.addressLostS)}後です。`,
                )}
          </p>
          <Timeline outcome={outcome} />
          <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Dots are requests: cyan edge = renew to A, orange edge = broadcast rebind; filled = answered, hollow = no answer.',
              '点は要求です。水色の縁＝A への更新、橙の縁＝ブロードキャストの再バインド。塗りつぶし＝応答あり、白抜き＝応答なし。',
            )}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table
              data-testid="dhcp-lease-events"
              style={{ width: '100%', borderCollapse: 'collapse' }}
            >
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Time', '時刻')}</th>
                  <th style={cell}>{t('Message', 'メッセージ')}</th>
                  <th style={cell}>{t('Sent', '送り方')}</th>
                  <th style={cell}>{t('Answer', '応答')}</th>
                </tr>
              </thead>
              <tbody>
                {outcome.events.map((event, index) => (
                  <tr key={index} data-kind={event.kind} data-at={event.atS}>
                    <td style={mono}>{clock(event.atS)}</td>
                    <td style={cell}>{eventName(event)}</td>
                    <td style={{ ...cell, whiteSpace: 'nowrap' }}>{sentTo(event)}</td>
                    <td style={{ ...cell, whiteSpace: 'nowrap' }}>{answer(event)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'Why two stages? Renewing asks only the server that gave the lease, by unicast, which disturbs nobody else. Rebinding is the fallback: a broadcast that any server holding this lease may answer, such as a failover partner. That is why a second DHCP server should know the first one’s leases: a server that does not will not extend an address it never gave.',
              'なぜ 2 段階なのでしょうか。更新ではリースをくれたサーバだけにユニキャストで尋ねるので、ほかに迷惑をかけません。再バインドは予備の手段で、このリースを知っているサーバ（フェイルオーバーの相方など）ならどれが応えてもよいブロードキャストです。だから 2 台目の DHCP サーバは 1 台目のリースを知っている必要があります。知らないサーバは、自分が貸していないアドレスを延長しません。',
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Simplified: T1 = 0.5 and T2 = 0.875 of the lease are RFC 2131’s defaults; a server may send other values (options 58 and 59). Retries follow RFC 2131’s suggestion (wait half the time left, at least ${MIN_RETRY_S} s); real clients vary. The network loses no packets here. Server B already knows this lease, as a failover partner would; DHCPv4 failover was never published as an RFC (ISC follows the IETF draft; Microsoft has its own).`,
              `簡略化しています。T1 = リースの 0.5、T2 = 0.875 は RFC 2131 の既定値で、サーバは別の値を送れます（オプション 58 と 59）。再送は RFC 2131 の提案（残り時間の半分、ただし最短 ${MIN_RETRY_S} 秒待つ）に従いますが、実際のクライアントの動きはさまざまです。ここではネットワークでパケットは失われません。サーバ B は、フェイルオーバーの相方のように、このリースをすでに知っているものとしています。DHCPv4 のフェイルオーバーは RFC になっておらず（ISC は IETF のドラフトに従い、Microsoft は独自方式）、製品ごとの機能です。`,
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <LessonChallenges
          lessonId="dhcp-lease"
          challenges={dhcpLeaseChallenges({ leaseH, downH: effectiveDownH, serverB })}
        />
      ) : null}
    </div>
  );
}

export default function DhcpLeaseDemo() {
  return (
    <DemoShell
      title="DHCP lease lifecycle"
      desc="A client's only DHCP server dies mid-lease: follow what the client sends, and when."
    >
      <DhcpLeaseLesson />
    </DemoShell>
  );
}
