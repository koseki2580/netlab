import { useState } from 'react';
import { useT } from '../localeContext';

/**
 * The first thing the subnetting page asks, before any arithmetic.
 *
 * The drill opened with "/19 — first usable host?", and every learner in a
 * trial with no binary behind them scored zero and learned nothing; the one
 * idea the beginner path needs from this page — two addresses are on the same
 * network when their network part matches — was never said plainly. This shows
 * it: each address is printed large with its network part bold and underlined,
 * and the learner compares the bold parts four times.
 */
interface Pair {
  readonly a: string;
  readonly b: string;
  readonly same: boolean;
  readonly why: { readonly en: string; readonly ja: string };
}

const PAIRS: readonly Pair[] = [
  {
    a: '10.1.5.7/24',
    b: '10.1.5.99/24',
    same: true,
    why: {
      en: '/24: the first three numbers are the network. Both are 10.1.5 — same network; 7 and 99 are two machines on it.',
      ja: '/24 なので最初の 3 つの数がネットワークです。どちらも 10.1.5 なので同じネットワークで、7 と 99 はその中の 2 台です。',
    },
  },
  {
    a: '10.1.5.7/24',
    b: '10.1.6.7/24',
    same: false,
    why: {
      en: 'The third number differs — 10.1.5 against 10.1.6 — so these are two networks, even though the last numbers match.',
      ja: '3 つ目の数が違います（10.1.5 と 10.1.6）。最後の数が同じでも、別々のネットワークです。',
    },
  },
  {
    a: '172.16.0.5/16',
    b: '172.16.200.9/16',
    same: true,
    why: {
      en: '/16: only the first two numbers are the network. Both are 172.16 — same network.',
      ja: '/16 なので、ネットワークは最初の 2 つの数だけです。どちらも 172.16 なので同じネットワークです。',
    },
  },
  {
    a: '192.168.0.1/24',
    b: '192.168.10.1/24',
    same: false,
    why: {
      en: '192.168.0 against 192.168.10: the third number differs, so they are on different networks.',
      ja: '192.168.0 と 192.168.10 で、3 つ目の数が違います。別のネットワークです。',
    },
  },
];

/**
 * An address cut where its network part ends: "10.1.5.7/24" is the network
 * "10.1.5", the machine ".7" and the mark "/24". Only /8, /16 and /24 are
 * shown here, so the cut always falls between two numbers.
 */
export function splitAddress(cidr: string): { network: string; device: string; prefix: string } {
  const [address = '', length = '24'] = cidr.split('/');
  const numbers = address.split('.');
  const networkNumbers = Math.floor(Number(length) / 8);
  return {
    network: numbers.slice(0, networkNumbers).join('.'),
    device: `.${numbers.slice(networkNumbers).join('.')}`,
    prefix: `/${length}`,
  };
}

const CARD: React.CSSProperties = {
  background: 'var(--netlab-bg-panel)',
  border: '1px solid var(--netlab-border)',
  borderRadius: 10,
  padding: 16,
  color: 'var(--netlab-text-primary)',
  lineHeight: 1.7,
  maxWidth: 760,
};

const CHOICE: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 6,
  border: '2px solid var(--netlab-border)',
  background: 'var(--netlab-bg-surface)',
  color: 'var(--netlab-text-primary)',
  cursor: 'pointer',
  fontSize: 15,
};

// The pressed choice stays marked: a filled dot, a heavier border and bold
// type, so what was chosen can be read without telling two greys apart.
const CHOSEN: React.CSSProperties = {
  ...CHOICE,
  border: '2px solid var(--netlab-accent-blue)',
  background: 'color-mix(in srgb, var(--netlab-accent-blue) 22%, var(--netlab-bg-surface))',
  fontWeight: 700,
};

