import { useState } from 'react';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  LESSON_TEAL_BUTTON_DISABLED,
  lessonChoice,
  predictionMark,
} from '../components/lessonStyles';
import { LessonChallenges } from '../components/LessonChallenges';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  FIRST_PORT,
  LAST_PORT,
  MAP_OFFSET_BITS,
  SHARED_SPACE,
  USABLE_PORTS,
  blockRange,
  blocksPerAddress,
  heavySubscriber,
  mapPortSet,
  sharedSpaceSize,
} from './cgnat';
import { cgnatChallenges } from './cgnatChallenges';

const ASKED_BLOCK = 1024;
const ASKED_FLOWS = 1200;
const PUBLIC_IP = '203.0.113.10';
const BLOCK_SIZES = [256, 512, 1024, 2048, 4096] as const;

type CountAnswer = '1024' | '64' | '63' | '62';
const COUNT_ANSWERS: readonly CountAnswer[] = ['1024', '64', '63', '62'];
type FlowAnswer = 'all-ok' | 'from-1025' | 'all-fail' | 'others-fail';
const FLOW_ANSWERS: readonly FlowAnswer[] = ['all-ok', 'from-1025', 'all-fail', 'others-fail'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };
const n = (value: number) => value.toLocaleString('en');

const BAR_W = 400;

