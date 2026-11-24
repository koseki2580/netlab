import { useMemo, useState } from 'react';
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
  AGEING_TIME_S,
  A_LAST_SENT_S,
  BROADCAST_MAC,
  HOSTS,
  HOST_IDS,
  PORTS,
  SCENE_ONE,
  agedScene,
  movedScene,
  replay,
  type Entry,
  type HostId,
  type Step,
} from './macLearning';

type Answer = 'flood' | 'drop' | `port-${number}`;
type Situation = 'moved' | 'aged';

/** How long nobody speaks in the ageing question. */
const AGED_IDLE_S = 400;

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

/** The prediction a step's outcome matches. */
function answerOf(step: Step): Answer {
  if (step.kind === 'flood') return 'flood';
  if (step.kind === 'filter') return 'drop';
  return `port-${step.egress[0]!}`;
}

/** The options for a frame that came in on `ingress`. */
function optionsFor(ingress: number): Answer[] {
  return [
    'flood',
    ...PORTS.filter((port) => port !== ingress).map((port) => `port-${port}` as Answer),
    'drop',
  ];
}

const hostOf = (mac: string) => HOST_IDS.find((id) => HOSTS[id].mac === mac)!;
const ports = (list: readonly number[]) => list.join(', ');

/** One switch, four ports, the hosts below them; the frame's way in and out. */
function SwitchDiagram({
  where,
  ingress,
  egress,
}: {
  where: Readonly<Record<HostId, number>>;
  ingress: number;
  egress: readonly number[] | null;
}) {
  const t = useT();
  const x = (port: number) => 20 + port * 80;
  return (
    <svg
      viewBox="0 0 440 180"
      style={{ width: '100%', maxWidth: 520 }}
      role="img"
      data-testid="ml-diagram"
      aria-label={
        egress
          ? t(
              `The frame enters on port ${ingress} and leaves by ${egress.length ? `port ${ports(egress)}` : 'no port'}`,
              `フレームはポート ${ingress} から入り、${egress.length ? `ポート ${ports(egress)} から出ます` : 'どのポートからも出ません'}`,
            )
          : t(`The frame enters on port ${ingress}`, `フレームはポート ${ingress} から入ります`)
      }
    >
      <rect
        x={60}
        y={14}
        width={320}
        height={50}
        rx={8}
        fill="var(--netlab-bg-surface)"
        stroke="var(--netlab-border-strong)"
      />
      <text x={220} y={44} textAnchor="middle" fontSize={14} fill="var(--netlab-text-primary)">
        {t('Switch', 'スイッチ')}
      </text>
      {PORTS.map((port) => {
        const isIn = port === ingress;
        const isOut = egress?.includes(port) ?? false;
        const stroke = isIn
          ? 'var(--netlab-accent-orange)'
          : isOut
            ? 'var(--netlab-accent-cyan)'
            : 'var(--netlab-border-strong)';
        const hosts = HOST_IDS.filter((id) => where[id] === port);
        return (
          <g key={port}>
            <line
              x1={x(port)}
              x2={x(port)}
              y1={64}
              y2={124}
              stroke={stroke}
              strokeWidth={isIn || isOut ? 4 : 1.5}
            />
            <text x={x(port) + 6} y={84} fontSize={12} fill="var(--netlab-text-secondary)">
              {`P${port}`}
            </text>
            {isIn || isOut ? (
              <text x={x(port) + 6} y={104} fontSize={12} fill="var(--netlab-text-primary)">
                {isIn ? t('in ↑', '入 ↑') : t('out ↓', '出 ↓')}
              </text>
            ) : null}
            <rect
              x={x(port) - 30}
              y={124}
              width={60}
              height={34}
              rx={6}
              fill="var(--netlab-bg-primary)"
              stroke="var(--netlab-border-strong)"
            />
            <text
              x={x(port)}
              y={146}
              textAnchor="middle"
              fontSize={14}
              fill="var(--netlab-text-primary)"
            >
              {hosts.length ? hosts.join(' ') : '—'}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** The switch's MAC address table at the moment `nowS`. */
function MacTable({
  entries,
  nowS,
  testId,
}: {
  entries: readonly Entry[];
  nowS: number;
  testId: string;
}) {
  const t = useT();
  if (!entries.length) {
    return (
      <p data-testid={testId} data-size={0} style={{ margin: 0, fontSize: 13 }}>
        {t('The MAC address table is empty.', 'MAC アドレステーブルは空です。')}
      </p>
    );
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        data-testid={testId}
        data-size={entries.length}
        style={{ width: '100%', borderCollapse: 'collapse' }}
      >
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
            <th style={cell}>MAC</th>
            <th style={cell}>{t('Host', 'ホスト')}</th>
            <th style={cell}>{t('Port', 'ポート')}</th>
            <th style={cell}>{t('Age', '経過')}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.mac}
              data-testid={`${testId}-${hostOf(entry.mac)}`}
              data-port={entry.port}
            >
              <td style={mono}>{entry.mac}</td>
              <td style={mono}>{hostOf(entry.mac)}</td>
              <td style={mono}>{entry.port}</td>
              <td style={mono}>{`${nowS - entry.lastSeenS} s`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function MacLearningLesson() {
  const t = useT();
  const steps = useMemo(() => replay(SCENE_ONE), []);
  const [index, setIndex] = useState(0);
  const [guesses, setGuesses] = useState<(Answer | null)[]>(() => steps.map(() => null));
  const [shown, setShown] = useState<boolean[]>(() => steps.map(() => false));
  const step = steps[index]!;
  const guess = guesses[index] ?? null;
  const revealed = shown[index]!;
  const truth = answerOf(step);
  const sceneOneDone = shown.every(Boolean);

  const [situation, setSituation] = useState<Situation>('moved');
  const [guess2, setGuess2] = useState<Record<Situation, Answer | null>>({
    moved: null,
    aged: null,
  });
  const [shown2, setShown2] = useState<Record<Situation, boolean>>({ moved: false, aged: false });
  const [idleS, setIdleS] = useState(AGED_IDLE_S);
  const moved = useMemo(() => movedScene(), []);
  const asked2 = situation === 'moved' ? moved[0]! : agedScene(AGED_IDLE_S);
  const truth2 = answerOf(asked2);
  const custom = agedScene(idleS);

  const home = Object.fromEntries(HOST_IDS.map((id) => [id, HOSTS[id].port])) as Record<
    HostId,
    number
  >;
  const afterMove = { ...home, A: 3 };

  const macOf = (dst: HostId | 'broadcast') =>
    dst === 'broadcast' ? BROADCAST_MAC : HOSTS[dst].mac;
  const dstName = (dst: HostId | 'broadcast') =>
    dst === 'broadcast' ? t('everyone', '全員') : dst;
  const answerName = (answer: Answer, ingress: number) => {
    if (answer === 'flood')
      return t(
        `Out of every port except ${ingress} (flooded)`,
        `ポート ${ingress} 以外のすべてのポートから（フラッディング）`,
      );
    if (answer === 'drop')
      return t('Out of no port: the switch drops it', 'どのポートからも出ない（破棄）');
    const port = answer.slice('port-'.length);
    return t(`Out of port ${port} only`, `ポート ${port} からだけ`);
  };

  /** Why the switch did what it did, from the model's step. */
  const why = (s: Step) => {
    const learned = t(
      `It also learns that ${s.src} (${HOSTS[s.src].mac}) is on port ${s.ingress}: a switch learns from the source address of every frame.`,
      `同時に、${s.src}（${HOSTS[s.src].mac}）がポート ${s.ingress} にいることを学習します。スイッチはすべてのフレームの送信元アドレスから学習します。`,
    );
    switch (s.reason) {
      case 'broadcast':
        return t(
          `${BROADCAST_MAC} is the broadcast address, meant for every host, so the switch floods it out of ports ${ports(s.egress)} whatever its table says. ${learned}`,
          `${BROADCAST_MAC} は全員あてのブロードキャストアドレスなので、テーブルの内容にかかわらず、ポート ${ports(s.egress)} へフラッディングします。${learned}`,
        );
      case 'unknown':
        return t(
          `The table has no entry for ${s.dst}’s MAC, so the switch cannot know where ${s.dst} is. It floods the frame out of every other port (${ports(s.egress)}); the hosts it is not for discard it. ${learned}`,
          `テーブルに ${s.dst} の MAC がないので、スイッチは ${s.dst} の場所を知りません。そこで入ってきたポート以外のすべて（${ports(s.egress)}）へフラッディングし、宛先でないホストはそれを捨てます。${learned}`,
        );
      case 'aged':
        return t(
          `The entry for ${s.dst} was not refreshed for ${AGEING_TIME_S} s, the ageing time, so it was removed. With no entry the frame is flooded out of ports ${ports(s.egress)}, exactly as on a fresh switch. ${learned}`,
          `${s.dst} のエントリはエージングタイムの ${AGEING_TIME_S} 秒間更新されなかったので、消されていました。エントリがないので、電源を入れた直後と同じく、ポート ${ports(s.egress)} へフラッディングします。${learned}`,
        );
      case 'same-port':
        return t(
          `${s.dst} is on port ${s.ingress}, the port the frame came in on, so it already reached ${s.dst}; the switch filters it. ${learned}`,
          `${s.dst} は入ってきたポート ${s.ingress} にいるので、フレームはもう届いています。スイッチは転送しません。${learned}`,
        );
      default: {
        const entry = s.tableBefore.find((e) => e.mac === macOf(s.dst))!;
        return t(
          `The table says ${s.dst} is on port ${entry.port} (learned ${s.atS - entry.lastSeenS} s ago), so the frame leaves by port ${s.egress[0]} only; the other hosts never see it. ${learned}`,
          `テーブルには ${s.dst} はポート ${entry.port} にいる（${s.atS - entry.lastSeenS} 秒前に学習）とあるので、フレームはポート ${s.egress[0]} からだけ出ます。ほかのホストには届きません。${learned}`,
        );
      }
    }
  };

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
          {t('A switch that has just been switched on', '電源を入れたばかりのスイッチ')}
        </div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'Four hosts, A to D, are plugged into ports 1 to 4 of one Ethernet switch. The switch keeps a MAC address table: which MAC address it has seen on which port, and how long ago. It starts empty. Frame by frame, predict which ports each frame leaves by.',
            '4 台のホスト A〜D が、1 台のイーサネットスイッチのポート 1〜4 につながっています。スイッチは MAC アドレステーブルを持っていて、どの MAC アドレスをどのポートで、どれくらい前に見たかを覚えています。最初は空です。フレームを 1 つずつ、どのポートから出ていくかを予想してください。',
          )}
        </p>
        <p
          style={{
            margin: '8px 0 0',
            fontSize: 13,
            fontFamily: 'monospace',
            color: 'var(--netlab-text-secondary)',
          }}
        >
          {HOST_IDS.map((id) => `${id} ${HOSTS[id].mac}`).join(' · ')}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="ml-predict">
        <div style={LESSON_LABEL}>
          {t(`Frame ${index + 1} of ${steps.length}`, `フレーム ${index + 1} / ${steps.length}`)}
        </div>
        <p
          data-testid="ml-frame"
          data-frame={index + 1}
          style={{ margin: '0 0 8px', lineHeight: 1.7 }}
        >
          {t(
            `At ${step.atS} s, ${step.src} sends a frame to ${dstName(step.dst)} (destination ${macOf(step.dst)}). It arrives on port ${step.ingress}. Which ports does it leave by?`,
            `${step.atS} 秒、${step.src} が ${dstName(step.dst)} あてにフレームを送ります（宛先 ${macOf(step.dst)}）。ポート ${step.ingress} に届きました。どのポートから出ていく？`,
          )}
        </p>
        <SwitchDiagram where={home} ingress={step.ingress} egress={revealed ? step.egress : null} />
        <div style={{ ...LESSON_LABEL, marginTop: 8 }}>
          {revealed
            ? t('MAC table after this frame', 'このフレームのあとのテーブル')
            : t('MAC table now', '今のテーブル')}
        </div>
        <MacTable
          entries={revealed ? step.tableAfter : step.tableBefore}
          nowS={step.atS}
          testId="ml-table"
        />
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6, marginTop: 10 }}
        >
          {optionsFor(step.ingress).map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={guess === answer}
              data-testid={`ml-guess-${answer}`}
              disabled={revealed}
              onClick={() => setGuesses((all) => all.map((g, i) => (i === index ? answer : g)))}
              style={{ ...lessonChoice(guess === answer), textAlign: 'left' }}
            >
              {predictionMark(answer, guess, truth, revealed)}
              {answerName(answer, step.ingress)}
            </button>
          ))}
        </div>
        {revealed ? (
          <>
            <p
              data-testid="ml-reveal"
              data-right={String(guess === truth)}
              data-egress={step.egress.join(',')}
              role="status"
              style={{ margin: '8px 0 0', lineHeight: 1.7 }}
            >
              <strong>
                {guess === truth
                  ? t('As you predicted. ', '予想どおりです。')
                  : t('Not what you predicted. ', '予想とちがいました。')}
              </strong>
              {why(step)}
            </p>
            {index < steps.length - 1 ? (
              <button
                type="button"
                data-testid="ml-next"
                style={{ ...LESSON_TEAL_BUTTON, marginTop: 8 }}
                onClick={() => setIndex(index + 1)}
              >
                {t('Next frame', '次のフレーム')}
              </button>
            ) : null}
          </>
        ) : (
          <button
            type="button"
            data-testid="ml-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setShown((all) => all.map((s, i) => (i === index ? true : s)))}
          >
            {guess
              ? t('Send the frame', 'フレームを送る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {sceneOneDone ? (
        <div style={LESSON_CARD} data-testid="ml2">
          <div style={LESSON_LABEL}>
            {t('When the table is wrong or gone', 'テーブルが古い・消えたとき')}
          </div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              'The table now knows all four hosts. Two things can make it stale. Pick one, then predict.',
              'テーブルは 4 台すべてを覚えました。テーブルが実態とずれる場面が 2 つあります。1 つ選んで予想してください。',
            )}
          </p>
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['moved', 'aged'] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={situation === id}
                data-testid={`ml2-tab-${id}`}
                onClick={() => setSituation(id)}
                style={lessonChoice(situation === id)}
              >
                {id === 'moved'
                  ? t('A host moves', 'ホストが移動する')
                  : t('Time passes', '時間がたつ')}
              </button>
            ))}
          </div>
          <p style={{ margin: '10px 0 8px', lineHeight: 1.7 }}>
            {situation === 'moved'
              ? t(
                  `A is a virtual machine. At 5 s it migrates from the server on port 1 to the server on port 3. Port 1’s link stays up, and A sends nothing after the move. At ${asked2.atS} s, B sends a frame to A. Which ports does it leave by?`,
                  `A は仮想マシンです。5 秒にポート 1 のサーバからポート 3 のサーバへ移動しました。ポート 1 のリンクは上がったままで、A は移動後なにも送っていません。${asked2.atS} 秒、B が A あてにフレームを送ります。どのポートから出ていく？`,
                )
              : t(
                  `Nobody sends anything for a while. ${AGED_IDLE_S} s after A last sent (at ${asked2.atS} s), B sends a frame to A, which is still on port 1. Which ports does it leave by?`,
                  `しばらく誰も何も送りません。A が最後に送ってから ${AGED_IDLE_S} 秒後（${asked2.atS} 秒）、B がポート 1 にいるままの A あてにフレームを送ります。どのポートから出ていく？`,
                )}
          </p>
          <SwitchDiagram
            where={situation === 'moved' ? afterMove : home}
            ingress={asked2.ingress}
            egress={shown2[situation] ? asked2.egress : null}
          />
          <div
            role="radiogroup"
            aria-label={t('Your prediction', '予想')}
            style={{ display: 'grid', gap: 6, marginTop: 10 }}
          >
            {optionsFor(asked2.ingress).map((answer) => (
              <button
                key={answer}
                type="button"
                role="radio"
                aria-checked={guess2[situation] === answer}
                data-testid={`ml2-guess-${answer}`}
                disabled={shown2[situation]}
                onClick={() => setGuess2((all) => ({ ...all, [situation]: answer }))}
                style={{ ...lessonChoice(guess2[situation] === answer), textAlign: 'left' }}
              >
                {predictionMark(answer, guess2[situation], truth2, shown2[situation])}
                {answerName(answer, asked2.ingress)}
              </button>
            ))}
          </div>
          {shown2[situation] ? (
            <p
              data-testid="ml2-reveal"
              data-situation={situation}
              data-right={String(guess2[situation] === truth2)}
              data-egress={asked2.egress.join(',')}
              data-delivered={String(asked2.delivered)}
              role="status"
              style={{ margin: '8px 0 0', lineHeight: 1.7 }}
            >
              <strong>
                {guess2[situation] === truth2
                  ? t('As you predicted. ', '予想どおりです。')
                  : t('Not what you predicted. ', '予想とちがいました。')}
              </strong>
              {situation === 'moved'
                ? t(
                    `Port ${ports(asked2.egress)} only, and A is no longer there, so A never gets the frame. The table still says A is on port 1: nothing has told the switch otherwise, because a switch learns only from frames. At ${moved[1]!.atS} s A sends one frame, from port ${moved[1]!.ingress}; the entry moves to port ${moved[1]!.ingress}, and at ${moved[2]!.atS} s B → A leaves by port ${ports(moved[2]!.egress)}. That is why a hypervisor sends a frame for a VM (often a RARP or gratuitous ARP) the moment it arrives.`,
                    `ポート ${ports(asked2.egress)} からだけ出ますが、A はもうそこにいないので、A には届きません。テーブルにはまだ A はポート 1 とあります。スイッチはフレームからしか学習しないので、移動を知るすべがありません。${moved[1]!.atS} 秒に A がポート ${moved[1]!.ingress} から 1 つ送ると、エントリはポート ${moved[1]!.ingress} に移り、${moved[2]!.atS} 秒の B → A はポート ${ports(moved[2]!.egress)} から出ます。だからハイパーバイザは、VM が移ってきた瞬間にその VM のフレーム（RARP や GARP が多い）を送ります。`,
                  )
                : why(asked2)}
            </p>
          ) : (
            <button
              type="button"
              data-testid="ml2-reveal-button"
              disabled={!guess2[situation]}
              style={{
                ...(guess2[situation] ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED),
                marginTop: 8,
              }}
              onClick={() => setShown2((all) => ({ ...all, [situation]: true }))}
            >
              {guess2[situation]
                ? t('Send the frame', 'フレームを送る')
                : t('Predict first', '先に予想を選んでください')}
            </button>
          )}

          {situation === 'aged' && shown2.aged ? (
            <div style={{ marginTop: 10 }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {t('Seconds since A last sent', 'A が最後に送ってからの秒数')}
                <input
                  type="range"
                  min={10}
                  max={600}
                  step={10}
                  value={idleS}
                  data-testid="ml2-idle"
                  onChange={(event) => setIdleS(Number(event.target.value))}
                  style={{ minHeight: 44 }}
                />
                <span style={{ fontFamily: 'monospace' }}>{`${idleS} s`}</span>
              </label>
              <p
                data-testid="ml2-aged-result"
                data-egress={custom.egress.join(',')}
                data-kind={custom.kind}
                style={{ margin: '8px 0 0', fontWeight: 700 }}
              >
                {custom.kind === 'flood'
                  ? t(
                      `Aged out: B → A is flooded out of ports ${ports(custom.egress)}.`,
                      `エージングで消えています。B → A はポート ${ports(custom.egress)} へフラッディングされます。`,
                    )
                  : t(
                      `Still in the table: B → A leaves by port ${ports(custom.egress)} only.`,
                      `まだテーブルにあります。B → A はポート ${ports(custom.egress)} からだけ出ます。`,
                    )}
              </p>
            </div>
          ) : null}
          <p
            style={{
              margin: '10px 0 0',
              fontSize: 13,
              color: 'var(--netlab-text-secondary)',
              lineHeight: 1.7,
            }}
          >
            {t(
              `Learning, forwarding and ageing follow IEEE 802.1Q-2022 §8.7–8.8; ${AGEING_TIME_S} s is its recommended default ageing time, which most switches use and which can be configured. Simplified here: one VLAN, no spanning tree, an unlimited table, and ageing checked exactly when a frame arrives (real switches sweep their table now and then, so an entry can last a little longer). Many switches also clear a port’s entries when its link goes down, which is why port 1 stays up in the move. A was last heard at ${A_LAST_SENT_S} s.`,
              `学習・転送・エージングは IEEE 802.1Q-2022 の 8.7〜8.8 節にしたがっています。${AGEING_TIME_S} 秒はこの規格が推奨するエージングタイムの初期値で、多くのスイッチがこの値を使い、設定で変えられます。ここでは簡略化のため、VLAN は 1 つ、スパニングツリーなし、テーブルの上限なし、エージングはフレームが届いた瞬間に判定しています（実機はときどきテーブルを見回るので、エントリが少し長く残ることがあります）。リンクが落ちたポートのエントリを消すスイッチも多いので、移動の例ではポート 1 のリンクを上げたままにしています。A が最後に送ったのは ${A_LAST_SENT_S} 秒です。`,
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function MacLearningDemo() {
  return (
    <DemoShell
      title="MAC learning"
      desc="How an Ethernet switch decides which ports a frame leaves by, frame by frame"
    >
      <MacLearningLesson />
    </DemoShell>
  );
}
