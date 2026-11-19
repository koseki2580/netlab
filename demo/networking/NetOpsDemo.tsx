import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  lessonChoice,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  EVENTS,
  FACILITIES,
  FLAP_SEC,
  LAST_POLL_BEFORE_SEC,
  POLL_INTERVAL_SEC,
  SEVERITIES,
  clockSpreadSec,
  deviceTimeMs,
  pollDetection,
  pri,
  sortedByTimestamp,
  syslogLine,
  timestamp,
  trapDetection,
  trueOrder,
  type ClockMode,
  type DeviceId,
  type IncidentEvent,
} from './netOps';

const DEVICE_NAMES: Record<DeviceId, readonly [string, string]> = {
  switch: ['Core switch', 'コアスイッチ'],
  router: ['Router', 'ルータ'],
  firewall: ['Firewall', 'ファイアウォール'],
  server: ['App server', 'アプリサーバ'],
};

const SEVERITY_MEANINGS: readonly (readonly [string, string])[] = [
  ['system unusable', 'システムが使えない'],
  ['act immediately', 'すぐに対処が必要'],
  ['critical', '致命的'],
  ['error', 'エラー'],
  ['warning', '警告'],
  ['normal but significant', '正常だが重要'],
  ['informational', '情報'],
  ['debug', 'デバッグ'],
];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
  textAlign: 'left',
};

const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace' };

const pre: React.CSSProperties = {
  margin: 0,
  padding: 8,
  fontSize: 12,
  lineHeight: 1.6,
  border: '1px solid var(--netlab-border)',
  borderRadius: 6,
  overflowX: 'auto',
};

/** A clock error for people: seconds when large, milliseconds when small. */
function formatOffset(sec: number): string {
  const sign = sec > 0 ? '+' : sec < 0 ? '−' : '±';
  const abs = Math.abs(sec);
  return abs >= 1 ? `${sign}${abs} s` : `${sign}${Math.round(abs * 1000)} ms`;
}

