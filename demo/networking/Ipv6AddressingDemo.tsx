import { useState } from 'react';
import { LessonChallenges } from '../components/LessonChallenges';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  LESSON_TEAL_BUTTON_DISABLED,
  lessonChoice,
  predictionMark,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  DELEGATED,
  KIND_PREFIXES,
  classify,
  compress,
  expand,
  lanPrefix,
  parseIpv6,
  subnetCount,
  type AddressKind,
} from './ipv6Addressing';
import { ipv6AddressingChallenges } from './ipv6AddressingChallenges';

/** REQ-430 — the lesson page. Every address and count shown is computed by ipv6Addressing.ts. */

const ASKED = '2001:0db8:0000:0000:0001:0000:0000:0001';

/** The spellings offered for ASKED; the model decides which one is canonical. */
const SPELLINGS = {
  first: '2001:db8::1:0:0:1',
  last: '2001:db8:0:0:1::1',
  both: '2001:db8::1::1',
  none: '2001:db8:0:0:1:0:0:1',
} as const;
type Spelling = keyof typeof SPELLINGS;
const SPELLING_IDS = Object.keys(SPELLINGS) as Spelling[];

/** The prefixes offered for the 4th LAN; the model prints the right one. */
const LAN_OPTIONS = {
  s5603: '2001:db8:1234:5603::/64',
  s5604: '2001:db8:1234:5604::/64',
  s5630: '2001:db8:1234:5630::/64',
  h3: '2001:db8:1234:5600:3::/64',
} as const;
type LanOption = keyof typeof LAN_OPTIONS;
const LAN_IDS = Object.keys(LAN_OPTIONS) as LanOption[];
const ASKED_LAN = 4;

const DELEGATIONS = {
  48: '2001:db8:1234::/48',
  56: DELEGATED,
  60: '2001:db8:1234:5670::/60',
} as const;
type DelegatedLength = keyof typeof DELEGATIONS;
const LENGTHS: readonly DelegatedLength[] = [48, 56, 60];

const EXAMPLES = [
  '2400:1::1',
  'fe80::1a2b:3cff:fe4d:5e6f',
  'fd12:3456:789a:1::1',
  'ff02::1',
  '2001:db8::1',
  '::1',
] as const;

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

const NIBBLE_W = 30;

