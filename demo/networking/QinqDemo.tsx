import { useState } from 'react';
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
  CUSTOMER_VLAN,
  ETH_HEADER_BYTES,
  FCS_BYTES,
  S_VLAN,
  TAG_BYTES,
  TPID,
  USABLE_VIDS,
  frameBytes,
  journey,
  maxPayload,
  vlanSpace,
  type CustomerId,
  type Mode,
  type Tag,
} from './qinq';

type SizeAnswer = 'same' | 'plus-tag' | 'plus-header';
const SIZE_ANSWERS: readonly SizeAnswer[] = ['same', 'plus-tag', 'plus-header'];
type WhoAnswer = 'own' | 'both' | 'dropped';
const WHO_ANSWERS: readonly WhoAnswer[] = ['own', 'both', 'dropped'];
type CountAnswer = 'one-space' | 'two-spaces' | 'product';
const COUNT_ANSWERS: readonly CountAnswer[] = ['one-space', 'two-spaces', 'product'];

const PAYLOAD = 1500;
const CORE_LIMITS = [1522, 1526] as const;

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };
const hex = (n: number) => `0x${n.toString(16).toUpperCase()}`;
const tagText = (tag: Tag) => `${tag.kind}-VLAN ${tag.vid} (${hex(tag.tpid)})`;

// The options' sizes: the frame unchanged, one more tag, or a whole new header and tag.
const SIZE_OF: Record<SizeAnswer, number> = {
  same: frameBytes(PAYLOAD, 1),
  'plus-tag': frameBytes(PAYLOAD, 2),
  'plus-header': frameBytes(PAYLOAD, 1) + ETH_HEADER_BYTES + TAG_BYTES,
};
const COUNT_OF: Record<CountAnswer, number> = {
  'one-space': vlanSpace(1),
  'two-spaces': 2 * vlanSpace(1),
  product: vlanSpace(2),
};

const NODES: Record<string, { x: number; y: number }> = {
  A1: { x: 30, y: 30 },
  B1: { x: 30, y: 100 },
  PE1: { x: 130, y: 65 },
  P: { x: 220, y: 65 },
  PE2: { x: 310, y: 65 },
  A2: { x: 410, y: 30 },
  B2: { x: 410, y: 100 },
};
const LINKS: readonly (readonly [string, string])[] = [
  ['A1', 'PE1'],
  ['B1', 'PE1'],
  ['PE1', 'P'],
  ['P', 'PE2'],
  ['PE2', 'A2'],
  ['PE2', 'B2'],
];

/** The provider network, with the links a frame crosses drawn bold. */
function Topology({ customer, mode }: { customer: CustomerId; mode: Mode }) {
  const t = useT();
  const trip = journey(customer, mode);
  const used = (a: string, b: string) => trip.hops.some((h) => h.from === a && h.to === b);
  return (
    <svg
      data-testid="qq-topology"
      viewBox="0 0 440 130"
      style={{ width: '100%', maxWidth: 560 }}
      role="img"
      aria-label={t(
        `A frame from ${customer}1 reaches ${trip.deliveredTo.join(' and ')}`,
        `${customer}1 からのフレームは ${trip.deliveredTo.join(' と ')} に届きます`,
      )}
    >
      {LINKS.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={NODES[a]!.x}
          y1={NODES[a]!.y}
          x2={NODES[b]!.x}
          y2={NODES[b]!.y}
          stroke={used(a, b) ? 'var(--netlab-accent-cyan)' : 'var(--netlab-border)'}
          strokeWidth={used(a, b) ? 4 : 1.5}
        />
      ))}
      {Object.entries(NODES).map(([name, { x, y }]) => (
        <g key={name}>
          <rect
            x={x - 26}
            y={y - 13}
            width={52}
            height={26}
            rx={5}
            fill="var(--netlab-bg-elevated)"
            stroke={
              trip.deliveredTo.includes(name)
                ? 'var(--netlab-accent-cyan)'
                : 'var(--netlab-border-strong)'
            }
            strokeWidth={trip.deliveredTo.includes(name) ? 3 : 1}
          />
          <text
            x={x}
            y={y + 5}
            textAnchor="middle"
            fontSize={13}
            fontFamily="monospace"
            fill="var(--netlab-text-primary)"
          >
            {name}
          </text>
        </g>
      ))}
      <text x={220} y={124} textAnchor="middle" fontSize={12} fill="var(--netlab-text-secondary)">
        {t('provider core', '事業者のコア')}
      </text>
    </svg>
  );
}