/** One address, large, with the network part bold and underlined. */
function Address({ cidr, testId }: { cidr: string; testId: string }) {
  const { network, device, prefix } = splitAddress(cidr);
  return (
    <span
      data-testid={testId}
      style={{ fontFamily: 'monospace', fontSize: 22, whiteSpace: 'nowrap' }}
    >
      <strong
        data-part="network"
        style={{ fontWeight: 800, textDecoration: 'underline', textUnderlineOffset: 4 }}
      >
        {network}
      </strong>
      <span data-part="device" style={{ fontWeight: 400, opacity: 0.65 }}>
        {device}
      </span>
      <span style={{ fontSize: 13, opacity: 0.65, marginLeft: 4 }}>{prefix}</span>
    </span>
  );
}

export function SubnetStarter() {
  const t = useT();
  const [picked, setPicked] = useState<Record<number, boolean>>({});

  return (
    <section data-testid="subnet-starter" style={CARD}>
      <h2 style={{ margin: 0, fontSize: 18 }}>
        {t('Start here: same network or not?', 'まずはここから：同じネットワーク？')}
      </h2>
      <p
        data-testid="lesson-lead"
        style={{ margin: '8px 0 4px', fontSize: 17, fontWeight: 700, lineHeight: 1.6 }}
      >
        {t(
          'If the bold numbers match, the two are on the same network.',
          '太字の数字が同じなら、同じネットワークです。',
        )}
      </p>
      <p
        style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--netlab-text-secondary)' }}
        data-testid="subnet-starter-rule"
      >
        {t(
          'The bold, underlined part is the network. The lighter part after it is the number of one machine on that network. The mark /24 (mask 255.255.255.0) means "the first three numbers are the network"; /16 means the first two.',
          '太字で下線のついた部分がネットワークです。そのあとのうすい字は、その中の機器 1 台の番号です。/24（マスク 255.255.255.0）は「最初の 3 つの数がネットワーク」という印です。/16 なら最初の 2 つです。',
        )}
      </p>
      <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 16 }}>
        {PAIRS.map((pair, index) => {
          const answer = picked[index];
          const answered = answer !== undefined;
          const right = answered && answer === pair.same;
          const question = `subnet-starter-q${index + 1}`;
          return (
            <li key={`${pair.a}-${pair.b}`} data-testid={question}>
              <div
                style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0 12px' }}
              >
                <Address cidr={pair.a} testId={`${question}-a`} />
                <span>{t('and', 'と')}</span>
                <Address cidr={pair.b} testId={`${question}-b`} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  data-testid={`${question}-same`}
                  aria-pressed={answer === true}
                  onClick={() => setPicked((current) => ({ ...current, [index]: true }))}
                  style={answer === true ? CHOSEN : CHOICE}
                >
                  {answer === true ? '● ' : '○ '}
                  {t('Same network', '同じネットワーク')}
                </button>
                <button
                  type="button"
                  data-testid={`${question}-different`}
                  aria-pressed={answer === false}
                  onClick={() => setPicked((current) => ({ ...current, [index]: false }))}
                  style={answer === false ? CHOSEN : CHOICE}
                >
                  {answer === false ? '● ' : '○ '}
                  {t('Different networks', '別のネットワーク')}
                </button>
              </div>
              {answered ? (
                <p
                  data-testid={`${question}-feedback`}
                  data-correct={right ? 'yes' : 'no'}
                  style={{
                    margin: '6px 0 0',
                    fontSize: 15,
                    color: right ? 'var(--netlab-accent-green)' : 'var(--netlab-accent-orange)',
                  }}
                >
                  <strong>
                    {right ? t('Right. ', '正解。') : t('Not quite. ', 'ちがいます。')}
                  </strong>
                  {t(pair.why.en, pair.why.ja)}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p style={{ margin: '12px 0 0', color: 'var(--netlab-text-secondary)' }}>
        {t(
          'The practice below goes further — first and last addresses, how many machines fit. It is optional for the beginner path.',
          '下の練習問題は、最初と最後のアドレスや入る台数など、さらに先の計算です。入門の学習パスでは、ここまでで十分です。',
        )}
      </p>
    </section>
  );
}
