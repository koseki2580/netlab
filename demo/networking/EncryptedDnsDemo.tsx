import { useState } from 'react';
import {
  LESSON_BUTTON,
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  METHODS,
  QUERY,
  RESOLVER,
  TRANSPORT,
  networkCan,
  type Method,
  type WhatTheNetworkCan,
} from './encryptedDns';

const NAME: Record<Method, string> = {
  do53: 'DNS (Do53)',
  dot: 'DNS over TLS (DoT)',
  doh: 'DNS over HTTPS (DoH)',
  doq: 'DNS over QUIC (DoQ)',
};

const ENCRYPTED: readonly Method[] = ['dot', 'doh', 'doq'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function EncryptedDnsLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Method | null>(null);
  const [revealed, setRevealed] = useState(false);
  const unblockable = METHODS.filter((method) => !networkCan(method).blockByPortAlone);
  const right = guess !== null && unblockable.includes(guess);
  const abilities: readonly (readonly [keyof WhatTheNetworkCan, string, string])[] = [
    ['readName', `Read “${QUERY}”`, `「${QUERY}」を読む`],
    ['forgeAnswer', 'Change the answer unnoticed', '気づかれずに答えを書き換える'],
    ['blockByPortAlone', 'Block it by port alone', 'ポート番号だけで止める'],
  ];

  return (
    <div
      style={{
        maxWidth: 820,
        margin: '0 auto',
        padding: 16,
        display: 'grid',
        gap: 12,
        overflowY: 'auto',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>{t('Encrypted DNS', 'DNS の暗号化')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `Before your browser connects to ${QUERY}, it asks a resolver (${RESOLVER}) for the address. Classic DNS sends that question in plain text on UDP port 53, so the café’s network can read it — and answer it itself. Three standards wrap the same DNS message in encryption: DNS over TLS on TCP 853, DNS over HTTPS inside ordinary HTTPS on TCP 443, and DNS over QUIC on UDP 853.`,
            `ブラウザは ${QUERY} につなぐ前に、リゾルバ（${RESOLVER}）にアドレスを問い合わせます。従来の DNS はこの質問を UDP 53 番で平文のまま送るので、カフェのネットワークは中身を読めますし、自分で答えを返すこともできます。同じ DNS メッセージを暗号化で包む標準が 3 つあります。TCP 853 番の DNS over TLS、普通の HTTPS の中で TCP 443 番を使う DNS over HTTPS、UDP 853 番の DNS over QUIC です。`,
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="edns-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'The café’s network wants to keep reading names, so it blocks encrypted DNS by its port number. Which method can it not block that way without also blocking the web?',
            'カフェのネットワークは名前を読み続けたいので、暗号化した DNS をポート番号で止めようとします。Web まで止めずには、その方法で止められないのはどれ？',
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {ENCRYPTED.map((method) => (
            <button
              key={method}
              type="button"
              role="radio"
              aria-checked={guess === method}
              data-testid={`edns-guess-${method}`}
              disabled={revealed}
              onClick={() => setGuess(method)}
              style={{
                ...LESSON_BUTTON,
                textAlign: 'left',
                outline: guess === method ? '2px solid var(--netlab-accent-cyan)' : undefined,
              }}
            >
              {NAME[method]}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="edns-reveal"
            data-right={String(right)}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {right
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              'DoH. DoT and DoQ have their own port, 853, so one rule stops them and the device falls back to plain DNS. DoH travels on TCP 443 like every HTTPS page; to block it the network must know the resolver’s address and block that.',
              'DoH です。DoT と DoQ には専用のポート 853 番があるので、規則 1 つで止められ、端末は平文の DNS に戻ってしまいます。DoH は、どの HTTPS のページとも同じ TCP 443 番を通ります。止めるには、リゾルバのアドレスを知っていて、それを止めるしかありません。',
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="edns-reveal-button"
            disabled={!guess}
            style={{ ...LESSON_TEAL_BUTTON, marginTop: 8, opacity: guess ? 1 : 0.5 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('See all four', '4 つを比べる')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="edns-table">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                <th style={cell}>{t('The café’s network can…', 'カフェのネットワークは…')}</th>
                {METHODS.map((method) => (
                  <th key={method} style={cell}>
                    {NAME[method]}
                    <div style={{ fontFamily: 'monospace', fontWeight: 400 }}>
                      {`${TRANSPORT[method].proto.toUpperCase()} ${TRANSPORT[method].port} · RFC ${TRANSPORT[method].rfc}`}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {abilities.map(([ability, en, ja]) => (
                <tr key={ability}>
                  <td style={cell}>{t(en, ja)}</td>
                  {METHODS.map((method) => {
                    const can = networkCan(method)[ability];
                    return (
                      <td
                        key={method}
                        data-testid={`edns-${method}-${ability}`}
                        data-can={String(can)}
                        style={{ ...cell, fontWeight: can ? 700 : 400 }}
                      >
                        {can ? t('✓ can', '✓ できる') : t('✕ cannot', '✕ できない')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="edns-limits">
          <div style={LESSON_LABEL}>
            {t('What encryption does not change', '暗号化しても変わらないこと')}
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
            <li>
              {t(
                'The resolver still reads every name: encryption moves your trust from the local network to the resolver you chose.',
                'リゾルバはやはりすべての名前を読みます。暗号化は、信頼する相手を手元のネットワークから、自分で選んだリゾルバへ移すだけです。',
              )}
            </li>
            <li>
              {t(
                `The network still sees that you talk to ${RESOLVER}, and then the address you connect to — and the name itself in TLS’s ClientHello, unless ECH hides it.`,
                `ネットワークには、${RESOLVER} と通信していることと、そのあとの接続先のアドレスが見えます。ECH で隠さない限り、TLS の ClientHello に名前そのものも見えます。`,
              )}
            </li>
            <li>
              {t(
                'Companies that filter by DNS lose that view when devices use DoH to an outside resolver, so managed devices are usually told which resolver to use.',
                'DNS で通信を絞っている会社は、端末が外のリゾルバに DoH で問い合わせると、それが見えなくなります。そのため、管理された端末にはふつう、使うリゾルバが指定されます。',
              )}
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function EncryptedDnsDemo() {
  return (
    <DemoShell
      title="Encrypted DNS"
      desc="DNS, DoT, DoH and DoQ: what the local network can read, change and block"
    >
      <EncryptedDnsLesson />
    </DemoShell>
  );
}