function Reveal({
  testId,
  right,
  data,
  children,
}: {
  testId: string;
  right: boolean;
  data?: Record<string, string | number>;
  children: React.ReactNode;
}) {
  const t = useT();
  const attrs = Object.fromEntries(
    Object.entries(data ?? {}).map(([key, value]) => [`data-${key}`, String(value)]),
  );
  return (
    <p
      data-testid={testId}
      data-right={String(right)}
      {...attrs}
      role="status"
      style={{ margin: '8px 0 0', lineHeight: 1.7 }}
    >
      <strong>
        {right
          ? t('As you predicted. ', '予想どおりです。')
          : t('Not what you predicted. ', '予想とちがいました。')}
      </strong>
      {children}
    </p>
  );
}

function RevealButton({
  testId,
  ready,
  label,
  onClick,
}: {
  testId: string;
  ready: boolean;
  label: string;
  onClick: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={!ready}
      style={{ ...(ready ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
      onClick={onClick}
    >
      {ready ? label : t('Predict first', '先に予想を選んでください')}
    </button>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function QinqLesson() {
  const t = useT();
  const [sizeGuess, setSizeGuess] = useState<SizeAnswer | null>(null);
  const [sizeRevealed, setSizeRevealed] = useState(false);
  const [payload, setPayload] = useState(PAYLOAD);
  const [coreLimit, setCoreLimit] = useState<number>(1526);
  const [whoGuess, setWhoGuess] = useState<WhoAnswer | null>(null);
  const [whoRevealed, setWhoRevealed] = useState(false);
  const [customer, setCustomer] = useState<CustomerId>('A');
  const [mode, setMode] = useState<Mode>('qinq');
  const [countGuess, setCountGuess] = useState<CountAnswer | null>(null);
  const [countRevealed, setCountRevealed] = useState(false);

  const asked = journey('A', 'qinq', PAYLOAD);
  const coreBytes = asked.hops[1]!.bytes;
  const sizeTruth = SIZE_ANSWERS.find((id) => SIZE_OF[id] === coreBytes);
  const askedWho = journey('A', 'qinq').deliveredTo;
  const whoTruth: WhoAnswer =
    askedWho.length === 0 ? 'dropped' : askedWho.length > 1 ? 'both' : 'own';
  const countTruth = COUNT_ANSWERS.find((id) => COUNT_OF[id] === vlanSpace(2));
  const mine = journey(customer, mode, payload);
  const shared = journey('A', 'shared-vlan');
  const fits = maxPayload(coreLimit, 2);

  const sizeName = (id: SizeAnswer) =>
    ({
      same: t(
        `${SIZE_OF.same} bytes: the size does not change`,
        `${SIZE_OF.same} バイト（変わらない）`,
      ),
      'plus-tag': t(`${SIZE_OF['plus-tag']} bytes`, `${SIZE_OF['plus-tag']} バイト`),
      'plus-header': t(`${SIZE_OF['plus-header']} bytes`, `${SIZE_OF['plus-header']} バイト`),
    })[id];
  const whoName = (id: WhoAnswer) =>
    ({
      own: t('Only customer A’s site 2 (A2)', '顧客 A の拠点 2（A2）だけ'),
      both: t('Both A2 and customer B’s site 2 (B2)', 'A2 と、顧客 B の拠点 2（B2）の両方'),
      dropped: t(
        'Neither: the provider drops it, as VLAN 10 is used twice',
        'どちらにも届かない（VLAN 10 が重複しているので事業者が捨てる）',
      ),
    })[id];
  const countName = (id: CountAnswer) =>
    ({
      'one-space': t(
        `${COUNT_OF['one-space'].toLocaleString('en')}`,
        `${COUNT_OF['one-space'].toLocaleString('ja')}`,
      ),
      'two-spaces': t(
        `${COUNT_OF['two-spaces'].toLocaleString('en')}`,
        `${COUNT_OF['two-spaces'].toLocaleString('ja')}`,
      ),
      product: t(
        `About ${(COUNT_OF.product / 1e6).toFixed(1)} million`,
        `約 ${Math.round(COUNT_OF.product / 1e4).toLocaleString('ja')} 万`,
      ),
    })[id];

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
        <div style={LESSON_LABEL}>
          {t('A provider carries customers’ VLANs', '事業者が顧客の VLAN を運ぶ')}
        </div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `Two companies, A and B, each have two sites and rent one Ethernet service from the same provider to join them. Each company tags its own traffic with 802.1Q, and both happen to use VLAN ${CUSTOMER_VLAN}. The provider does not control which VLAN IDs its customers use. With IEEE 802.1ad (“Q-in-Q”), the provider’s edge switch PE1 adds a tag of its own, the service tag (S-tag, TPID `,
            `A 社と B 社はそれぞれ 2 つの拠点を持ち、同じ事業者のイーサネットサービスでつないでいます。どちらの会社も自社の通信に 802.1Q のタグを付けていて、たまたま両社とも VLAN ${CUSTOMER_VLAN} を使っています。顧客がどの VLAN ID を使うかを事業者は決められません。IEEE 802.1ad（Q-in-Q）では、事業者のエッジスイッチ PE1 が自分のタグ、サービスタグ（S タグ、TPID `,
          )}
          <code>{hex(TPID.sTag)}</code>
          {t('), outside the customer’s tag (C-tag, TPID ', '）を、顧客のタグ（C タグ、TPID ')}
          <code>{hex(TPID.cTag)}</code>
          {t(
            `). The core switch P and the far edge PE2 forward by the S-tag. Here A gets S-VLAN ${S_VLAN.A} and B gets S-VLAN ${S_VLAN.B}.`,
            `）の外側に付けます。コアスイッチ P と反対側のエッジ PE2 は S タグを見て転送します。ここでは A 社に S-VLAN ${S_VLAN.A}、B 社に S-VLAN ${S_VLAN.B} を割り当てています。`,
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="qq-size">
        <div style={LESSON_LABEL}>
          {t('Predict first: the frame size', 'まず予想：フレームの大きさ')}
        </div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `Site A1 sends a frame carrying ${PAYLOAD} bytes of payload. Without a tag it would be ${frameBytes(PAYLOAD, 0)} bytes (${ETH_HEADER_BYTES}-byte header and ${FCS_BYTES}-byte FCS included); with A’s C-tag for VLAN ${CUSTOMER_VLAN} it is ${frameBytes(PAYLOAD, 1)} bytes as it reaches PE1. How big is it between PE1 and P?`,
            `拠点 A1 が ${PAYLOAD} バイトのペイロードを運ぶフレームを送ります。タグがなければ ${frameBytes(PAYLOAD, 0)} バイト（${ETH_HEADER_BYTES} バイトのヘッダと ${FCS_BYTES} バイトの FCS を含む）で、A 社の VLAN ${CUSTOMER_VLAN} の C タグ付きで PE1 に届くときは ${frameBytes(PAYLOAD, 1)} バイトです。PE1 と P の間では何バイト？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {SIZE_ANSWERS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={sizeGuess === id}
              data-testid={`qq-guess-${id}`}
              disabled={sizeRevealed}
              onClick={() => setSizeGuess(id)}
              style={{ ...lessonChoice(sizeGuess === id), textAlign: 'left' }}
            >
              {predictionMark(id, sizeGuess, sizeTruth, sizeRevealed)}
              {sizeName(id)}
            </button>
          ))}
        </div>
        {sizeRevealed ? (
          <Reveal testId="qq-reveal" right={sizeGuess === sizeTruth} data={{ bytes: coreBytes }}>
            {t(
              `${coreBytes} bytes. The S-tag is one more ${TAG_BYTES}-byte tag (${TAG_BYTES / 2} bytes of TPID, ${TAG_BYTES / 2} of priority, DEI and a 12-bit VLAN ID), slotted in after the source MAC address. There is no new Ethernet header: the customer’s MAC addresses stay where they are. PE2 removes the S-tag again, so A2 receives the ${frameBytes(PAYLOAD, 1)}-byte frame A1 sent.`,
              `${coreBytes} バイトです。S タグは ${TAG_BYTES} バイトのタグがもう 1 つ増えるだけで（TPID ${TAG_BYTES / 2} バイト、優先度・DEI・12 ビットの VLAN ID で ${TAG_BYTES / 2} バイト）、送信元 MAC アドレスの後ろに差し込まれます。イーサネットヘッダが新しく付くわけではなく、顧客の MAC アドレスはそのままです。PE2 が S タグを外すので、A2 は A1 が送ったとおりの ${frameBytes(PAYLOAD, 1)} バイトのフレームを受け取ります。`,
            )}
          </Reveal>
        ) : (
          <RevealButton
            testId="qq-reveal-button"
            ready={sizeGuess !== null}
            label={t('Follow the frame', 'フレームを追う')}
            onClick={() => setSizeRevealed(true)}
          />
        )}
      </div>

      {sizeRevealed ? (
        <div style={LESSON_CARD} data-testid="qq-hops">
          <div style={LESSON_LABEL}>{t('Hop by hop', '1 ホップずつ')}</div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              'A1’s frame here is addressed to A2 (unicast).',
              'ここでの A1 のフレームは A2 あて（ユニキャスト）です。',
            )}
          </p>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {t('Payload', 'ペイロード')}
            <input
              type="range"
              min={1000}
              max={1500}
              step={4}
              value={payload}
              data-testid="qq-payload"
              onChange={(event) => setPayload(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>
              {t(`${payload} bytes`, `${payload} バイト`)}
            </span>
          </label>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Hop', '区間')}</th>
                  <th style={cell}>{t('Tags, outermost first', 'タグ（外側から）')}</th>
                  <th style={cell}>{t('Frame', 'フレーム')}</th>
                </tr>
              </thead>
              <tbody>
                {journey('A', 'qinq', payload).hops.map((hop) => (
                  <tr
                    key={`${hop.from}-${hop.to}`}
                    data-testid={`qq-hop-${hop.from}-${hop.to}`}
                    data-bytes={hop.bytes}
                    data-tags={hop.tags.map((tag) => tag.kind + tag.vid).join('/')}
                  >
                    <td style={mono}>{`${hop.from} → ${hop.to}`}</td>
                    <td style={mono}>{hop.tags.map(tagText).join(' + ')}</td>
                    <td style={mono}>{t(`${hop.bytes} bytes`, `${hop.bytes} バイト`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '12px 0 6px', lineHeight: 1.7 }}>
            {t(
              'The largest frame the provider’s core switches accept:',
              '事業者のコアスイッチが受け付ける最大のフレーム：',
            )}
          </p>
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CORE_LIMITS.map((limit) => (
              <button
                key={limit}
                type="button"
                role="tab"
                aria-selected={coreLimit === limit}
                data-testid={`qq-core-${limit}`}
                onClick={() => setCoreLimit(limit)}
                style={lessonChoice(coreLimit === limit)}
              >
                {t(`${limit} bytes`, `${limit} バイト`)}
              </button>
            ))}
          </div>
          <p
            data-testid="qq-fit"
            data-max-payload={fits}
            style={{ margin: '8px 0 0', fontWeight: 700, lineHeight: 1.7 }}
          >
            {fits >= PAYLOAD
              ? t(
                  `A double-tagged frame can carry up to ${fits} bytes: the customer keeps its full ${PAYLOAD}-byte MTU.`,
                  `二重タグのフレームで最大 ${fits} バイト運べます。顧客は ${PAYLOAD} バイトの MTU をそのまま使えます。`,
                )
              : t(
                  `A double-tagged frame can carry only ${fits} bytes: the customer’s ${PAYLOAD}-byte packets no longer fit, unless it lowers its MTU to ${fits}.`,
                  `二重タグのフレームでは ${fits} バイトしか運べません。顧客が MTU を ${fits} に下げない限り、${PAYLOAD} バイトのパケットは入りません。`,
                )}
          </p>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 13,
              color: 'var(--netlab-text-secondary)',
              lineHeight: 1.7,
            }}
          >
            {t(
              'That is why providers raise the frame size on their core links (often far above 1526 bytes, to leave room for more tags or MPLS labels). The sizes here leave out the preamble and the gap between frames.',
              'そのため事業者はコアのリンクで扱えるフレームの大きさを引き上げます（タグや MPLS ラベルが増えても入るよう、1526 バイトよりずっと大きくすることもよくあります）。ここでの大きさにはプリアンブルとフレーム間の空きは含めていません。',
            )}
          </p>
        </div>
      ) : null}

      <div style={LESSON_CARD} data-testid="qq-who">
        <div style={LESSON_LABEL}>
          {t('Predict: two customers, one VLAN ID', '予想：同じ VLAN ID の 2 社')}
        </div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `A1 sends a broadcast in its VLAN ${CUSTOMER_VLAN}. B’s sites also use VLAN ${CUSTOMER_VLAN}. PE1 tags A’s traffic with S-VLAN ${S_VLAN.A} and B’s with S-VLAN ${S_VLAN.B}. At the far side, which sites receive the broadcast?`,
            `A1 が自社の VLAN ${CUSTOMER_VLAN} にブロードキャストを送ります。B 社の拠点も VLAN ${CUSTOMER_VLAN} を使っています。PE1 は A 社の通信に S-VLAN ${S_VLAN.A}、B 社の通信に S-VLAN ${S_VLAN.B} を付けます。反対側でブロードキャストを受け取るのはどの拠点？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {WHO_ANSWERS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={whoGuess === id}
              data-testid={`qq-who-guess-${id}`}
              disabled={whoRevealed}
              onClick={() => setWhoGuess(id)}
              style={{ ...lessonChoice(whoGuess === id), textAlign: 'left' }}
            >
              {predictionMark(id, whoGuess, whoTruth, whoRevealed)}
              {whoName(id)}
            </button>
          ))}
        </div>
        {whoRevealed ? (
          <>
            <Reveal
              testId="qq-who-reveal"
              right={whoGuess === whoTruth}
              data={{ delivered: askedWho.join(',') }}
            >
              {t(
                `Only ${askedWho.join(', ')}. In the core the frame is in S-VLAN ${S_VLAN.A}; the provider’s switches look only at that outer tag, and only A’s ports belong to S-VLAN ${S_VLAN.A}. The C-VLAN ${CUSTOMER_VLAN} inside is just data to them, so the same ID in another customer’s traffic does not matter. If the provider instead trunked VLAN ${CUSTOMER_VLAN} through as it is, the broadcast would reach ${shared.deliveredTo.join(' and ')}: try it below.`,
                `${askedWho.join('、')} だけです。コアの中でこのフレームは S-VLAN ${S_VLAN.A} にいます。事業者のスイッチは外側のタグだけを見ていて、S-VLAN ${S_VLAN.A} に属するのは A 社のポートだけです。内側の C-VLAN ${CUSTOMER_VLAN} は事業者にとってただのデータなので、ほかの顧客が同じ ID を使っていても関係ありません。もし事業者が VLAN ${CUSTOMER_VLAN} をそのまま通していたら、ブロードキャストは ${shared.deliveredTo.join(' と ')} に届きます。下で試してください。`,
              )}
            </Reveal>
            <div
              role="tablist"
              style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}
            >
              {(['qinq', 'shared-vlan'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={mode === id}
                  data-testid={`qq-mode-${id}`}
                  onClick={() => setMode(id)}
                  style={lessonChoice(mode === id)}
                >
                  {id === 'qinq'
                    ? t('Q-in-Q (S-tag per customer)', 'Q-in-Q（顧客ごとの S タグ）')
                    : t(`One shared VLAN ${CUSTOMER_VLAN}`, `共通の VLAN ${CUSTOMER_VLAN} 1 つ`)}
                </button>
              ))}
            </div>
            <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {(['A', 'B'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={customer === id}
                  data-testid={`qq-customer-${id}`}
                  onClick={() => setCustomer(id)}
                  style={lessonChoice(customer === id)}
                >
                  {t(`Sent from ${id}1`, `${id}1 から送る`)}
                </button>
              ))}
            </div>
            <Topology customer={customer} mode={mode} />
            <p
              data-testid="qq-delivered"
              data-delivered={mine.deliveredTo.join(',')}
              data-core-tags={mine.hops[1]!.tags.map((tag) => tag.kind + tag.vid).join('/')}
              style={{ margin: '4px 0 0', fontWeight: 700, lineHeight: 1.7 }}
            >
              {t(
                `In the core: ${mine.hops[1]!.tags.map(tagText).join(' + ')}. Delivered to ${mine.deliveredTo.join(' and ')}.`,
                `コアでは ${mine.hops[1]!.tags.map(tagText).join(' + ')}。届く先は ${mine.deliveredTo.join(' と ')}。`,
              )}
            </p>
          </>
        ) : (
          <RevealButton
            testId="qq-who-reveal-button"
            ready={whoGuess !== null}
            label={t('Send the broadcast', 'ブロードキャストを送る')}
            onClick={() => setWhoRevealed(true)}
          />
        )}
      </div>

      <div style={LESSON_CARD} data-testid="qq-count">
        <div style={LESSON_LABEL}>{t('Predict: how many VLANs', '予想：VLAN はいくつ')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `A VLAN ID is 12 bits, and IDs 0 and 4095 are reserved, so one tag offers ${USABLE_VIDS.toLocaleString('en')} VLANs. The provider gives each customer its own S-VLAN, and each customer may use every C-VLAN ID inside it. Counting every customer’s VLANs together, how many can one provider core carry at most?`,
            `VLAN ID は 12 ビットで、0 と 4095 は予約されているので、タグ 1 つで使える VLAN は ${USABLE_VIDS.toLocaleString('ja')} 個です。事業者は顧客ごとに S-VLAN を 1 つ割り当て、顧客はその中で C-VLAN の ID をすべて使えます。全顧客の VLAN を合計すると、1 つの事業者のコアで最大いくつ運べる？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {COUNT_ANSWERS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={countGuess === id}
              data-testid={`qq-count-guess-${id}`}
              disabled={countRevealed}
              onClick={() => setCountGuess(id)}
              style={{ ...lessonChoice(countGuess === id), textAlign: 'left' }}
            >
              {predictionMark(id, countGuess, countTruth, countRevealed)}
              {countName(id)}
            </button>
          ))}
        </div>
        {countRevealed ? (
          <Reveal
            testId="qq-count-reveal"
            right={countGuess === countTruth}
            data={{ count: vlanSpace(2) }}
          >
            {t(
              `${USABLE_VIDS.toLocaleString('en')} × ${USABLE_VIDS.toLocaleString('en')} = ${vlanSpace(2).toLocaleString('en')}. Each of the ${USABLE_VIDS.toLocaleString('en')} S-VLANs holds a full set of ${USABLE_VIDS.toLocaleString('en')} C-VLANs. But look at what is still limited: one S-VLAN per customer means at most ${USABLE_VIDS.toLocaleString('en')} customers, and every core switch still learns every customer’s MAC addresses. Larger providers moved to IEEE 802.1ah (provider backbone bridging, a 24-bit service ID) or to MPLS, and data centres to VXLAN with its 24-bit VNI.`,
              `${USABLE_VIDS.toLocaleString('ja')} × ${USABLE_VIDS.toLocaleString('ja')} = ${vlanSpace(2).toLocaleString('ja')} です。${USABLE_VIDS.toLocaleString('ja')} 個の S-VLAN のそれぞれに、${USABLE_VIDS.toLocaleString('ja')} 個の C-VLAN が丸ごと入ります。ただし限界は残っています。顧客ごとに S-VLAN を 1 つ使うので顧客は最大 ${USABLE_VIDS.toLocaleString('ja')} 社で、コアのスイッチはすべての顧客の MAC アドレスを学習しなければなりません。大きな事業者は IEEE 802.1ah（PBB、24 ビットのサービス ID）や MPLS へ、データセンターは 24 ビットの VNI を持つ VXLAN へ移りました。`,
            )}
          </Reveal>
        ) : (
          <RevealButton
            testId="qq-count-reveal-button"
            ready={countGuess !== null}
            label={t('Count the VLANs', 'VLAN を数える')}
            onClick={() => setCountRevealed(true)}
          />
        )}
      </div>

      <p
        style={{ margin: 0, fontSize: 13, color: 'var(--netlab-text-secondary)', lineHeight: 1.7 }}
      >
        {t(
          'Simplified: each customer gets one S-VLAN on every port it uses (a port-based service); MAC learning, spanning tree and the priority bits are left out. TPID ',
          '簡略化しています。顧客はどのポートでも 1 つの S-VLAN を割り当てられる（ポート単位のサービス）とし、MAC アドレスの学習、スパニングツリー、優先度ビットは扱っていません。TPID ',
        )}
        <code>{hex(TPID.sTag)}</code>
        {t(
          ' is the IEEE 802.1ad value; some older equipment uses ',
          ' は IEEE 802.1ad の値です。古い機器には外側のタグに ',
        )}
        <code>0x8100</code>
        {t(' or ', ' や ')}
        <code>0x9100</code>
        {t(
          ' for the outer tag, so both ends must agree.',
          ' を使うものがあるので、両端で合わせる必要があります。',
        )}
      </p>
    </div>
  );
}

export default function QinqDemo() {
  return (
    <DemoShell
      title="Q-in-Q provider bridging"
      desc="How a provider carries customers' VLANs across its network with a second tag"
    >
      <QinqLesson />
    </DemoShell>
  );
}
