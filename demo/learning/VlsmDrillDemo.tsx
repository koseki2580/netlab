import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ipToInt } from '../../src/utils/cidr';
import {
  LESSON_BUTTON,
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useGalleryLocale, useT } from '../localeContext';
import {
  checkPlan,
  generateVlsm,
  largestFirstPlan,
  usableHosts,
  type Allocation,
  type RowProblem,
  type RowResult,
} from './vlsm';

const PREFIXES = [22, 23, 24, 25, 26, 27, 28, 29, 30];
const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

interface Row {
  network: string;
  prefix: string;
}

const PROBLEM_WORDS: Record<RowProblem, readonly [string, string]> = {
  unreadable: [
    'Type an address like 192.168.10.0 and choose a /number.',
    '192.168.10.0 のようなアドレスを入れ、/数字を選んでください。',
  ],
  'too-small': [
    'Too small: this /number does not hold that many hosts.',
    '小さすぎます。この /数字では、そのホスト数が入りません。',
  ],
  wasteful: [
    'Too big: a longer /number still holds them. VLSM gives each just what it needs.',
    '大きすぎます。もっと大きい /数字でも入ります。VLSM では必要なだけを割り当てます。',
  ],
  'not-a-network': [
    'Not where a subnet of this size can start: its first address must be a multiple of its size.',
    'この大きさのサブネットはここからは始められません。最初のアドレスはサイズの倍数になります。',
  ],
  'outside-block': ['Outside the block you were given.', '与えられたブロックの外です。'],
  overlaps: ['Overlaps another department’s subnet.', 'ほかの部署のサブネットと重なっています。'],
};

/** The block as a bar, each department's subnet a coloured stretch of it. */
function BlockBar({
  blockStart,
  plan,
}: {
  blockStart: number;
  plan: readonly (Allocation | null)[];
}) {
  const t = useT();
  return (
    <div
      role="img"
      aria-label={t('Where each subnet lies in the block', 'ブロックの中での各サブネットの位置')}
      style={{
        position: 'relative',
        height: 28,
        borderRadius: 6,
        background: 'var(--netlab-bg-surface)',
        overflow: 'hidden',
      }}
    >
      {plan.map((allocation, index) => {
        if (!allocation || !/^\d+\.\d+\.\d+\.\d+$/.test(allocation.network)) return null;
        const offset = (ipToInt(allocation.network) >>> 0) - blockStart;
        const width = 2 ** (32 - allocation.prefix);
        if (offset < 0 || offset >= 256) return null;
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: `${(offset / 256) * 100}%`,
              width: `${(Math.min(width, 256 - offset) / 256) * 100}%`,
              top: 0,
              bottom: 0,
              background: COLORS[index % COLORS.length],
              opacity: 0.8,
              borderRight: '1px solid var(--netlab-bg-primary)',
            }}
          />
        );
      })}
    </div>
  );
}

