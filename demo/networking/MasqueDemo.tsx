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
  FACTS,
  SETUPS,
  SITE_NAME,
  anyoneLinks,
  knows,
  path,
  segments,
  type Fact,
  type Party,
  type Setup,
} from './masque';

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};

type Answer = 'relay1' | 'relay2' | 'nobody';
const ANSWERS: readonly Answer[] = ['relay1', 'relay2', 'nobody'];

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function MasqueLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [setup, setSetup] = useState<Setup>('two-hop');

  const setupName = (id: Setup) =>
    id === 'direct'
      ? t('Direct', '直接')
      : id === 'one-proxy'
        ? t('One proxy', 'プロキシ 1 台')
        : t('Two relays', 'リレー 2 台');
  const partyName = (party: Party | 'client') =>
    ({
      client: t('you', 'あなた'),
      wifi: t('the café’s Wi-Fi', 'カフェの Wi-Fi'),
      relay1: t('ingress relay', '入口リレー'),
      relay2: t('egress relay', '出口リレー'),
      site: SITE_NAME,
    })[party];
  /** A party's name in the setup on show: with one proxy there is no ingress, so no "egress". */
  const shownName = (party: Party | 'client') =>
    party === 'relay2' && setup === 'one-proxy' ? t('the proxy', 'プロキシ') : partyName(party);
  const factName = (fact: Fact) =>
    ({
      clientIp: t('your address', 'あなたのアドレス'),
      site: t('which site', 'どのサイトか'),
      content: t('what you read', '読んでいる中身'),
    })[fact];
  const answerName = (answer: Answer) =>
    answer === 'nobody' ? t('Nobody', '誰もいない') : partyName(answer);

  const truth: Party | 'nobody' = anyoneLinks('two-hop') ?? 'nobody';
  const parties: Party[] = [
    'wifi',
    ...path(setup).flatMap((node) => (node === 'client' ? [] : [node])),
  ];

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
        <div style={LESSON_LABEL}>MASQUE</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'MASQUE lets a client ask a proxy, over HTTP/3, “connect me to this host over UDP” (CONNECT-UDP, RFC 9298). The client’s own QUIC connection to the site then travels inside, as HTTP Datagrams (RFC 9297) in QUIC DATAGRAM frames (RFC 9221) — so the proxy relays it without being able to read it. Chain two proxies run by different companies and you have a relay like iCloud Private Relay.',
            'MASQUE を使うと、クライアントは HTTP/3 でプロキシに「この相手と UDP でつないで」と頼めます（CONNECT-UDP、RFC 9298）。あとは、クライアントとサイトの間の QUIC 接続が、HTTP Datagram（RFC 9297）として QUIC の DATAGRAM フレーム（RFC 9221）に入って運ばれます。プロキシは中継しますが、中身は読めません。別々の会社のプロキシを 2 段つなげば、iCloud Private Relay のようなリレーになります。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="masque-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `With two relays, who besides you knows both your address and that you visit ${SITE_NAME}?`,
            `リレー 2 台のとき、あなた以外で「あなたのアドレス」と「${SITE_NAME} を見ていること」の両方を知っているのは？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
        >
          {ANSWERS.map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={guess === answer}
              data-testid={`masque-guess-${answer}`}
              disabled={revealed}
              onClick={() => setGuess(answer)}
              style={lessonChoice(guess === answer)}
            >
              {guess === answer ? '✓ ' : ''}
              {answerName(answer)}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="masque-reveal"
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
              'The ingress relay sees your address but only a sealed request for the egress relay. The egress relay opens that and learns the site, but the packet comes from the ingress relay’s address. Switch to “One proxy” to see the single proxy knowing both.',
              '入口リレーにはあなたのアドレスが見えますが、届くのは出口リレー宛てに封をした依頼だけです。出口リレーはそれを開いてサイトを知りますが、パケットの送り元は入口リレーのアドレスです。「プロキシ 1 台」に切り替えると、1 台のプロキシが両方を知ってしまうのが分かります。',
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="masque-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('See who learns what', '誰が何を知るか見る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="masque-results">
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SETUPS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={setup === id}
                data-testid={`masque-setup-${id}`}
                onClick={() => setSetup(id)}
                style={lessonChoice(setup === id)}
              >
                {setupName(id)}
              </button>
            ))}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                <th style={cell}>{t('Who', '誰が')}</th>
                {FACTS.map((fact) => (
                  <th key={fact} style={cell}>
                    {factName(fact)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parties.map((party) => {
                const known = knows(setup, party);
                return (
                  <tr key={party} data-testid={`masque-row-${party}`}>
                    <td style={cell}>{shownName(party)}</td>
                    {FACTS.map((fact) => (
                      <td
                        key={fact}
                        data-testid={`masque-${party}-${fact}`}
                        data-known={String(known[fact])}
                        style={{ ...cell, fontWeight: known[fact] ? 700 : 400 }}
                      >
                        {known[fact] ? t('✓ knows', '✓ 知る') : t('✕ does not', '✕ 知らない')}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p data-testid="masque-links" style={{ margin: '8px 0 0', fontWeight: 700 }}>
            {(() => {
              const linker = anyoneLinks(setup);
              return linker
                ? t(
                    `${shownName(linker)} knows both who and where.`,
                    `${shownName(linker)}が「誰が」と「どこへ」の両方を知ります。`,
                  )
                : t(
                    'Nobody but you knows both who and where.',
                    'あなた以外、「誰が」と「どこへ」の両方を知る者はいません。',
                  );
            })()}
          </p>
          <div style={{ ...LESSON_LABEL, marginTop: 10 }}>
            {t('On each stretch', '区間ごとのパケット')}
          </div>
          <ol
            data-testid="masque-segments"
            style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.7 }}
          >
            {segments(setup).map((segment) => (
              <li key={`${segment.from}-${segment.to}`}>
                <span
                  style={{ fontFamily: 'monospace' }}
                >{`${segment.srcIp} → ${segment.dstIp}`}</span>
                {' — '}
                {segment.layer.next === 'request'
                  ? t(
                      `QUIC sealed to ${shownName(segment.layer.key)}: the request itself`,
                      `${shownName(segment.layer.key)}宛てに封をした QUIC：依頼そのもの`,
                    )
                  : t(
                      `sealed to ${shownName(segment.layer.key)}: “CONNECT-UDP to ${shownName(segment.layer.next)}”, and inside it more sealed layers`,
                      `${shownName(segment.layer.key)}宛てに封：「${shownName(segment.layer.next)}へ CONNECT-UDP」、その中にさらに封をした層`,
                    )}
              </li>
            ))}
          </ol>
          {setup === 'two-hop' ? (
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
              {t(
                'Two relays protect you only if their operators do not share notes — which is why Private Relay runs the two by different companies. The site still sees the egress relay’s address, usually chosen near you so the site can tell your region.',
                '2 台のリレーが守ってくれるのは、運営者どうしが情報を突き合わせない場合だけです。だから Private Relay は 2 台を別の会社が運営します。サイトには出口リレーのアドレスが見えます。地域が分かるよう、ふつうはあなたの近くのものが選ばれます。',
              )}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function MasqueDemo() {
  return (
    <DemoShell
      title="MASQUE"
      desc="UDP through HTTP/3 proxies: who learns your address, the site and what you read"
    >
      <MasqueLesson />
    </DemoShell>
  );
}
