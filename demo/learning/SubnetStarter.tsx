import { useState } from 'react';
import { useT } from '../localeContext';

/**
 * The first thing the subnetting page asks, before any arithmetic.
 *
 * The drill opened with "/19 — first usable host?", and every learner in a
 * trial with no binary behind them scored zero and learned nothing; the one
 * idea the beginner path needs from this page — two addresses are on the same
 * network when their network part matches — was never said plainly. This says
 * it in one line, for /24 and /16, and lets the learner try it four times.
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
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid var(--netlab-border)',
  background: 'var(--netlab-bg-surface)',
  color: 'var(--netlab-text-primary)',
  cursor: 'pointer',
};

export function SubnetStarter() {
  const t = useT();
  const [picked, setPicked] = useState<Record<number, boolean>>({});

  return (
    <section data-testid="subnet-starter" style={CARD}>
      <h2 style={{ margin: 0, fontSize: 18 }}>
        {t('Start here: same network or not?', 'まずはここから：同じネットワーク？')}
      </h2>
      <p style={{ margin: '8px 0' }} data-testid="subnet-starter-rule">
        {t(
          'An address like 192.168.1.10/24 has two parts. The /24 (mask 255.255.255.0) says the first three numbers are the network and the last number is the machine. Two addresses are on the same network when their network part is the same. With /16, only the first two numbers are the network.',
          '192.168.1.10/24 のようなアドレスは 2 つの部分でできています。/24（マスク 255.255.255.0）は「最初の 3 つの数がネットワーク、最後の数が機器」という意味です。ネットワークの部分が同じなら、2 つのアドレスは同じネットワークにいます。/16 なら、ネットワークは最初の 2 つの数だけです。',
        )}
      </p>
      <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 12 }}>
        {PAIRS.map((pair, index) => {
          const answer = picked[index];
          const answered = answer !== undefined;
          const right = answered && answer === pair.same;
          return (
            <li key={`${pair.a}-${pair.b}`} data-testid={`subnet-starter-q${index + 1}`}>
              <div>
                <code>{pair.a}</code> {t('and', 'と')} <code>{pair.b}</code>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  data-testid={`subnet-starter-q${index + 1}-same`}
                  onClick={() => setPicked((current) => ({ ...current, [index]: true }))}
                  style={CHOICE}
                >
                  {t('Same network', '同じネットワーク')}
                </button>
                <button
                  type="button"
                  data-testid={`subnet-starter-q${index + 1}-different`}
                  onClick={() => setPicked((current) => ({ ...current, [index]: false }))}
                  style={CHOICE}
                >
                  {t('Different networks', '別のネットワーク')}
                </button>
              </div>
              {answered ? (
                <p
                  data-testid={`subnet-starter-q${index + 1}-feedback`}
                  data-correct={right ? 'yes' : 'no'}
                  style={{
                    margin: '4px 0 0',
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
