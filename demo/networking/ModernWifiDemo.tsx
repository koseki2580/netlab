import { useState } from 'react';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  LESSON_TEAL_BUTTON_DISABLED,
  lessonChoice,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  AIRTIME_MODES,
  BANDS,
  CHANNEL_RATE_MBPS,
  MAX_RUS,
  OFFLINE_GUESSES_PER_S,
  ONLINE_GUESSES_PER_S,
  OVERHEAD_US,
  REGIONS,
  WIDTHS,
  WORDLISTS,
  airtime,
  channelCount,
  crackTime,
  type AirtimeMode,
  type Region,
} from './modernWifi';

type Answer = 'faster' | 'ofdma' | 'same';
const ANSWERS: readonly Answer[] = ['faster', 'ofdma', 'same'];

const CLIENTS = 30;
const BYTES = 200;

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

/** Which answer the airtimes match: the bigger saving, or "same" when within 10 % of the total. */
function answerOf(clients: number, bytes: number): Answer {
  const base = airtime('single', clients, bytes).totalUs;
  const byRate = base - airtime('faster', clients, bytes).totalUs;
  const byOfdma = base - airtime('ofdma', clients, bytes).totalUs;
  if (Math.abs(byRate - byOfdma) < base * 0.1) return 'same';
  return byOfdma > byRate ? 'ofdma' : 'faster';
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function ModernWifiLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [clients, setClients] = useState(CLIENTS);
  const [bytes, setBytes] = useState(BYTES);
  const [region, setRegion] = useState<Region>('us');
  const [words, setWords] = useState(WORDLISTS[0]!);
  const truth = answerOf(CLIENTS, BYTES);
  const asked = {
    single: airtime('single', CLIENTS, BYTES),
    faster: airtime('faster', CLIENTS, BYTES),
    ofdma: airtime('ofdma', CLIENTS, BYTES),
  };
  const results = Object.fromEntries(
    AIRTIME_MODES.map((mode) => [mode, airtime(mode, clients, bytes)]),
  ) as Record<AirtimeMode, ReturnType<typeof airtime>>;
  const longest = Math.max(...AIRTIME_MODES.map((mode) => results[mode].totalUs));
  const crack = crackTime(words);

  const answerName = (answer: Answer) =>
    ({
      faster: t('Doubling the data rate', 'データレートを 2 倍にする'),
      ofdma: t('OFDMA', 'OFDMA'),
      same: t('About the same', 'どちらも同じくらい'),
    })[answer];
  const modeName = (mode: AirtimeMode) =>
    ({
      single: t('Wi-Fi 5: one phone at a time', 'Wi-Fi 5：1 台ずつ'),
      faster: t('One at a time, twice the rate', '1 台ずつ、レート 2 倍'),
      ofdma: t('Wi-Fi 6: OFDMA', 'Wi-Fi 6：OFDMA'),
    })[mode];
  const regionName = (r: Region) => ({ us: t('US', '米国'), jp: t('Japan', '日本') })[r];
  const duration = (s: number) => {
    if (s < 60) return t(`${Number(s.toPrecision(3))} s`, `${Number(s.toPrecision(3))} 秒`);
    if (s < 3600) return t(`${(s / 60).toFixed(1)} min`, `${(s / 60).toFixed(1)} 分`);
    if (s < 86_400) return t(`${(s / 3600).toFixed(1)} h`, `${(s / 3600).toFixed(1)} 時間`);
    if (s < 365 * 86_400)
      return t(`${(s / 86_400).toFixed(1)} days`, `${(s / 86_400).toFixed(1)} 日`);
    return t(`${(s / (365 * 86_400)).toFixed(1)} years`, `${(s / (365 * 86_400)).toFixed(1)} 年`);
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
        <div style={LESSON_LABEL}>{t('A busy access point', '混み合ったアクセスポイント')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `In a classroom, ${CLIENTS} phones are on one access point, on one 20 MHz channel. The AP has one small packet (${BYTES} bytes, a chat message or a notification) for each of them. Up to Wi-Fi 5, the AP sends to one phone at a time. Wi-Fi 6 (IEEE 802.11ax) adds OFDMA: the AP can split the channel into smaller pieces, called resource units, and send to several phones in the same transmission, each on its own piece.`,
            `教室で ${CLIENTS} 台のスマートフォンが、1 台のアクセスポイントの 1 つの 20 MHz チャネルにつながっています。AP には、それぞれ宛ての小さなパケット（${BYTES} バイト、チャットのメッセージや通知）が 1 つずつあります。Wi-Fi 5 までは、AP は 1 台ずつ順に送ります。Wi-Fi 6（IEEE 802.11ax）は OFDMA を加えました。AP はチャネルをリソースユニット（RU）という小さな区画に分け、1 回の送信で何台かへ、それぞれ別の区画で同時に送れます。`,
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="wifi-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `To deliver these ${CLIENTS} small packets in less airtime, which helps more: sending one phone at a time at twice the data rate, or OFDMA at the same rate?`,
            `この ${CLIENTS} 個の小さなパケットを短い電波の時間で届けるには、どちらがより効く？ 1 台ずつのままデータレートを 2 倍にするか、同じレートで OFDMA を使うか。`,
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
              data-testid={`wifi-guess-${answer}`}
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
            data-testid="wifi-reveal"
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
              `OFDMA: ${asked.ofdma.totalUs} µs instead of ${asked.single.totalUs} µs, while twice the rate gives ${asked.faster.totalUs} µs. Every transmission costs about ${OVERHEAD_US} µs before and after the data — waiting for the channel, the preamble, the acknowledgement — and a ${BYTES}-byte packet takes only ${(BYTES * 8) / CHANNEL_RATE_MBPS} µs at ${CHANNEL_RATE_MBPS} Mb/s. A faster rate shortens only that small part. OFDMA puts up to ${MAX_RUS} phones in one transmission, so the overhead is paid ${asked.ofdma.transmissions} times instead of ${asked.single.transmissions}.`,
              `OFDMA は ${asked.ofdma.totalUs} µs で、1 台ずつの ${asked.single.totalUs} µs より大幅に短くなります。レート 2 倍では ${asked.faster.totalUs} µs です。送信は 1 回ごとに、データの前後で約 ${OVERHEAD_US} µs かかります（チャネルが空くのを待つ時間、プリアンブル、ACK）。${BYTES} バイトのパケットそのものは ${CHANNEL_RATE_MBPS} Mb/s で ${(BYTES * 8) / CHANNEL_RATE_MBPS} µs しかかかりません。レートを上げて縮むのは、この小さな部分だけです。OFDMA は 1 回の送信に最大 ${MAX_RUS} 台を載せるので、オーバーヘッドを払うのが ${asked.single.transmissions} 回から ${asked.ofdma.transmissions} 回に減ります。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="wifi-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Measure the airtime', '電波の時間を測る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="wifi-airtime">
          <div style={LESSON_LABEL}>{t('Airtime', '電波の使用時間')}</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {t('Phones', '台数')}
              <input
                type="range"
                min={1}
                max={60}
                value={clients}
                data-testid="wifi-clients"
                onChange={(event) => setClients(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{clients}</span>
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {t('Packet', 'パケット')}
              <input
                type="range"
                min={100}
                max={1500}
                step={100}
                value={bytes}
                data-testid="wifi-bytes"
                onChange={(event) => setBytes(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{`${bytes} B`}</span>
            </label>
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            {AIRTIME_MODES.map((mode) => {
              const result = results[mode];
              return (
                <div
                  key={mode}
                  data-testid={`wifi-airtime-${mode}`}
                  data-us={result.totalUs}
                  data-tx={result.transmissions}
                >
                  <div style={{ fontSize: 13 }}>
                    {modeName(mode)}
                    <span style={{ fontFamily: 'monospace', marginLeft: 8, whiteSpace: 'nowrap' }}>
                      {t(
                        `${result.totalUs} µs, ${result.transmissions} transmissions`,
                        `${result.totalUs} µs、送信 ${result.transmissions} 回`,
                      )}
                    </span>
                  </div>
                  <div
                    aria-hidden="true"
                    style={{
                      display: 'flex',
                      height: 14,
                      width: `${(result.totalUs / longest) * 100}%`,
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(result.overheadUs / result.totalUs) * 100}%`,
                        background: 'var(--netlab-text-secondary)',
                      }}
                    />
                    <div style={{ flex: 1, background: 'var(--netlab-accent-cyan)' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Left part of each bar: overhead; right part: data. Simplified: the ${OVERHEAD_US} µs overhead per transmission and the ${CHANNEL_RATE_MBPS} Mb/s rate are assumptions. A 20 MHz channel splits into 9, 4, 2 or 1 RUs (26, 52, 106 or 242 subcarriers), and a smaller RU carries proportionally less, so with OFDMA the data part grows. The trigger frames and multi-user acknowledgements OFDMA needs are not counted, so the real saving is smaller. With one phone, OFDMA gives it the whole channel and saves nothing.`,
              `各バーの左側はオーバーヘッド、右側はデータです。簡略化しています。送信 1 回あたり ${OVERHEAD_US} µs のオーバーヘッドと ${CHANNEL_RATE_MBPS} Mb/s のレートは仮定です。20 MHz のチャネルは 9・4・2・1 個の RU（26・52・106・242 サブキャリア）に分けられ、小さい RU ほど運べる量も比例して減るので、OFDMA ではデータの部分が長くなります。OFDMA に必要なトリガーフレームや複数端末向けの ACK は数えていないため、実際の短縮はこれより小さくなります。1 台だけなら、OFDMA はチャネル全体をその 1 台に渡すので何も変わりません。`,
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="wifi-channels">
          <div style={LESSON_LABEL}>{t('How many channels fit', 'チャネルはいくつ取れるか')}</div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              'Neighbouring APs on the same channel share its airtime, so the number of non-overlapping channels decides how many APs can sit side by side without slowing each other. Wider channels are faster but there are fewer of them. Wi-Fi 6E is Wi-Fi 6 in the 6 GHz band; Wi-Fi 7 (802.11be) adds 320 MHz channels there, and multi-link operation lets one device use links in several bands at once.',
              '同じチャネルを使う近くの AP どうしは電波の時間を分け合うので、重ならないチャネルの数が、互いに遅くせずに並べられる AP の数を決めます。チャネルを広げれば速くなりますが、数は減ります。Wi-Fi 6E は 6 GHz 帯で使う Wi-Fi 6 です。Wi-Fi 7（802.11be）はそこに 320 MHz のチャネルを加え、マルチリンク（MLO）で 1 台の機器が複数の帯域のリンクを同時に使えるようにしました。',
            )}
          </p>
          <div
            role="tablist"
            aria-label={t('Country', '国')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={region === r}
                data-testid={`wifi-region-${r}`}
                onClick={() => setRegion(r)}
                style={lessonChoice(region === r)}
              >
                {region === r ? '✓ ' : ''}
                {regionName(r)}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Band', '帯域')}</th>
                  {WIDTHS.map((width) => (
                    <th key={width} style={{ ...cell, whiteSpace: 'nowrap' }}>
                      {`${width} MHz`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BANDS.map((band) => (
                  <tr key={band}>
                    <td style={{ ...cell, whiteSpace: 'nowrap' }}>{`${band} GHz`}</td>
                    {WIDTHS.map((width) => {
                      const result = channelCount(region, band, width);
                      return (
                        <td
                          key={width}
                          style={mono}
                          data-testid={`wifi-ch-${band}-${width}`}
                          data-count={result?.count ?? ''}
                          data-dfs={result?.dfs ?? ''}
                        >
                          {result === null
                            ? '—'
                            : result.dfs > 0
                              ? t(
                                  `${result.count} (${result.dfs} DFS)`,
                                  `${result.count}（DFS ${result.dfs}）`,
                                )
                              : String(result.count)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'DFS: on those 5 GHz channels the AP must first listen for radar and move away when it hears one. In 2.4 GHz, channels are 5 MHz apart but the original 802.11b signal is 22 MHz wide, so only channels 1, 6 and 11 do not overlap; wider channels are left out here. Rules differ by country and change over time: this uses the US 6 GHz band of 5925–7125 MHz and Japan’s 5925–6425 MHz, and leaves out newer additions and indoor-only limits.',
              'DFS：これらの 5 GHz のチャネルでは、AP はまずレーダーが出ていないかを確かめ、検出したら別のチャネルへ移らなければなりません。2.4 GHz のチャネル番号は 5 MHz おきですが、もともとの 802.11b の信号は 22 MHz 幅なので、重ならないのは 1・6・11 だけです。ここでは 20 MHz より広いチャネルは省きました。規則は国によって異なり、変わっていきます。ここでは米国の 6 GHz 帯を 5925〜7125 MHz、日本を 5925〜6425 MHz とし、新しく追加された帯域や屋内限定などの条件は省いています。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="wifi-wpa3">
          <div style={LESSON_LABEL}>{t('WPA2-PSK vs WPA3-SAE', 'WPA2-PSK と WPA3-SAE')}</div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              'With WPA2-PSK, someone who recorded one four-way handshake can test password guesses against it on their own computer, as fast as it can compute, and the AP never notices. WPA3-Personal replaces this with SAE: the handshake leaks nothing to test against, so each guess needs a new live exchange with the AP. How long does it take to try every word of a list?',
              'WPA2-PSK では、4 ウェイハンドシェイクを 1 回録っておけば、パスワードの候補を自分のコンピュータ上で計算できる限りの速さで照らし合わせられ、AP はそれに気づきません。WPA3-Personal はこれを SAE に置きかえました。やり取りからは照らし合わせに使える情報が漏れないので、候補を 1 つ試すたびに AP と実際にやり取りしなければなりません。リストの単語をすべて試すのにかかる時間は？',
            )}
          </p>
          <div
            role="tablist"
            aria-label={t('Words in the list', 'リストの単語数')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {WORDLISTS.map((count) => (
              <button
                key={count}
                type="button"
                role="tab"
                aria-selected={words === count}
                data-testid={`wifi-words-${count}`}
                onClick={() => setWords(count)}
                style={lessonChoice(words === count)}
              >
                {words === count ? '✓ ' : ''}
                {t(`${count.toLocaleString('en')} words`, `${count.toLocaleString('ja')} 語`)}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={cell}>
                    {t(
                      `WPA2-PSK, offline (${OFFLINE_GUESSES_PER_S.toLocaleString('en')} guesses/s)`,
                      `WPA2-PSK、オフライン（毎秒 ${OFFLINE_GUESSES_PER_S.toLocaleString('ja')} 回）`,
                    )}
                  </td>
                  <td style={mono} data-testid="wifi-crack-offline" data-seconds={crack.offlineS}>
                    {duration(crack.offlineS)}
                  </td>
                </tr>
                <tr>
                  <td style={cell}>
                    {t(
                      `WPA3-SAE, online (${ONLINE_GUESSES_PER_S} guess/s)`,
                      `WPA3-SAE、オンライン（毎秒 ${ONLINE_GUESSES_PER_S} 回）`,
                    )}
                  </td>
                  <td style={mono} data-testid="wifi-crack-online" data-seconds={crack.onlineS}>
                    {duration(crack.onlineS)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              `${crack.ratio.toLocaleString('en')} times longer, and every attempt is visible to the AP, which can slow it down or raise an alarm. SAE also gives forward secrecy: with WPA2-PSK, anyone who later learns the password can decrypt traffic they recorded earlier; with SAE each session’s keys cannot be recovered from the password afterwards. WPA3 also requires protected management frames, so forged “disconnect” frames no longer knock phones off.`,
              `${crack.ratio.toLocaleString('ja')} 倍の時間がかかり、しかも試すたびに AP から見えるので、AP は速度を落とさせたり警告を出したりできます。SAE には前方秘匿性もあります。WPA2-PSK では、あとからパスワードを知った人が、前に録っておいた通信を復号できます。SAE では、あとからパスワードを知っても各セッションの鍵は取り出せません。さらに WPA3 では管理フレームの保護（PMF）が必須なので、偽の「切断」フレームで端末を切り離すこともできなくなります。`,
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Both guess rates are assumptions for this lesson. A long random password is safe with either; WPA3 matters most for the short, guessable ones people really use. An AP in WPA2/WPA3 transition mode still accepts WPA2, so old devices keep the old weakness.',
              'どちらの速さもこのレッスンの仮定です。長くランダムなパスワードならどちらでも安全で、WPA3 が特に効くのは、実際によく使われる短く推測しやすいパスワードです。WPA2/WPA3 の移行モードの AP は WPA2 も受け付けるので、古い機器には古い弱点が残ります。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function ModernWifiDemo() {
  return (
    <DemoShell
      title="Modern Wi-Fi: Wi-Fi 6/7 and WPA3"
      desc="Many phones on one access point, the channels each band offers, and what WPA3 changes for passwords"
    >
      <ModernWifiLesson />
    </DemoShell>
  );
}
