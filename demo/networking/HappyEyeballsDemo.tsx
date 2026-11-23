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
  ATTEMPT_DELAY_MS,
  NAIVE_TIMEOUT_MS,
  RTT,
  SCENARIOS,
  happyEyeballs,
  oneAtATime,
  synthesize,
  translate,
  type Outcome,
  type Scenario,
} from './happyEyeballs';

type Answer = 'v6-fast' | 'v4-fast' | 'v4-slow' | 'never';
const ANSWERS: readonly Answer[] = ['v6-fast', 'v4-fast', 'v4-slow', 'never'];

const SITES = ['192.0.2.33', '198.51.100.7', '203.0.113.200'] as const;

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};

/** Which answer an outcome matches. */
function answerOf(outcome: Outcome): Answer {
  if (outcome.family === 'IPv6') return 'v6-fast';
  return outcome.connectedMs < 1000 ? 'v4-fast' : 'v4-slow';
}

const seconds = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms} ms`);

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function HappyEyeballsLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [site, setSite] = useState<(typeof SITES)[number]>(SITES[0]);
  const broken = happyEyeballs('v6-broken');
  const truth = answerOf(broken);
  const scenarioName = (scenario: Scenario) =>
    ({
      'v6-ok': t('IPv6 works', 'IPv6 が正常'),
      'v6-broken': t('IPv6 silently broken', 'IPv6 が黙って届かない'),
      'v6-slow': t('IPv6 slow (300 ms)', 'IPv6 が遅い（300 ms）'),
    })[scenario];
  const answerName = (answer: Answer) =>
    ({
      'v6-fast': t('Over IPv6, in about 20 ms', 'IPv6 で、約 20 ms'),
      'v4-fast': t('Over IPv4, in well under a second', 'IPv4 で、1 秒もかからずに'),
      'v4-slow': t('Over IPv4, after about 20 seconds', 'IPv4 で、約 20 秒後に'),
      never: t('It never connects', 'つながらない'),
    })[answer];
  const packet = translate(site);

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
        <div style={LESSON_LABEL}>{t('Happy Eyeballs', 'Happy Eyeballs')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'A laptop has both IPv6 and IPv4. It looks up a site and gets both an IPv6 address (AAAA) and an IPv4 one (A). It prefers IPv6. But somewhere on the way, IPv6 packets are being dropped without any error coming back.',
            'ノート PC には IPv6 と IPv4 の両方があります。サイトを引くと、IPv6 のアドレス（AAAA）と IPv4 のアドレス（A）の両方が返ります。PC は IPv6 を優先します。ところが途中のどこかで、IPv6 のパケットがエラーも返さずに捨てられています。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="he-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'A browser that follows Happy Eyeballs v2 opens the site. How does it connect?',
            'Happy Eyeballs v2 に従うブラウザがサイトを開きます。どうつながる？',
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
              data-testid={`he-guess-${answer}`}
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
            data-testid="he-reveal"
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
              `Over ${broken.family}, after ${seconds(broken.connectedMs)}. Happy Eyeballs (RFC 8305) starts IPv6 first, and if it has not connected within ${ATTEMPT_DELAY_MS} ms it starts IPv4 alongside; whichever connects first is used. A browser that tried one address at a time would wait for IPv6 to time out — about ${NAIVE_TIMEOUT_MS / 1000} s with Windows’ default (longer on Linux) — before trying IPv4.`,
              `${broken.family} で、${seconds(broken.connectedMs)} 後につながります。Happy Eyeballs（RFC 8305）はまず IPv6 を試し、${ATTEMPT_DELAY_MS} ms 以内につながらなければ IPv4 も並べて試し、先につながった方を使います。1 つずつ順に試すブラウザなら、IPv6 があきらめられるまで（Windows の初期設定で約 ${NAIVE_TIMEOUT_MS / 1000} 秒、Linux ではもっと長い）待ってから IPv4 を試します。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="he-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('See the race', '競争を見る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="he-table">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Path', '経路の状態')}</th>
                  <th style={cell}>{t('Round trip', '往復時間')}</th>
                  <th style={cell}>Happy Eyeballs</th>
                  <th style={cell}>{t('One at a time', '1 つずつ順に')}</th>
                </tr>
              </thead>
              <tbody>
                {SCENARIOS.map((scenario) => {
                  const happy = happyEyeballs(scenario);
                  const naive = oneAtATime(scenario);
                  const { v6, v4 } = RTT[scenario];
                  return (
                    <tr key={scenario}>
                      <td style={cell}>{scenarioName(scenario)}</td>
                      <td style={{ ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {`v6 ${v6 === null ? '—' : `${v6} ms`} / v4 ${v4} ms`}
                      </td>
                      <td
                        style={{ ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' }}
                        data-testid={`he-happy-${scenario}`}
                        data-family={happy.family}
                        data-ms={happy.connectedMs}
                      >
                        {`${happy.family}, ${seconds(happy.connectedMs)}`}
                      </td>
                      <td
                        style={{ ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' }}
                        data-testid={`he-naive-${scenario}`}
                        data-family={naive.family}
                        data-ms={naive.connectedMs}
                      >
                        {`${naive.family}, ${seconds(naive.connectedMs)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Simplified: both DNS answers arrive together and a connection takes one round trip. Real clients that get the A answer first also wait up to 50 ms for the AAAA answer, and sort several addresses of each family.',
              '簡略化しています。2 つの DNS の答えは同時に届き、接続には 1 往復かかるものとしました。実際のクライアントは、A の答えが先に届いたときは AAAA の答えを最大 50 ms 待ち、各ファミリーの複数のアドレスを並べ替えて試します。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="he-nat64">
          <div style={LESSON_LABEL}>
            {t('An IPv6-only network: NAT64 and DNS64', 'IPv6 だけのネットワーク：NAT64 と DNS64')}
          </div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              'Many mobile networks give phones only IPv6. A site with only an IPv4 address is still reachable: the DNS64 resolver makes up an IPv6 address by putting the IPv4 address in the prefix 64:ff9b::/96, and the NAT64 on the way out turns the packet into IPv4.',
              '多くのモバイル網は、スマートフォンに IPv6 しか渡しません。それでも IPv4 のアドレスしかないサイトに届きます。DNS64 のリゾルバが IPv4 アドレスを 64:ff9b::/96 に埋め込んだ IPv6 アドレスを作り、出口の NAT64 がパケットを IPv4 に変えるからです。',
            )}
          </p>
          <div
            role="tablist"
            aria-label={t('The site’s IPv4 address', 'サイトの IPv4 アドレス')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {SITES.map((ip) => (
              <button
                key={ip}
                type="button"
                role="tab"
                aria-selected={site === ip}
                data-testid={`he-site-${ip}`}
                onClick={() => setSite(ip)}
                style={lessonChoice(site === ip)}
              >
                {ip}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                <tr>
                  <td style={cell}>{t('DNS64 answers (AAAA)', 'DNS64 の答え（AAAA）')}</td>
                  <td style={{ ...cell, fontFamily: 'monospace' }} data-testid="he-synth">
                    {synthesize(site)}
                  </td>
                </tr>
                <tr>
                  <td style={cell}>
                    {t('The phone sends (IPv6)', 'スマートフォンが送る（IPv6）')}
                  </td>
                  <td
                    style={{ ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' }}
                    data-testid="he-v6"
                  >
                    {`${packet.v6.src} → ${packet.v6.dst}`}
                  </td>
                </tr>
                <tr>
                  <td style={cell}>{t('The NAT64 sends on (IPv4)', 'NAT64 が送り出す（IPv4）')}</td>
                  <td
                    style={{ ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' }}
                    data-testid="he-v4"
                  >
                    {`${packet.v4.src} → ${packet.v4.dst}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'An app that uses IPv4 addresses directly cannot be helped by DNS64; 464XLAT adds a small translator (CLAT) on the phone that turns its IPv4 into IPv6 for the NAT64 to turn back.',
              'IPv4 アドレスを直接使うアプリは DNS64 では助けられません。464XLAT は、スマートフォン上の小さな変換器（CLAT）でその IPv4 を IPv6 に変え、NAT64 で IPv4 に戻します。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function HappyEyeballsDemo() {
  return (
    <DemoShell
      title="Happy Eyeballs and NAT64"
      desc="Two address families, one connection: which one a client uses, and how IPv6-only networks still reach IPv4"
    >
      <HappyEyeballsLesson />
    </DemoShell>
  );
}