/** The address's port space as blocks: the heavy subscriber's, everyone else's, and what is left over. */
function PortBar({ blockSize, heavyBlocks }: { blockSize: number; heavyBlocks: number }) {
  const t = useT();
  const { blocks, unused } = blocksPerAddress(blockSize);
  const unit = (BAR_W - 8) / USABLE_PORTS;
  return (
    <svg
      data-testid="cgnat-bar"
      viewBox={`0 0 ${BAR_W} 58`}
      style={{ width: '100%', maxWidth: 560 }}
      role="img"
      aria-label={t(
        `${blocks} blocks of ${blockSize} ports; ${heavyBlocks} to the heavy subscriber; ${unused} ports unused`,
        `${blockSize} ポートのブロックが ${blocks} 個。うち ${heavyBlocks} 個が大量に使う加入者、未使用 ${unused} ポート`,
      )}
    >
      {Array.from({ length: blocks }, (_, index) => (
        <rect
          key={index}
          x={4 + index * blockSize * unit}
          y={4}
          width={Math.max(blockSize * unit - 0.6, 0.4)}
          height={24}
          fill={index < heavyBlocks ? 'var(--netlab-accent-orange)' : 'var(--netlab-accent-cyan)'}
        />
      ))}
      {unused > 0 ? (
        <rect
          x={4 + blocks * blockSize * unit}
          y={4}
          width={unused * unit}
          height={24}
          fill="var(--netlab-border)"
        />
      ) : null}
      <text x={4} y={46} fontSize={12} fill="var(--netlab-text-secondary)">
        {FIRST_PORT}
      </text>
      <text x={BAR_W - 4} y={46} textAnchor="end" fontSize={12} fill="var(--netlab-text-secondary)">
        {LAST_PORT}
      </text>
    </svg>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function CgnatLesson() {
  const t = useT();
  const [countGuess, setCountGuess] = useState<CountAnswer | null>(null);
  const [countRevealed, setCountRevealed] = useState(false);
  const [flowGuess, setFlowGuess] = useState<FlowAnswer | null>(null);
  const [flowRevealed, setFlowRevealed] = useState(false);
  const [blockSize, setBlockSize] = useState<number>(ASKED_BLOCK);
  const [maxBlocks, setMaxBlocks] = useState(1);
  const [flows, setFlows] = useState(ASKED_FLOWS);
  const [view, setView] = useState<'blocks' | 'map'>('blocks');
  const [psidBits, setPsidBits] = useState(6);

  const asked = blocksPerAddress(ASKED_BLOCK);
  const countTruth = String(asked.blocks) as CountAnswer;
  const askedHeavy = heavySubscriber(ASKED_BLOCK, 1, ASKED_FLOWS);
  const flowTruth: FlowAnswer = askedHeavy.firstRefusedFlow === null ? 'all-ok' : 'from-1025';

  const lab = blocksPerAddress(blockSize);
  const heavy = heavySubscriber(blockSize, maxBlocks, flows);
  const map = mapPortSet(psidBits, 1);

  const flowName = (answer: FlowAnswer) =>
    ({
      'all-ok': t(`All ${n(ASKED_FLOWS)} flows work`, `${n(ASKED_FLOWS)} 本すべて通る`),
      'from-1025': t('Flows from the 1,025th on fail', '1,025 本目以降が失敗する'),
      'all-fail': t('The whole household is cut off', '世帯全体がつながらなくなる'),
      'others-fail': t(
        'Other subscribers on the address lose flows',
        '同じアドレスのほかの加入者が通信を失う',
      ),
    })[answer];

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
        <div style={LESSON_LABEL}>{t('Carrier-grade NAT', 'キャリアグレード NAT')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'An ISP has far fewer public IPv4 addresses than customers. So, besides the NAT in each home router, it runs a large NAT of its own, a CGN: many subscribers share one public address, and the CGN tells their traffic apart by port. To keep that manageable, it gives each subscriber its own block of the address’s ports.',
            'ISP が持つグローバル IPv4 アドレスは、契約者の数よりずっと少ないのが普通です。そこで家庭のルータの NAT に加えて、ISP 自身も大きな NAT（CGN）を動かします。多くの加入者が 1 つのグローバルアドレスを共有し、CGN はポートで通信を見分けます。管理しやすくするため、加入者ごとにそのアドレスのポートを「ブロック」単位で割り当てます。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="cgnat-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `One public address, ${PUBLIC_IP}. The CGN hands out its ports in blocks of ${n(ASKED_BLOCK)}, one block per subscriber, and leaves ports below ${FIRST_PORT} out. How many subscribers can share the address?`,
            `グローバルアドレスは ${PUBLIC_IP} の 1 つです。CGN はそのポートを ${n(ASKED_BLOCK)} 個ずつのブロックにして、加入者に 1 ブロックずつ渡します。${FIRST_PORT} 未満のポートは使いません。このアドレスを共有できる加入者は何人？`,
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
              data-testid={`cgnat-guess-${id}`}
              disabled={countRevealed}
              onClick={() => setCountGuess(id)}
              style={{ ...lessonChoice(countGuess === id), textAlign: 'left' }}
            >
              {predictionMark(id, countGuess, countTruth, countRevealed)}
              {t(`${n(Number(id))} subscribers`, `${n(Number(id))} 人`)}
            </button>
          ))}
        </div>
        {countRevealed ? (
          <p
            data-testid="cgnat-reveal"
            data-right={String(countGuess === countTruth)}
            data-subscribers={asked.blocks}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {countGuess === countTruth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `${asked.blocks}. Ports 0–${FIRST_PORT - 1} are not handed out (common practice), so ${n(USABLE_PORTS)} ports are left (${FIRST_PORT}–${LAST_PORT}); ${n(USABLE_PORTS)} ÷ ${n(ASKED_BLOCK)} = ${asked.blocks} blocks, with ${asked.unused} ports over. The subscribers’ own WAN addresses come from ${SHARED_SPACE.base}/${SHARED_SPACE.prefix} (RFC 6598), ${n(sharedSpaceSize())} addresses set aside for this, so they never clash with the 10.0.0.0/8 or 192.168.0.0/16 inside the homes.`,
              `${asked.blocks} 人です。ポート 0〜${FIRST_PORT - 1} は割り当てない（一般的な運用）ので、残りは ${n(USABLE_PORTS)} 個（${FIRST_PORT}〜${LAST_PORT}）です。${n(USABLE_PORTS)} ÷ ${n(ASKED_BLOCK)} = ${asked.blocks} ブロックで、余りは ${asked.unused} ポートです。加入者自身の WAN 側アドレスは、この用途のために確保された ${SHARED_SPACE.base}/${SHARED_SPACE.prefix}（RFC 6598、${n(sharedSpaceSize())} 個）から配られるので、家庭内の 10.0.0.0/8 や 192.168.0.0/16 とぶつかりません。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="cgnat-reveal-button"
            disabled={!countGuess}
            style={{
              ...(countGuess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED),
              marginTop: 8,
            }}
            onClick={() => setCountRevealed(true)}
          >
            {countGuess
              ? t('Count the blocks', 'ブロックを数える')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {countRevealed ? (
        <div style={LESSON_CARD} data-testid="cgnat-flows-predict">
          <div style={LESSON_LABEL}>{t('Predict again', 'もう一度予想')}</div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              `One of those subscribers is a busy household: a game download and several browsers open ${n(ASKED_FLOWS)} connections at once. It has its one block of ${n(ASKED_BLOCK)} ports. What happens?`,
              `その加入者の 1 つはにぎやかな世帯で、ゲームのダウンロードといくつものブラウザが同時に ${n(ASKED_FLOWS)} 本の接続を開きます。割り当ては ${n(ASKED_BLOCK)} ポートの 1 ブロックです。どうなる？`,
            )}
          </p>
          <div
            role="radiogroup"
            aria-label={t('Your prediction', '予想')}
            style={{ display: 'grid', gap: 6 }}
          >
            {FLOW_ANSWERS.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={flowGuess === id}
                data-testid={`cgnat-flows-guess-${id}`}
                disabled={flowRevealed}
                onClick={() => setFlowGuess(id)}
                style={{ ...lessonChoice(flowGuess === id), textAlign: 'left' }}
              >
                {predictionMark(id, flowGuess, flowTruth, flowRevealed)}
                {flowName(id)}
              </button>
            ))}
          </div>
          {flowRevealed ? (
            <p
              data-testid="cgnat-flows-reveal"
              data-right={String(flowGuess === flowTruth)}
              data-first-refused={askedHeavy.firstRefusedFlow ?? 'none'}
              role="status"
              style={{ margin: '8px 0 0', lineHeight: 1.7 }}
            >
              <strong>
                {flowGuess === flowTruth
                  ? t('As you predicted. ', '予想どおりです。')
                  : t('Not what you predicted. ', '予想とちがいました。')}
              </strong>
              {t(
                `Flows from number ${n(askedHeavy.firstRefusedFlow ?? 0)} on get no port, so ${askedHeavy.refusedFlows} new connections fail. Each connection opens from its own inside port, and each inside port needs its own outside port: the CGN maps each inside address and port to one outside port whatever the destination (endpoint-independent mapping, which RFC 6888 requires), so ${n(askedHeavy.ports)} ports carry ${n(askedHeavy.ports)} flows. The first ${n(askedHeavy.ports)} keep working, and the other ${askedHeavy.subscribersServed - 1} subscribers are untouched: their ports are in their own blocks.`,
                `${n(askedHeavy.firstRefusedFlow ?? 0)} 本目以降はポートがもらえず、${askedHeavy.refusedFlows} 本の新しい接続が失敗します。接続はそれぞれ別の内側ポートから開かれ、内側ポートごとに外側のポートが 1 つずつ要ります。CGN は内側のアドレスとポートの組を、宛先にかかわらず外側の 1 ポートに対応付ける（エンドポイント非依存マッピング。RFC 6888 が求めています）ので、${n(askedHeavy.ports)} ポートで運べるのは ${n(askedHeavy.ports)} 本です。最初の ${n(askedHeavy.ports)} 本は動き続け、ほかの ${askedHeavy.subscribersServed - 1} 人には影響しません。それぞれのポートは自分のブロックにあるからです。`,
              )}
            </p>
          ) : (
            <button
              type="button"
              data-testid="cgnat-flows-reveal-button"
              disabled={!flowGuess}
              style={{
                ...(flowGuess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED),
                marginTop: 8,
              }}
              onClick={() => setFlowRevealed(true)}
            >
              {flowGuess
                ? t('Open the connections', '接続を開く')
                : t('Predict first', '先に予想を選んでください')}
            </button>
          )}
        </div>
      ) : null}

      {flowRevealed ? (
        <div style={LESSON_CARD} data-testid="cgnat-lab">
          <div style={LESSON_LABEL}>{t('Share the address', 'アドレスを分け合う')}</div>
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['blocks', 'map'] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={view === id}
                data-testid={`cgnat-view-${id}`}
                onClick={() => setView(id)}
                style={lessonChoice(view === id)}
              >
                {(view === id ? '✓ ' : '') +
                  (id === 'blocks'
                    ? t('Port blocks (CGN)', 'ポートブロック（CGN）')
                    : t('MAP-E port sets', 'MAP-E のポートセット'))}
              </button>
            ))}
          </div>

          {view === 'blocks' ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                {t('Block size', 'ブロックの大きさ')}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {BLOCK_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={blockSize === size}
                    data-testid={`cgnat-block-${size}`}
                    onClick={() => setBlockSize(size)}
                    style={lessonChoice(blockSize === size)}
                  >
                    {(blockSize === size ? '✓ ' : '') + n(size)}
                  </button>
                ))}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  marginTop: 8,
                }}
              >
                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {t('Busy household’s flows', 'にぎやかな世帯の接続数')}
                  <input
                    type="range"
                    min={100}
                    max={5000}
                    step={100}
                    value={flows}
                    data-testid="cgnat-flows"
                    onChange={(event) => setFlows(Number(event.target.value))}
                    style={{ minHeight: 44 }}
                  />
                  <span style={{ fontFamily: 'monospace' }}>{n(flows)}</span>
                </label>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {t('Blocks allowed per subscriber', '加入者あたりの上限ブロック数')}
                  <input
                    type="range"
                    min={1}
                    max={4}
                    step={1}
                    value={maxBlocks}
                    data-testid="cgnat-max-blocks"
                    onChange={(event) => setMaxBlocks(Number(event.target.value))}
                    style={{ minHeight: 44 }}
                  />
                  <span style={{ fontFamily: 'monospace' }}>{maxBlocks}</span>
                </label>
              </div>
              <p
                data-testid="cgnat-result"
                data-subscribers={lab.blocks}
                data-unused={lab.unused}
                data-blocks={heavy.blocks}
                data-first-refused={heavy.firstRefusedFlow ?? 'none'}
                data-served={heavy.subscribersServed}
                style={{ margin: '8px 0 0', fontWeight: 700, lineHeight: 1.7 }}
              >
                {t(
                  `${lab.blocks} blocks of ${n(blockSize)} (${n(lab.unused)} ports unused). The household gets ${heavy.blocks} block${heavy.blocks > 1 ? 's' : ''} = ${n(heavy.ports)} ports: ${
                    heavy.firstRefusedFlow === null
                      ? 'every flow gets a port'
                      : `flow ${n(heavy.firstRefusedFlow)} on is refused (${n(heavy.refusedFlows)} flows)`
                  }. The address serves ${heavy.subscribersServed} subscribers.`,
                  `${n(blockSize)} ポートのブロックが ${lab.blocks} 個（未使用 ${n(lab.unused)} ポート）。この世帯は ${heavy.blocks} ブロック = ${n(heavy.ports)} ポートを得て、${
                    heavy.firstRefusedFlow === null
                      ? 'すべての接続にポートが付きます'
                      : `${n(heavy.firstRefusedFlow)} 本目以降（${n(heavy.refusedFlows)} 本）が拒否されます`
                  }。このアドレスで収容できるのは ${heavy.subscribersServed} 人です。`,
                )}
              </p>
              <PortBar blockSize={blockSize} heavyBlocks={heavy.blocks} />
              <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
                {t(
                  'Orange: the busy household’s blocks. Cyan: one block per other subscriber. Grey: ports too few to make a block.',
                  '橙：にぎやかな世帯のブロック。水色：ほかの加入者 1 人に 1 ブロック。灰色：ブロックにならない余りのポート。',
                )}
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                      <th style={cell}>{t('Subscriber (WAN)', '加入者（WAN 側）')}</th>
                      <th style={cell}>{t('Outside address', '外側のアドレス')}</th>
                      <th style={cell}>{t('Ports', 'ポート')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[0, 1, 2].map((index) => {
                      const range = blockRange(blockSize, index);
                      return (
                        <tr key={index} data-testid={`cgnat-map-row-${index}`}>
                          <td style={mono}>{`100.64.0.${index + 1}`}</td>
                          <td style={mono}>{PUBLIC_IP}</td>
                          <td style={mono}>{`${range.first}–${range.last}`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
                {t(
                  `Why blocks at all? An ISP must be able to say who used ${PUBLIC_IP} port 40,000 at a given moment. Logging every flow would mean ${n(heavy.flowLogRecords)} records for this household alone; logging each block it is given means ${heavy.blockLogRecords}. Reducing that logging is what RFC 7422 is about. Bigger blocks mean fewer records and fewer refusals, but fewer subscribers per address.`,
                  `そもそもなぜブロックなのでしょうか。ISP は、ある時刻に ${PUBLIC_IP} のポート 40,000 を使っていたのが誰かを答えられなければなりません。通信ごとに記録すると、この世帯だけで ${n(heavy.flowLogRecords)} 件ですが、渡したブロックごとなら ${heavy.blockLogRecords} 件で済みます。このログを減らすことが RFC 7422 の主題です。ブロックを大きくすると記録も拒否も減りますが、1 アドレスあたりの加入者は減ります。`,
                )}
              </p>
            </div>
          ) : (
            <div style={{ marginTop: 8 }} data-testid="cgnat-map">
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {t('PSID length k', 'PSID の長さ k')}
                <input
                  type="range"
                  min={2}
                  max={10}
                  step={1}
                  value={psidBits}
                  data-testid="cgnat-psid-bits"
                  onChange={(event) => setPsidBits(Number(event.target.value))}
                  style={{ minHeight: 44 }}
                />
                <span style={{ fontFamily: 'monospace' }}>{`${psidBits} bit`}</span>
              </label>
              <p
                data-testid="cgnat-map-result"
                data-sharing={map.sharing}
                data-ports={map.portsPerSubscriber}
                style={{ margin: '8px 0 0', fontWeight: 700, lineHeight: 1.7 }}
              >
                {t(
                  `${map.sharing} subscribers per address (2^${psidBits}), ${n(map.portsPerSubscriber)} ports each, in ${map.ranges.length} runs of ${map.portsPerSubscriber / map.ranges.length}.`,
                  `1 アドレスを ${map.sharing} 人（2^${psidBits}）で共有し、1 人 ${n(map.portsPerSubscriber)} ポート。${map.portsPerSubscriber / map.ranges.length} 個の連続した範囲が ${map.ranges.length} 個です。`,
                )}
              </p>
              <p style={{ margin: '4px 0 0', fontFamily: 'monospace', fontSize: 13 }}>
                {`PSID 1: ${map.ranges
                  .slice(0, 3)
                  .map((range) => `${range.first}–${range.last}`)
                  .join(', ')}, …`}
              </p>
              <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
                {t(
                  `With MAP-E (RFC 7597, address plus port), the port set is not handed out on demand: it follows from bits in the subscriber’s IPv6 prefix, the PSID. With a = ${MAP_OFFSET_BITS} offset bits (RFC 7597’s default), no set contains ports 0–1023. The router at the ISP’s edge keeps no per-flow state and needs no per-flow logs, since the mapping is fixed — but a subscriber can never borrow more ports.`,
                  `MAP-E（RFC 7597、アドレス＋ポート）では、ポートセットは必要に応じて配るのではなく、加入者の IPv6 プレフィックスに含まれるビット（PSID）から決まります。オフセットビット a = ${MAP_OFFSET_BITS}（RFC 7597 の既定値）なら、どのセットにもポート 0〜1023 は入りません。対応が固定なので、ISP 側のルータは通信ごとの状態もログも持ちませんが、加入者がポートを追加で借りることはできません。`,
                )}
              </p>
            </div>
          )}
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Simplified: one protocol only (TCP and UDP each have their own ports); blocks go first come, first served. Block size and blocks per subscriber are operator settings, not standard values; leaving out ports 0–1023 is common practice, and real CGNs also time idle mappings out.',
              '簡略化しています。プロトコルは 1 つだけです（実際は TCP と UDP で別々のポートがあります）。ブロックは先着順に渡します。ブロックの大きさと加入者あたりのブロック数は運用者が決める設定で、標準の値ではありません。ポート 0〜1023 を外すのは一般的な運用で、実際の CGN は使われなくなった対応を時間切れで消します。',
            )}
          </p>
        </div>
      ) : null}

      {flowRevealed && (
        <LessonChallenges
          lessonId="cgnat"
          challenges={cgnatChallenges({ blockSize, maxBlocks, flows, psidBits })}
        />
      )}
    </div>
  );
}

export default function CgnatDemo() {
  return (
    <DemoShell
      title="Carrier-grade NAT"
      desc="Many subscribers behind one public IPv4 address: how its ports are shared out, and what happens when one runs short."
    >
      <CgnatLesson />
    </DemoShell>
  );
}