/** The upper 64 bits of a LAN prefix, nibble by nibble, coloured by who chose them. */
function PrefixBits({ prefix, delegatedLength }: { prefix: string; delegatedLength: number }) {
  const t = useT();
  const digits = expand(parseIpv6(prefix.split('/')[0]!)!)
    .replace(/:/g, '')
    .slice(0, 16);
  const width = 16 * NIBBLE_W + 15 * 2;
  const xOf = (index: number) => index * NIBBLE_W + Math.floor(index / 4) * 8;
  const isp = delegatedLength / 4;
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        data-testid="ipv6a-pd-bits"
        viewBox={`0 0 ${width + 24} 78`}
        style={{ width: '100%', minWidth: 420 }}
        role="img"
        aria-label={t(
          `The first 64 bits of ${prefix}: ${delegatedLength} bits from the ISP, ${64 - delegatedLength} bits of subnet ID chosen by the router`,
          `${prefix} の先頭 64 ビット：ISP が決めた ${delegatedLength} ビットと、ルータが決めた ${64 - delegatedLength} ビットのサブネット ID`,
        )}
      >
        {Array.from(digits).map((digit, index) => (
          <g key={index}>
            <rect
              x={xOf(index)}
              y={4}
              width={NIBBLE_W - 2}
              height={32}
              rx={4}
              fill={index < isp ? 'var(--netlab-bg-elevated)' : 'var(--netlab-accent-cyan)'}
              stroke="var(--netlab-border-strong)"
            />
            <text
              x={xOf(index) + (NIBBLE_W - 2) / 2}
              y={26}
              textAnchor="middle"
              fontSize={16}
              fontFamily="monospace"
              fill={index < isp ? 'var(--netlab-text-primary)' : 'var(--netlab-bg-primary)'}
            >
              {digit}
            </text>
          </g>
        ))}
        <text x={0} y={58} fontSize={12} fill="var(--netlab-text-secondary)">
          {t(`ISP: /${delegatedLength}`, `ISP が決める：/${delegatedLength}`)}
        </text>
        <text x={width} y={58} textAnchor="end" fontSize={12} fill="var(--netlab-accent-cyan)">
          {t(
            `subnet ID: ${64 - delegatedLength} bits`,
            `サブネット ID：${64 - delegatedLength} ビット`,
          )}
        </text>
        <text x={0} y={74} fontSize={12} fill="var(--netlab-text-secondary)">
          {t('then 64 bits of interface ID', 'その後ろ 64 ビットはインターフェース ID')}
        </text>
      </svg>
    </div>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function Ipv6AddressingLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Spelling | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [typed, setTyped] = useState('fe80:0000:0000:0000:0abc:0000:0000:0001');
  const [lanGuess, setLanGuess] = useState<LanOption | null>(null);
  const [lanRevealed, setLanRevealed] = useState(false);
  const [length, setLength] = useState<DelegatedLength>(56);
  const [lan, setLan] = useState(ASKED_LAN);

  const truth = compress(ASKED)!;
  const truthId = SPELLING_IDS.find((id) => SPELLINGS[id] === truth);
  const askedLan = lanPrefix(DELEGATED, ASKED_LAN)!;
  const subnetHex = (ASKED_LAN - 1).toString(16).padStart(2, '0');
  const lanTruth = LAN_IDS.find((id) => LAN_OPTIONS[id] === askedLan);
  const typedValue = parseIpv6(typed);
  const count = subnetCount(length, 64);
  const shownLan = Math.min(lan, count);
  const shownPrefix = lanPrefix(DELEGATIONS[length], shownLan)!;

  const kindName = (kind: AddressKind) =>
    ({
      unspecified: t('Unspecified', '未指定'),
      loopback: t('Loopback', 'ループバック'),
      documentation: t('Documentation (RFC 3849)', 'ドキュメント用（RFC 3849）'),
      global: t('Global unicast', 'グローバルユニキャスト'),
      'link-local': t('Link-local', 'リンクローカル'),
      ula: t('Unique local (ULA)', 'ユニークローカル（ULA）'),
      'ula-reserved': t('ULA, L bit 0 (not yet defined)', 'ULA の L ビット 0（未定義）'),
      multicast: t('Multicast', 'マルチキャスト'),
      other: t('Other or reserved', 'その他・予約'),
    })[kind];
  const kindReach = (kind: AddressKind) =>
    ({
      unspecified: t('Never a destination', '宛先にはならない'),
      loopback: t('This host only', '自分自身だけ'),
      documentation: t('Examples only, never routed', '例示専用、ルーティングされない'),
      global: t('The whole internet', 'インターネット全体'),
      'link-local': t(
        'This link only; routers never forward it',
        'そのリンクだけ（ルータは転送しない）',
      ),
      ula: t('Inside the site, not on the internet', 'サイトの中だけ（インターネットには出ない）'),
      'ula-reserved': t('Reserved by RFC 4193', 'RFC 4193 で予約'),
      multicast: t('A group; the scope is in the 4th digit', 'グループ宛て（範囲は 4 桁目）'),
      other: t('Not assigned for general use', '一般用途には割り当てられていない'),
    })[kind];

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
        <div style={LESSON_LABEL}>{t('Writing an IPv6 address', 'IPv6 アドレスの書き方')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'An IPv6 address is 128 bits, written as eight groups of four hex digits. Leading zeros in a group may be dropped, and a run of all-zero groups may be replaced by “::”. So one address can be spelled many ways, which makes logs and configs hard to search. RFC 5952 picks one spelling for every address.',
            'IPv6 アドレスは 128 ビットで、16 進 4 桁のグループ 8 つで書きます。グループの先頭の 0 は省略でき、0 だけのグループが続くところは「::」に置き換えられます。そのため 1 つのアドレスにいくつもの書き方があり、ログや設定を検索しにくくなります。RFC 5952 は、どのアドレスにも 1 つの書き方を決めています。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="ipv6a-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t('How does RFC 5952 write this address?', 'RFC 5952 ではこのアドレスをどう書く？')}
        </p>
        <p style={{ margin: '0 0 8px', fontFamily: 'monospace', overflowWrap: 'anywhere' }}>
          {ASKED}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {SPELLING_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={guess === id}
              data-testid={`ipv6a-guess-${id}`}
              disabled={revealed}
              onClick={() => setGuess(id)}
              style={{ ...lessonChoice(guess === id), textAlign: 'left' }}
            >
              {predictionMark(id, guess, truthId, revealed)}
              {SPELLINGS[id]}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="ipv6a-reveal"
            data-right={String(guess === truthId)}
            data-canonical={truth}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {guess === truthId
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `${truth}. RFC 5952 writes hex in lower case without leading zeros, and uses “::” for the longest run of two or more zero groups. Here two runs are equally long (two groups each), so the first one is compressed. “::” may appear only once — with two, nobody could tell how many zeros each one stands for — and an address written in full is valid but not canonical.`,
              `${truth} です。RFC 5952 では 16 進を小文字で、先頭の 0 を省いて書き、2 つ以上続く 0 のグループのうち最も長いところを「::」にします。ここでは 2 つの並び（どちらも 2 グループ）が同じ長さなので、前のほうを縮めます。「::」は 1 回しか使えません。2 回あると、それぞれがいくつの 0 を表すのか決まらないからです。省略せずに書いたものも正しいアドレスですが、正規の書き方ではありません。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="ipv6a-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Compress it', '縮めてみる')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="ipv6a-explorer">
          <div style={LESSON_LABEL}>{t('Try any address', 'アドレスを入れてみる')}</div>
          <label style={{ display: 'grid', gap: 4 }}>
            {t('IPv6 address', 'IPv6 アドレス')}
            <input
              type="text"
              value={typed}
              data-testid="ipv6a-input"
              spellCheck={false}
              autoCapitalize="off"
              onChange={(event) => setTyped(event.target.value)}
              style={{
                minHeight: 44,
                boxSizing: 'border-box',
                width: '100%',
                fontFamily: 'monospace',
                fontSize: 14,
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid var(--netlab-border-strong)',
                background: 'var(--netlab-bg-elevated)',
                color: 'var(--netlab-text-primary)',
              }}
            />
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                data-testid={`ipv6a-example-${example}`}
                onClick={() => setTyped(example)}
                style={lessonChoice(typed === example)}
              >
                {example}
              </button>
            ))}
          </div>
          <div
            data-testid="ipv6a-explore"
            data-valid={String(typedValue !== null)}
            data-canonical={typedValue === null ? '' : compress(typed)!}
            data-kind={typedValue === null ? '' : classify(typedValue)}
            style={{ overflowX: 'auto', marginTop: 8 }}
          >
            {typedValue === null ? (
              <p style={{ margin: 0, fontWeight: 700 }} role="status">
                {t(
                  'Not a valid IPv6 address (this lesson reads hex groups and :: only).',
                  '有効な IPv6 アドレスではありません（このレッスンは 16 進のグループと :: だけを読みます）。',
                )}
              </p>
            ) : (
              <table style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={cell}>{t('Canonical (RFC 5952)', '正規の書き方（RFC 5952）')}</td>
                    <td style={mono}>{compress(typed)}</td>
                  </tr>
                  <tr>
                    <td style={cell}>{t('In full', '省略なし')}</td>
                    <td style={mono}>{expand(typedValue)}</td>
                  </tr>
                  <tr>
                    <td style={cell}>{t('Kind', '種類')}</td>
                    <td style={cell}>{kindName(classify(typedValue))}</td>
                  </tr>
                  <tr>
                    <td style={cell}>{t('Reaches', '届く範囲')}</td>
                    <td style={cell}>{kindReach(classify(typedValue))}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Prefix', 'プレフィックス')}</th>
                  <th style={cell}>{t('Kind', '種類')}</th>
                  <th style={cell}>{t('Reaches', '届く範囲')}</th>
                </tr>
              </thead>
              <tbody>
                {KIND_PREFIXES.map(({ kind, prefix }) => (
                  <tr key={kind}>
                    <td style={mono}>{prefix}</td>
                    <td style={cell}>{kindName(kind)}</td>
                    <td style={cell}>{kindReach(kind)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Ranges from RFC 4291 (addressing architecture) and RFC 4193 (ULA: fc00::/7, of which only fd00::/8, with the L bit set, is in use; the next 40 bits should be random). 2001:db8::/32 sits inside 2000::/3 but is kept for examples. Every interface also has a link-local address, so a host usually has several addresses at once.',
              '範囲は RFC 4291（アドレス体系）と RFC 4193（ULA：fc00::/7 のうち、使われているのは L ビットが 1 の fd00::/8 だけで、続く 40 ビットは乱数にします）によります。2001:db8::/32 は 2000::/3 の中にありますが、例示用に取っておかれています。どのインターフェースにもリンクローカルアドレスがあるので、ホストはふつう同時にいくつものアドレスを持ちます。',
            )}
          </p>
        </div>
      ) : null}

      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>
          {t('Prefix delegation (DHCPv6 IA_PD)', 'プレフィックス委任（DHCPv6 の IA_PD）')}
        </div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `A home router asks its ISP for a prefix with DHCPv6 (RFC 8415, the IA_PD option) and is delegated ${DELEGATED}. Each LAN behind it needs its own /64, because SLAAC builds addresses from a 64-bit interface ID. The router numbers its LANs from subnet ID 0, so LAN 1 gets ${lanPrefix(DELEGATED, 1)}.`,
            `家庭のルータが DHCPv6（RFC 8415 の IA_PD オプション）で ISP にプレフィックスを求め、${DELEGATED} を委任されました。その後ろの LAN にはそれぞれ専用の /64 が要ります。SLAAC は 64 ビットのインターフェース ID からアドレスを作るからです。ルータは LAN をサブネット ID 0 から番号付けするので、LAN 1 は ${lanPrefix(DELEGATED, 1)} になります。`,
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="ipv6a-pd-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `Which prefix does LAN ${ASKED_LAN} get?`,
            `LAN ${ASKED_LAN} に割り当てられるプレフィックスは？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {LAN_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={lanGuess === id}
              data-testid={`ipv6a-pd-guess-${id}`}
              disabled={lanRevealed}
              onClick={() => setLanGuess(id)}
              style={{ ...lessonChoice(lanGuess === id), textAlign: 'left' }}
            >
              {predictionMark(id, lanGuess, lanTruth, lanRevealed)}
              {LAN_OPTIONS[id]}
            </button>
          ))}
        </div>
        {lanRevealed ? (
          <p
            data-testid="ipv6a-pd-reveal"
            data-right={String(lanGuess === lanTruth)}
            data-prefix={askedLan}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {lanGuess === lanTruth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `${askedLan}. A /56 leaves 64 − 56 = 8 bits for the subnet ID: the last two hex digits of the 4th group. LAN 1 is subnet ID 0, so LAN ${ASKED_LAN} is subnet ID ${ASKED_LAN - 1}, written ${subnetHex}. Those 8 bits give ${subnetCount(56, 64)} LANs, and the 64 bits after them are left for the hosts.`,
              `${askedLan} です。/56 ならサブネット ID に 64 − 56 = 8 ビット、つまり 4 つ目のグループの下 2 桁が残ります。LAN 1 がサブネット ID 0 なので、LAN ${ASKED_LAN} はサブネット ID ${ASKED_LAN - 1}、書くと ${subnetHex} です。この 8 ビットで ${subnetCount(56, 64)} 個の LAN が作れ、その後ろの 64 ビットはホストが使います。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="ipv6a-pd-reveal-button"
            disabled={!lanGuess}
            style={{
              ...(lanGuess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED),
              marginTop: 8,
            }}
            onClick={() => setLanRevealed(true)}
          >
            {lanGuess
              ? t('Carve the /64s', '/64 を切り出す')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {lanRevealed ? (
        <div style={LESSON_CARD} data-testid="ipv6a-pd-plan">
          <div style={LESSON_LABEL}>{t('Plan the LANs', 'LAN を割り当てる')}</div>
          <div
            role="tablist"
            aria-label={t('Delegated prefix length', '委任されるプレフィックス長')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {LENGTHS.map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={length === option}
                data-testid={`ipv6a-pd-length-${option}`}
                onClick={() => setLength(option)}
                style={lessonChoice(length === option)}
              >
                {`/${option}`}
              </button>
            ))}
          </div>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
            {t('LAN', 'LAN')}
            <input
              type="range"
              min={1}
              max={count}
              value={shownLan}
              data-testid="ipv6a-pd-lan"
              onChange={(event) => setLan(Number(event.target.value))}
              style={{ minHeight: 44, flex: 1, minWidth: 0 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{shownLan}</span>
          </label>
          <p
            data-testid="ipv6a-pd-result"
            data-prefix={shownPrefix}
            data-count={count}
            style={{ margin: '8px 0', fontWeight: 700, overflowWrap: 'anywhere' }}
          >
            {t(
              `Delegated ${DELEGATIONS[length]}: room for ${count.toLocaleString('en')} LANs. LAN ${shownLan} → ${shownPrefix}`,
              `委任 ${DELEGATIONS[length]}：LAN は ${count.toLocaleString('ja')} 個まで。LAN ${shownLan} → ${shownPrefix}`,
            )}
          </p>
          <PrefixBits prefix={shownPrefix} delegatedLength={length} />
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `How much to delegate is an operator’s choice: RFC 6177 leaves it to them but advises against giving a site a single /64. A /48 has ${subnetCount(48, 56)} /56s (${subnetCount(48, 64).toLocaleString('en')} /64s); many ISPs give homes a /56, some a /60 or /64. Counting LANs from subnet ID 0 is a common router habit, not a standard. Subnet IDs are hex, so LAN 11 is ${lanPrefix(DELEGATED, 11)}, not …:5610.`,
              `どれだけ委任するかは事業者が決めます。RFC 6177 はそれを事業者に任せつつ、サイトに /64 を 1 つだけ渡すことは勧めていません。/48 には /56 が ${subnetCount(48, 56)} 個（/64 なら ${subnetCount(48, 64).toLocaleString('ja')} 個）入ります。家庭に /56 を渡す ISP が多く、/60 や /64 のところもあります。LAN をサブネット ID 0 から数えるのはルータによくあるやり方で、標準ではありません。サブネット ID は 16 進なので、LAN 11 は …:5610 ではなく ${lanPrefix(DELEGATED, 11)} です。`,
            )}
          </p>
        </div>
      ) : null}

      {lanRevealed && (
        <LessonChallenges
          lessonId="ipv6-addressing"
          challenges={ipv6AddressingChallenges({ delegated: DELEGATIONS[length], lan: shownLan })}
        />
      )}
    </div>
  );
}

export default function Ipv6AddressingDemo() {
  return (
    <DemoShell
      title="IPv6 addresses and prefixes"
      desc="How an IPv6 address is written, what its first bits say about it, and how a delegated prefix is cut into LANs"
    >
      <Ipv6AddressingLesson />
    </DemoShell>
  );
}