/** The drill, inside DemoShell so it reads the page's language. */
function VlsmDrill() {
  const t = useT();
  const locale = useGalleryLocale();
  const search = useLocation().search;
  const [seed, setSeed] = useState(
    () => Number(new URLSearchParams(search).get('seed')) || Date.now() % 100000,
  );
  const problem = useMemo(() => generateVlsm(seed), [seed]);
  const [rows, setRows] = useState<Row[]>(() =>
    problem.departments.map(() => ({ network: '', prefix: '' })),
  );
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [shown, setShown] = useState(false);

  const plan = rows.map((row): Allocation | null =>
    row.network && row.prefix ? { network: row.network.trim(), prefix: Number(row.prefix) } : null,
  );
  const reference = useMemo(() => largestFirstPlan(problem), [problem]);
  const blockStart = ipToInt(problem.block.network) >>> 0;
  const allOk = results?.every((row) => row.ok) ?? false;

  const next = () => {
    const nextSeed = (seed * 7919 + 13) % 100000 || 1;
    setSeed(nextSeed);
    setRows(generateVlsm(nextSeed).departments.map(() => ({ network: '', prefix: '' })));
    setResults(null);
    setShown(false);
  };

  return (
    <>
      <div
        style={{
          maxWidth: 760,
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
          <div style={LESSON_LABEL}>{t('The task', '課題')}</div>
          <p data-testid="vlsm-block" style={{ margin: 0, lineHeight: 1.7 }}>
            {t('Give each department a subnet of ', '次の部署それぞれに、')}
            <code>{`${problem.block.network}/${problem.block.prefix}`}</code>
            {t(
              ': big enough for its hosts, no bigger than it needs, starting where a subnet of its size can, and overlapping no other.',
              ' の中からサブネットを割り当ててください。ホストが入り、必要以上に大きくなく、その大きさのサブネットが始められる位置から始まり、ほかと重ならないこと。',
            )}
          </p>
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: 'pointer' }}>{t('How to think about it', '考え方')}</summary>
            <p
              style={{ margin: '6px 0 0', lineHeight: 1.7, color: 'var(--netlab-text-secondary)' }}
            >
              {t(
                'A /n subnet holds 2^(32−n) − 2 hosts (the first address is the network, the last the broadcast): /26 holds 62, /27 30, /28 14, /29 6, /30 2. Start with the largest department, so every subnet starts on a multiple of its size.',
                '/n のサブネットには 2^(32−n) − 2 台が入ります（最初はネットワーク、最後はブロードキャストのアドレス）。/26 は 62、/27 は 30、/28 は 14、/29 は 6、/30 は 2 です。大きい部署から順に割り当てると、どのサブネットもサイズの倍数の位置から始められます。',
              )}
            </p>
          </details>
        </div>

        <div style={LESSON_CARD}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)', fontSize: 13 }}
              >
                <th style={{ padding: 4 }}>{t('Department', '部署')}</th>
                <th style={{ padding: 4 }}>{t('Hosts', 'ホスト数')}</th>
                <th style={{ padding: 4 }}>{t('Network address', 'ネットワークアドレス')}</th>
                <th style={{ padding: 4 }}>/</th>
              </tr>
            </thead>
            <tbody>
              {problem.departments.map((department, index) => {
                const result = results?.[index];
                return (
                  <tr
                    key={index}
                    data-testid={`vlsm-row-${index}`}
                    data-ok={result ? String(result.ok) : ''}
                  >
                    <td style={{ padding: 4 }}>
                      <span
                        aria-hidden
                        style={{
                          display: 'inline-block',
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: COLORS[index % COLORS.length],
                          marginRight: 6,
                        }}
                      />
                      {department.name[locale]}
                    </td>
                    <td style={{ padding: 4 }}>{department.hosts}</td>
                    <td style={{ padding: 4 }}>
                      <input
                        data-testid={`vlsm-network-${index}`}
                        aria-label={t(
                          `${department.name.en}: network address`,
                          `${department.name.ja}：ネットワークアドレス`,
                        )}
                        value={rows[index]?.network ?? ''}
                        inputMode="decimal"
                        onChange={(event) => {
                          const value = event.target.value;
                          setRows((previous) =>
                            previous.map((row, i) =>
                              i === index ? { ...row, network: value } : row,
                            ),
                          );
                          setResults(null);
                        }}
                        style={{
                          minHeight: 44,
                          width: '100%',
                          maxWidth: 170,
                          fontFamily: 'monospace',
                          fontSize: 15,
                        }}
                      />
                    </td>
                    <td style={{ padding: 4 }}>
                      <select
                        data-testid={`vlsm-prefix-${index}`}
                        aria-label={t(
                          `${department.name.en}: /number`,
                          `${department.name.ja}：/数字`,
                        )}
                        value={rows[index]?.prefix ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          setRows((previous) =>
                            previous.map((row, i) =>
                              i === index ? { ...row, prefix: value } : row,
                            ),
                          );
                          setResults(null);
                        }}
                        style={{ minHeight: 44, fontSize: 15 }}
                      >
                        <option value="">—</option>
                        {PREFIXES.map((prefix) => (
                          <option key={prefix} value={prefix}>
                            {`/${prefix} (${usableHosts(prefix)})`}
                          </option>
                        ))}
                      </select>
                      {result && !result.ok ? (
                        <div
                          data-testid={`vlsm-why-${index}`}
                          style={{ color: 'var(--netlab-accent-red)', fontSize: 13, marginTop: 4 }}
                        >
                          {result.problems
                            .map((problem) => PROBLEM_WORDS[problem][locale === 'ja' ? 1 : 0])
                            .join(' ')}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ marginTop: 10 }}>
            <BlockBar blockStart={blockStart} plan={plan} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              data-testid="vlsm-check"
              style={LESSON_TEAL_BUTTON}
              onClick={() => setResults(checkPlan(problem, plan))}
            >
              {t('Check', 'たしかめる')}
            </button>
            <button type="button" data-testid="vlsm-next" style={LESSON_BUTTON} onClick={next}>
              {t('Next problem', '次の問題')}
            </button>
          </div>
          {results ? (
            <p
              data-testid="vlsm-verdict"
              role="status"
              data-ok={String(allOk)}
              style={{ margin: '10px 0 0', fontWeight: 700 }}
            >
              {allOk
                ? t('Every subnet follows the rules.', 'すべてのサブネットが規則を満たしています。')
                : t(
                    'Some subnets break a rule: see the notes beside them.',
                    '規則に合わないサブネットがあります。横の説明を見てください。',
                  )}
            </p>
          ) : null}
        </div>

        {results ? (
          <div style={LESSON_CARD}>
            <button
              type="button"
              data-testid="vlsm-show"
              style={LESSON_BUTTON}
              onClick={() => setShown((value) => !value)}
            >
              {shown
                ? t('Hide one solution', '解答例を隠す')
                : t('Show one solution', '解答例を見る')}
            </button>
            {shown ? (
              <ul
                data-testid="vlsm-solution"
                style={{
                  margin: '8px 0 0',
                  paddingLeft: 20,
                  fontFamily: 'monospace',
                  lineHeight: 1.8,
                }}
              >
                {problem.departments.map((department, index) => (
                  <li
                    key={index}
                  >{`${department.name[locale]}: ${reference[index]?.network}/${reference[index]?.prefix}`}</li>
                ))}
                <li
                  style={{
                    listStyle: 'none',
                    fontFamily: 'inherit',
                    color: 'var(--netlab-text-secondary)',
                  }}
                >
                  {t(
                    'Largest first, each packed after the last. Other answers that follow the rules pass too.',
                    '大きい部署から順に、すき間なく詰めた例です。規則を満たせば、ほかの答えも正解です。',
                  )}
                </li>
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

export default function VlsmDrillDemo() {
  return (
    <DemoShell
      title="VLSM: subnets of different sizes"
      desc="Carve one block into subnets that each fit their department, with nothing wasted"
    >
      <VlsmDrill />
    </DemoShell>
  );
}
