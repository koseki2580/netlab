import { useState } from 'react';
import {
  LESSON_BUTTON,
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  LESSON_TEAL_BUTTON_DISABLED,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  LLDP_CABLES,
  LLDP_DEVICES,
  POE_BUDGET_W,
  POE_CLASSES,
  POE_DEVICES,
  allocatePower,
  errorCounters,
  lldpTable,
  negotiate,
  type Allocation,
  type ErrorCounters,
  type PortSetting,
  type SideResult,
} from './physicalLayer';

type SettingKey = 'auto' | '100-full' | '100-half' | '10-full' | '10-half';
const SETTINGS: readonly SettingKey[] = ['auto', '100-full', '100-half', '10-full', '10-half'];
const toSetting = (key: SettingKey): PortSetting => {
  if (key === 'auto') return { mode: 'auto' };
  const [speed, duplex] = key.split('-');
  return { mode: 'fixed', speed: Number(speed) as 10 | 100, duplex: duplex as 'full' | 'half' };
};

type DuplexAnswer = '100-full' | '100-half' | '10-half' | 'none';
const DUPLEX_ANSWERS: readonly DuplexAnswer[] = ['100-full', '100-half', '10-half', 'none'];
type PoeAnswer = 'yes' | 'no';

const COLUMN: React.CSSProperties = {
  maxWidth: 820,
  margin: '0 auto',
  padding: 16,
  display: 'grid',
  gap: 12,
  overflowY: 'auto',
  height: '100%',
  boxSizing: 'border-box',
};
const CELL: React.CSSProperties = { padding: 4, borderBottom: '1px solid var(--netlab-border)' };
const MONO: React.CSSProperties = { ...CELL, fontFamily: 'monospace', fontWeight: 700 };

function choiceStyle(selected: boolean): React.CSSProperties {
  return {
    ...LESSON_BUTTON,
    outline: selected ? '2px solid var(--netlab-accent-cyan)' : undefined,
  };
}