/** Seconds after the incident started, as the true clock reads. */
function formatTrue(sec: number): string {
  return `+${sec.toFixed(1)} s`;
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function NetOpsLesson() {
  const t = useT();
  const [guess, setGuess] = useState<DeviceId | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [mode, setMode] = useState<ClockMode>('no-ntp');
  const [flapSec, setFlapSec] = useState(FLAP_SEC);

  const collected = sortedByTimestamp('no-ntp');
  const trueFirst = trueOrder()[0]!;
  const apparentFirst = collected[0]!;
  const right = guess === trueFirst.device;
  const name = (event: IncidentEvent) => t(...DEVICE_NAMES[event.device]);
  const shown = sortedByTimestamp(mode);
  const spreadNoNtp = clockSpreadSec('no-ntp');
  const spreadNtpMs = Math.round(clockSpreadSec('ntp') * 1000);
  const poll = pollDetection(flapSec, POLL_INTERVAL_SEC, LAST_POLL_BEFORE_SEC);
  const trap = trapDetection();
  const nextPollSec = POLL_INTERVAL_SEC - LAST_POLL_BEFORE_SEC;

  return (
    <div
      style={{
        maxWidth: 820,
        margin: '0 auto',
        padding: 16,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        alignContent: 'start',
        gap: 12,
        overflowY: 'auto',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>{t('Network operations', 'ネットワーク運用')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'Network devices report what happens to them as syslog messages, sent to one collector so an operator can read every device’s log in one place. Each message carries a timestamp from the clock of the device that sent it.',
            'ネットワーク機器は、自分に起きたことを syslog メッセージとして送ります。送り先を 1 台のコレクタにまとめておけば、運用担当者は全機器のログを 1 か所で読めます。各メッセージには、送った機器自身の時計による時刻が入っています。',
          )}
        </p>
        <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
          {t(
            'One morning users report that orders fail. Four devices sent these lines to the collector, which shows them sorted by their timestamps:',
            'ある朝、注文ができないという報告が入りました。4 台の機器がコレクタへ次の行を送っていて、コレクタは時刻の順に並べて表示しています。',
          )}
        </p>
        <pre data-testid="ops-log" style={{ ...pre, marginTop: 8 }}>
          {collected.map((event) => syslogLine(event, 'no-ntp')).join('\n')}
        </pre>
      </div>

      <div style={LESSON_CARD} data-testid="ops-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'Which device’s event really started the incident?',
            '実際に障害の発端になったのは、どの機器のできごと？',
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
        >
          {EVENTS.map((event) => (
            <button
              key={event.device}
              type="button"
              role="radio"
              aria-checked={guess === event.device}
              data-testid={`ops-guess-${event.device}`}
              disabled={revealed}
              onClick={() => setGuess(event.device)}
              style={lessonChoice(guess === event.device)}
            >
              {guess === event.device ? '✓ ' : ''}
              {`${name(event)} (${event.hostname})`}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="ops-reveal"
            data-right={String(right)}
            data-first={trueFirst.device}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {right
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `It started at the ${name(trueFirst)}: its uplink went down, and the rest followed. But no NTP was set up, so the clocks disagreed by up to ${spreadNoNtp} s: the ${name(trueFirst)}’s clock was off by ${formatOffset(trueFirst.offsetNoNtpSec)}, the ${name(apparentFirst)}’s by ${formatOffset(apparentFirst.offsetNoNtpSec)}. Sorted by timestamp, the ${name(apparentFirst)} looked first and the cause looked last. With NTP the clocks agree within ${spreadNtpMs} ms, and the same sort shows the true order.`,
              `発端は${name(trueFirst)}です。アップリンクが落ち、ほかはその結果でした。ところが NTP を設定していなかったので、時計は最大 ${spreadNoNtp} 秒ずれていました。${name(trueFirst)}の時計は ${formatOffset(trueFirst.offsetNoNtpSec)}、${name(apparentFirst)}の時計は ${formatOffset(apparentFirst.offsetNoNtpSec)} ずれていました。時刻で並べると${name(apparentFirst)}が最初に見え、原因がいちばん最後に見えたのです。NTP で合わせると時計のずれは ${spreadNtpMs} ms 以内になり、同じ並べ方で本当の順番になります。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="ops-reveal-button"
            disabled={!guess}
            style={{ ...LESSON_TEAL_BUTTON, marginTop: 8, opacity: guess ? 1 : 0.5 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Show the real clocks', '本当の時計を見る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <>
          <div style={LESSON_CARD} data-testid="ops-timeline">
            <div style={LESSON_LABEL}>
              {t('The same log, two kinds of clock', '同じログ、2 種類の時計')}
            </div>
            <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['no-ntp', 'ntp'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={mode === id}
                  data-testid={`ops-mode-${id}`}
                  onClick={() => setMode(id)}
                  style={lessonChoice(mode === id)}
                >
                  {mode === id ? '✓ ' : ''}
                  {id === 'ntp' ? t('With NTP', 'NTP あり') : t('Without NTP', 'NTP なし')}
                </button>
              ))}
            </div>
            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--netlab-text-secondary)' }}>
                    <th style={cell}>#</th>
                    <th style={cell}>{t('Device timestamp', '機器の時刻')}</th>
                    <th style={cell}>{t('Device', '機器')}</th>
                    <th style={cell}>{t('Clock error', '時計のずれ')}</th>
                    <th style={cell}>{t('Really happened', '実際の時刻')}</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((event, index) => (
                    <tr
                      key={event.device}
                      data-testid={`ops-row-${index}`}
                      data-device={event.device}
                    >
                      <td style={mono}>{index + 1}</td>
                      <td style={{ ...mono, whiteSpace: 'nowrap' }}>
                        {timestamp(deviceTimeMs(event, mode)).slice(11, 23)}
                      </td>
                      <td style={{ ...cell, whiteSpace: 'nowrap' }}>{name(event)}</td>
                      <td style={{ ...mono, whiteSpace: 'nowrap' }}>
                        {formatOffset(mode === 'ntp' ? event.offsetNtpSec : event.offsetNoNtpSec)}
                      </td>
                      <td style={{ ...mono, whiteSpace: 'nowrap' }}>{formatTrue(event.trueSec)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <pre style={{ ...pre, marginTop: 8 }}>
              {shown.map((event) => syslogLine(event, mode)).join('\n')}
            </pre>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 13,
                color: 'var(--netlab-text-secondary)',
                lineHeight: 1.6,
              }}
            >
              {t(
                'NTP (Network Time Protocol) keeps each device’s clock set from time servers. On a LAN it typically holds clocks to around a millisecond of each other; where that is not enough, PTP (Precision Time Protocol, IEEE 1588) reaches below a microsecond with hardware support. Here each clock’s error is fixed for the whole incident; real clocks without NTP also drift, so the error keeps growing. Many collectors also record when each message arrived, but syslog usually travels over UDP, so messages can be delayed or lost — the device’s own timestamp is what you rely on.',
                'NTP（Network Time Protocol）は、時刻サーバを基に各機器の時計を合わせ続けます。LAN では機器どうしの時計を一般に 1 ms 前後まで揃えます。それでは足りない場面では、PTP（Precision Time Protocol、IEEE 1588）がハードウェアの支援を使って 1 µs 未満まで揃えます。ここでは各時計のずれを障害の間ずっと一定にしていますが、NTP のない実際の時計は少しずつ進み遅れが変わり、ずれは広がっていきます。受け取った時刻を記録するコレクタも多いのですが、syslog はふつう UDP で運ばれるので遅れたり失われたりします。頼りにするのは機器自身の時刻です。',
              )}
            </p>
          </div>

          <div style={LESSON_CARD} data-testid="ops-pri">
            <div style={LESSON_LABEL}>{t('Reading <PRI>', '<PRI> の読み方')}</div>
            <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
              {t(
                'Each line starts with <PRI>VERSION, then TIMESTAMP HOSTNAME APP-NAME PROCID MSGID STRUCTURED-DATA MSG (RFC 5424; “-” means empty). PRI packs two numbers: facility × 8 + severity. The facility says what kind of source sent it; network devices often use local0–local7.',
                '各行は <PRI>VERSION で始まり、TIMESTAMP HOSTNAME APP-NAME PROCID MSGID STRUCTURED-DATA MSG と続きます（RFC 5424。「-」は空の意味です）。PRI には 2 つの数が詰まっていて、facility × 8 + severity です。facility は送り元の種類を表し、ネットワーク機器では local0〜local7 がよく使われます。',
              )}
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--netlab-text-secondary)' }}>
                    <th style={cell}>{t('Device', '機器')}</th>
                    <th style={cell}>facility</th>
                    <th style={cell}>severity</th>
                    <th style={cell}>PRI</th>
                  </tr>
                </thead>
                <tbody>
                  {EVENTS.map((event) => {
                    const value = pri(event.facility, event.severity);
                    return (
                      <tr key={event.device}>
                        <td style={{ ...cell, whiteSpace: 'nowrap' }}>{name(event)}</td>
                        <td style={mono}>{`${event.facility} (${FACILITIES[event.facility]})`}</td>
                        <td
                          style={mono}
                        >{`${event.severity} (${SEVERITIES.indexOf(event.severity)})`}</td>
                        <td
                          style={{ ...mono, whiteSpace: 'nowrap' }}
                          data-testid={`ops-pri-${event.device}`}
                          data-pri={value}
                        >
                          {`${FACILITIES[event.facility]} × 8 + ${SEVERITIES.indexOf(event.severity)} = ${value}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--netlab-text-secondary)' }}>
                    <th style={cell}>severity</th>
                    <th style={cell}>{t('Name', '名前')}</th>
                    <th style={cell}>{t('Meaning', '意味')}</th>
                  </tr>
                </thead>
                <tbody>
                  {SEVERITIES.map((severity, index) => (
                    <tr key={severity}>
                      <td style={mono}>{index}</td>
                      <td style={mono}>{severity}</td>
                      <td style={cell}>{t(...SEVERITY_MEANINGS[index]!)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
              {t(
                'A lower severity number is more urgent. Collectors filter and alert on it, for example “send severity 3 and below to the on-call pager”.',
                'severity は数が小さいほど深刻です。コレクタはこれで絞り込みや通知をします。たとえば「severity 3 以下は当番に呼び出しを送る」のように使います。',
              )}
            </p>
          </div>

          <div style={LESSON_CARD} data-testid="ops-snmp">
            <div style={LESSON_LABEL}>
              {t('SNMP: polling vs traps', 'SNMP：ポーリングとトラップ')}
            </div>
            <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
              {t(
                `The uplink was down for ${FLAP_SEC} s. A monitoring server polls the switch over SNMP every ${POLL_INTERVAL_SEC / 60} minutes, reading the interface’s status (ifOperStatus); its last poll was ${LAST_POLL_BEFORE_SEC} s before the link went down. The switch can also send a linkDown trap: a message it sends by itself the moment the interface goes down. Change how long the link stays down:`,
                `アップリンクは ${FLAP_SEC} 秒間ダウンしていました。監視サーバは SNMP で ${POLL_INTERVAL_SEC / 60} 分ごとにスイッチへ問い合わせ（ポーリング）、インターフェースの状態（ifOperStatus）を読みます。最後の問い合わせはリンクが落ちる ${LAST_POLL_BEFORE_SEC} 秒前でした。スイッチは linkDown トラップも送れます。インターフェースが落ちた瞬間に、スイッチが自分から送るメッセージです。リンクが落ちている時間を変えてみましょう。`,
              )}
            </p>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              <span>{t(`Link down for ${flapSec} s`, `リンクのダウン時間：${flapSec} 秒`)}</span>
              <input
                type="range"
                min={10}
                max={600}
                step={10}
                value={flapSec}
                data-testid="ops-flap"
                onChange={(event) => setFlapSec(Number(event.target.value))}
                style={{ minHeight: 44, width: '100%' }}
              />
            </label>
            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--netlab-text-secondary)' }}>
                    <th style={cell}>{t('Method', '方法')}</th>
                    <th style={cell}>{t('Learns the link went down', 'ダウンに気づく時点')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={cell}>
                      {t(
                        `Poll every ${POLL_INTERVAL_SEC} s`,
                        `${POLL_INTERVAL_SEC} 秒ごとのポーリング`,
                      )}
                    </td>
                    <td
                      style={mono}
                      data-testid="ops-poll"
                      data-learns={poll.learnsAfterSec === null ? 'never' : poll.learnsAfterSec}
                    >
                      {poll.learnsAfterSec === null
                        ? t(
                            `never — the next poll, at +${nextPollSec} s, finds it up again`,
                            `気づかない（次の問い合わせ +${nextPollSec} 秒にはもう復旧している）`,
                          )
                        : t(
                            `+${poll.learnsAfterSec} s, at the next poll`,
                            `+${poll.learnsAfterSec} 秒（次の問い合わせ）`,
                          )}
                    </td>
                  </tr>
                  <tr>
                    <td style={cell}>{t('linkDown trap', 'linkDown トラップ')}</td>
                    <td
                      style={mono}
                      data-testid="ops-trap"
                      data-learns={trap.learnsAfterSec ?? 'never'}
                    >
                      {t(
                        `+${trap.learnsAfterSec} s, as it happens`,
                        `+${trap.learnsAfterSec} 秒（その瞬間）`,
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 13,
                color: 'var(--netlab-text-secondary)',
                lineHeight: 1.6,
              }}
            >
              {t(
                'Polling is still useful: it collects counters and graphs over time, and it notices a device that has gone silent, which a trap never can. A poller that also reads ifLastChange or error counters can tell afterwards that something changed. Traps travel over UDP without an acknowledgement, so one can be lost; an SNMP inform is the acknowledged version. Streaming telemetry, where the device pushes its counters every few seconds, has its own lesson:',
                'ポーリングにも役割があります。カウンタを集めて時間ごとのグラフにでき、黙り込んだ機器にも気づけます。これはトラップにはできません。ifLastChange やエラーカウンタも読むポーリングなら、何かが変わったことを後から知ることはできます。トラップは確認応答なしの UDP で運ばれるので失われることがあり、確認応答付きのものは SNMP の inform と呼ばれます。機器が数秒ごとにカウンタを送り出すストリーミングテレメトリには、別のレッスンがあります：',
              )}{' '}
              <Link to="/networking/telemetry" style={{ color: 'var(--netlab-accent-cyan)' }}>
                {t('Streaming telemetry', 'ストリーミングテレメトリ')}
              </Link>
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function NetOpsDemo() {
  return (
    <DemoShell
      title="Syslog, SNMP & NTP"
      desc="Read one incident from four devices' logs, and see how monitoring learns about a short outage"
    >
      <NetOpsLesson />
    </DemoShell>
  );
}