/** Part 1: speed and duplex. */
function DuplexPart() {
  const t = useT();
  const [guess, setGuess] = useState<DuplexAnswer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [a, setA] = useState<SettingKey>('100-full');
  const [b, setB] = useState<SettingKey>('auto');
  const [load, setLoad] = useState(50);
  const truth: DuplexAnswer = '100-half';
  const outcome = negotiate(toSetting(a), toSetting(b));
  const counters = errorCounters(outcome, load);
  const label = (key: SettingKey) =>
    key === 'auto'
      ? t('Auto', '自動')
      : t(`Fixed ${key.replace('-', ' Mbit/s ')}`, `固定 ${key.replace('-', ' Mbit/s ')}`);
  const answerLabel = (answer: DuplexAnswer) =>
    answer === 'none'
      ? t('No link', 'リンクしない')
      : answer
          .replace('-', ' Mbit/s ')
          .replace('full', t('full', '全二重'))
          .replace('half', t('half', '半二重'));
  const side = (result: SideResult) =>
    `${result.speed} Mbit/s ${result.duplex === 'full' ? t('full', '全二重') : t('half', '半二重')}`;
  const counterRows: readonly [keyof ErrorCounters, string][] = [
    ['collisions', t('Collisions', 'コリジョン')],
    ['lateCollisions', t('Late collisions', 'レイトコリジョン')],
    ['runts', t('Runts', 'ラント')],
    ['fcsErrors', t('FCS (CRC) errors', 'FCS（CRC）エラー')],
  ];

  return (
    <>
      <div style={LESSON_CARD} data-testid="phy-predict">
        <div style={LESSON_LABEL}>
          {t('1. Speed and duplex — predict first', '1. 速度とデュプレックス — まず予想')}
        </div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'Both ports can run 10 or 100 Mbit/s. Someone hard-set the switch port to 100 Mbit/s full duplex; the PC is left on auto. A fixed port sends no autonegotiation pulses. What does the PC end up with?',
            'どちらのポートも 10 か 100 Mbit/s で動けます。スイッチのポートは 100 Mbit/s 全二重に固定され、PC は自動のままです。固定したポートはオートネゴシエーションの信号を送りません。PC はどうなる？',
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
        >
          {DUPLEX_ANSWERS.map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={guess === answer}
              data-testid={`phy-guess-${answer}`}
              disabled={revealed}
              onClick={() => setGuess(answer)}
              style={choiceStyle(guess === answer)}
            >
              {answerLabel(answer)}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="phy-reveal"
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
              '100 Mbit/s half duplex. Hearing no negotiation, the PC finds the speed from the signal on the wire (parallel detection), but nothing on the wire tells it the duplex, so IEEE 802.3 makes it assume half. The link comes up and pings work — the trouble shows only under load. Set both ends the same, or better, both to auto.',
              '100 Mbit/s 半二重です。ネゴシエーションが届かないので、PC は線上の信号から速度を見つけます（パラレル検出）が、デュプレックスは信号からは分からないため、IEEE 802.3 の決まりで半二重とみなします。リンクは上がり ping も通るので、問題は負荷をかけたときにだけ出ます。両端を同じ設定に、できれば両方とも自動にします。',
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="phy-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('See the link', 'リンクを見る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="phy-duplex">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {(
              [
                [t('Switch port', 'スイッチのポート'), a, setA, 'a'],
                [t('PC', 'PC'), b, setB, 'b'],
              ] as const
            ).map(([name, value, set, id]) => (
              <label key={id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {name}
                <select
                  data-testid={`phy-${id}-setting`}
                  value={value}
                  onChange={(event) => set(event.target.value as SettingKey)}
                  style={{ minHeight: 44 }}
                >
                  {SETTINGS.map((key) => (
                    <option key={key} value={key}>
                      {label(key)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {t('Load', '負荷')}
              <input
                type="range"
                min={0}
                max={100}
                step={10}
                value={load}
                data-testid="phy-load"
                onChange={(event) => setLoad(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{load} %</span>
            </label>
          </div>
          <p data-testid="phy-outcome" style={{ margin: '8px 0', lineHeight: 1.7 }}>
            {!outcome.link
              ? t(
                  'No link: the two ends are fixed at different speeds.',
                  'リンクしない：両端が別の速度に固定されています。',
                )
              : outcome.mismatch
                ? t(
                    'Duplex mismatch: the link is up, but one side talks while the other listens for collisions.',
                    'デュプレックス不一致：リンクは上がりますが、片方は送りながら受け、もう片方は衝突を気にしながら送っています。',
                  )
                : t('The two ends agree.', '両端の設定は一致しています。')}
          </p>
          {outcome.link ? (
            <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={CELL} />
                  <th style={CELL}>{t('Switch port', 'スイッチのポート')}</th>
                  <th style={CELL}>PC</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={CELL}>{t('Ends up with', '結果')}</td>
                  <td style={MONO} data-testid="phy-a-result">
                    {side(outcome.a)}
                  </td>
                  <td style={MONO} data-testid="phy-b-result">
                    {side(outcome.b)}
                  </td>
                </tr>
                {counterRows.map(([key, name]) => (
                  <tr key={key}>
                    <td style={CELL}>{name}</td>
                    <td style={MONO} data-testid={`phy-a-${key}`}>
                      {counters.a[key]}
                    </td>
                    <td style={MONO} data-testid={`phy-b-${key}`}>
                      {counters.b[key]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          <p style={{ margin: '8px 0 0', lineHeight: 1.7, fontSize: 13 }}>
            {t(
              'Counts are for one minute and illustrative; which counter grows on which side is real. The half-duplex side sees the other transmit while it sends, takes it for a collision and stops: inside the first 64 bytes that is a collision and the far side gets a runt; later it is a late collision and the far side gets a frame with a bad FCS. Late collisions on one end and CRC errors on the other are the classic sign. Gigabit copper (1000BASE-T) requires autonegotiation, so this trap belongs to 10/100 ports.',
              '数は 1 分間のもので、あくまで例です。どちらの側でどのカウンタが増えるかは実際のとおりです。半二重の側は、自分が送っている間に相手が送ってくるのを衝突とみなして送信をやめます。最初の 64 バイト以内ならコリジョンで、相手にはラントが届き、それより後ならレイトコリジョンで、相手には FCS の壊れたフレームが届きます。片側でレイトコリジョン、反対側で CRC エラーが増えるのが典型的なサインです。銅線のギガビット（1000BASE-T）はオートネゴシエーションが必須なので、この罠は 10/100 のポートのものです。',
            )}
          </p>
        </div>
      ) : null}
    </>
  );
}

/** Part 2: the PoE budget. */
function PoePart() {
  const t = useT();
  const [guess, setGuess] = useState<PoeAnswer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [mode, setMode] = useState<Allocation>('class');
  const truth: PoeAnswer = allocatePower(POE_DEVICES, POE_BUDGET_W, 'class').denied.includes(24)
    ? 'no'
    : 'yes';
  const result = allocatePower(POE_DEVICES, POE_BUDGET_W, mode);
  const kindName = (kind: string) =>
    kind === 'phone' ? t('Phone', '電話') : kind === 'camera' ? t('Camera', 'カメラ') : 'AP';

  return (
    <>
      <div style={LESSON_CARD} data-testid="phy-poe-predict">
        <div style={LESSON_LABEL}>
          {t('2. The PoE budget — predict first', '2. PoE の電力予算 — まず予想')}
        </div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `A 24-port switch can supply ${POE_BUDGET_W} W in all. Ports 1–12: IP phones (802.3af class 2, ${POE_CLASSES[2].pseW} W). Ports 13–16: cameras (class 3, ${POE_CLASSES[3].pseW} W). Ports 17–24: access points (802.3at class 4, ${POE_CLASSES[4].pseW} W at the switch, ${POE_CLASSES[4].pdW} W at the AP). Each AP really draws about 18 W. The switch reserves each port’s class maximum. Does the AP on port 24 power up?`,
            `24 ポートのスイッチが供給できる電力は合計 ${POE_BUDGET_W} W です。ポート 1〜12 は IP 電話（802.3af クラス 2、${POE_CLASSES[2].pseW} W）、13〜16 はカメラ（クラス 3、${POE_CLASSES[3].pseW} W）、17〜24 はアクセスポイント（802.3at クラス 4、スイッチ側 ${POE_CLASSES[4].pseW} W、AP 側 ${POE_CLASSES[4].pdW} W）。AP が実際に使うのは 1 台約 18 W です。スイッチは各ポートにクラスの上限を確保します。ポート 24 の AP は起動する？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
        >
          {(['yes', 'no'] as const).map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={guess === answer}
              data-testid={`phy-poe-guess-${answer}`}
              disabled={revealed}
              onClick={() => setGuess(answer)}
              style={choiceStyle(guess === answer)}
            >
              {answer === 'yes'
                ? t('Yes, it powers up', '起動する')
                : t('No, it stays off', '起動しない')}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="phy-poe-reveal"
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
              'It stays off. 12 × 7.0 + 4 × 15.4 + 7 × 30 = 355.6 W is already reserved; one more 30 W AP would need 385.6 W of 370. Yet the devices running draw only about 214 W: the budget is spent on reservations, not on what is drawn.',
              '起動しません。12 × 7.0 + 4 × 15.4 + 7 × 30 = 355.6 W がすでに確保され、もう 1 台 30 W の AP を足すと 370 W のうち 385.6 W が必要です。それでも動いている機器が実際に使っているのは約 214 W だけ。予算を使い切ったのは確保した分で、実際に使われた分ではありません。',
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="phy-poe-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('See the budget', '予算を見る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="phy-poe">
          <div
            role="group"
            aria-label={t('How power is allocated', '電力の割り当て方')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {(['class', 'lldp'] as const).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={mode === key}
                data-testid={`phy-poe-mode-${key}`}
                onClick={() => setMode(key)}
                style={choiceStyle(mode === key)}
              >
                {key === 'class'
                  ? t('By class', 'クラスで確保')
                  : t('Negotiated over LLDP', 'LLDP で交渉')}
              </button>
            ))}
          </div>
          <div
            role="list"
            aria-label={t('Switch ports', 'スイッチのポート')}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
              gap: 4,
              margin: '8px 0',
            }}
          >
            {result.ports.map((port) => {
              const device = POE_DEVICES.find((entry) => entry.port === port.port)!;
              return (
                <div
                  key={port.port}
                  role="listitem"
                  data-testid={`phy-port-${port.port}`}
                  data-powered={String(port.powered)}
                  style={{
                    border: '1px solid var(--netlab-border)',
                    borderRadius: 4,
                    padding: 4,
                    fontSize: 11,
                    textAlign: 'center',
                    background: port.powered
                      ? 'var(--netlab-bg-primary)'
                      : 'var(--netlab-bg-surface)',
                    opacity: port.powered ? 1 : 0.6,
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{port.port}</div>
                  <div>{kindName(device.kind)}</div>
                  <div style={{ fontFamily: 'monospace' }}>
                    {port.powered ? `${port.allocatedW} W` : t('off', '停止')}
                  </div>
                </div>
              );
            })}
          </div>
          <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              <tr>
                <td style={CELL}>{t('Reserved', '確保')}</td>
                <td
                  style={MONO}
                  data-testid="phy-poe-allocated"
                >{`${result.allocatedW} W / ${POE_BUDGET_W} W`}</td>
              </tr>
              <tr>
                <td style={CELL}>{t('Actually drawn (illustrative)', '実際の消費（例）')}</td>
                <td style={MONO} data-testid="phy-poe-drawn">{`${result.drawW} W`}</td>
              </tr>
              <tr>
                <td style={CELL}>{t('Ports left unpowered', '給電されないポート')}</td>
                <td style={MONO} data-testid="phy-poe-denied">
                  {result.denied.length ? result.denied.join(', ') : t('none', 'なし')}
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7, fontSize: 13 }}>
            {t(
              'A class says only the most a device may need, so a switch that allocates by class reserves that maximum per port. If the switch and devices negotiate power over LLDP (LLDP-MED or the 802.3at/bt LLDP power TLVs), each device asks for what it needs (here 5, 10 and 22 W) and all 24 ports fit. The 30 W at the switch is 25.5 W at the AP because up to 100 m of cable loses the rest. Many Wi-Fi 6E and Wi-Fi 7 APs need 802.3bt (usually class 5, 45 W) for every feature. Real switches also let you give ports a priority, so the AP is not simply the one on the highest port.',
              'クラスが示すのは機器が必要とし得る上限だけなので、クラスで割り当てるスイッチはポートごとにその上限を確保します。スイッチと機器が LLDP で電力を交渉する場合（LLDP-MED や 802.3at/bt の LLDP 電力 TLV）は、機器が必要な分だけ（ここでは 5、10、22 W）を求め、24 ポートすべてが収まります。スイッチ側の 30 W が AP では 25.5 W なのは、最長 100 m のケーブルで残りが失われるからです。Wi-Fi 6E や Wi-Fi 7 の AP には、すべての機能を使うのに 802.3bt（多くはクラス 5、45 W）が要るものが多くあります。実際のスイッチではポートに優先度も付けられるので、止まるのが単に番号の最も大きいポートとは限りません。',
            )}
          </p>
        </div>
      ) : null}
    </>
  );
}

/** Part 3: LLDP neighbour tables. */
function LldpPart() {
  const t = useT();
  const [device, setDevice] = useState('core-1');
  const table = lldpTable(device, LLDP_DEVICES, LLDP_CABLES);
  return (
    <div style={LESSON_CARD} data-testid="phy-lldp">
      <div style={LESSON_LABEL}>
        {t(
          '3. LLDP — who is on the other end of this cable?',
          '3. LLDP — このケーブルの先にいるのは？',
        )}
      </div>
      <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
        {t(
          'Every 30 seconds each device sends an LLDP frame out of each port: its chassis ID, the port it left by, its name, and a time to live of 120 s (30 s × 4) after which the neighbour is forgotten if nothing more arrives. Cabling: core-1 Gi1/0/1 → access-1 Gi1/0/48, core-1 Gi1/0/2 → access-2 Gi1/0/48, access-2 Gi1/0/17 → ap-3f eth0. Pick a device to see what it has learned.',
          '各機器は 30 秒ごとに、ポートごとに LLDP フレームを送ります。中身はシャーシ ID、送り出したポート、機器名、そして 120 秒（30 秒 × 4）の TTL で、それまでに次が届かなければその隣接機器は忘れられます。配線は core-1 Gi1/0/1 → access-1 Gi1/0/48、core-1 Gi1/0/2 → access-2 Gi1/0/48、access-2 Gi1/0/17 → ap-3f eth0 です。機器を選ぶと、その機器が知った内容が表示されます。',
        )}
      </p>
      <div
        role="group"
        aria-label={t('Device', '機器')}
        style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
      >
        {LLDP_DEVICES.map((entry) => (
          <button
            key={entry.name}
            type="button"
            aria-pressed={device === entry.name}
            data-testid={`phy-lldp-${entry.name}`}
            onClick={() => setDevice(entry.name)}
            style={choiceStyle(device === entry.name)}
          >
            {entry.name}
          </button>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table
          data-testid="phy-lldp-table"
          style={{ borderCollapse: 'collapse', marginTop: 8, fontSize: 13 }}
        >
          <caption style={{ textAlign: 'left', fontWeight: 700, padding: 4 }}>
            {t(`Neighbours of ${device}`, `${device} の隣接機器`)}
          </caption>
          <thead>
            <tr>
              <th style={CELL}>{t('Local port', '自分のポート')}</th>
              <th style={CELL}>{t('Chassis ID', 'シャーシ ID')}</th>
              <th style={CELL}>{t('Port ID', 'ポート ID')}</th>
              <th style={CELL}>{t('System name', '機器名')}</th>
              <th style={CELL}>TTL</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr key={row.localPort} data-testid="phy-lldp-row">
                <td style={MONO}>{row.localPort}</td>
                <td style={MONO}>{row.chassisId}</td>
                <td style={MONO}>{row.portId}</td>
                <td style={MONO}>{row.systemName}</td>
                <td style={MONO}>{`${row.ttl} s`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ margin: '8px 0 0', lineHeight: 1.7, fontSize: 13 }}>
        {t(
          'core-1 never lists the AP: LLDP frames go to 01-80-C2-00-00-0E, an address switches do not forward, so each device learns only what is at the other end of its own cables. That is what makes it useful for checking cabling against a diagram. CDP is Cisco’s proprietary protocol for the same job.',
          'core-1 の表に AP は出てきません。LLDP フレームの宛先 01-80-C2-00-00-0E はスイッチが転送しないアドレスなので、各機器が知るのは自分のケーブルの先にいる機器だけです。だから配線を図面と照らし合わせるのに役立ちます。CDP は同じ役目をする Cisco 独自のプロトコルです。',
        )}
      </p>
    </div>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function PhysicalLayerLesson() {
  const t = useT();
  return (
    <div style={COLUMN}>
      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>{t('The physical layer in practice', '実際の物理層')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'Plugging in a cable is where many faults start: two ends that disagree on duplex, a switch that runs out of power for its devices, a cable that goes somewhere other than the diagram says. Each part below is one of them.',
            'ケーブルを挿すところから始まる障害はたくさんあります。デュプレックスの合わない両端、機器に配る電力が足りなくなるスイッチ、図面とちがう先につながったケーブル。以下の各パートはそのひとつずつです。',
          )}
        </p>
      </div>
      <DuplexPart />
      <PoePart />
      <LldpPart />
    </div>
  );
}

export default function PhysicalLayerDemo() {
  return (
    <DemoShell
      title="The physical layer in practice"
      desc="Duplex mismatch, PoE power budgets and LLDP neighbour discovery"
    >
      <PhysicalLayerLesson />
    </DemoShell>
  );
}
