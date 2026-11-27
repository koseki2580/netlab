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
  CLASSES,
  CONNECTOR_DB,
  FIBRE_DB_PER_KM,
  FRAME_US,
  STAGE_DB,
  TECHS,
  budget,
  dbaGrants,
  frameBytes,
  share,
  splitterLoss,
  type Budget,
  type OpticalClass,
  type TechId,
} from './pon';

const SPLIT = 32;
const ASKED_PLANT = { split: SPLIT, km: 20, connectors: 4 };
const SPLITS = [8, 16, 32, 64] as const;
const OTHER_DEMANDS = [500, 4000, 6000] as const;

type ShareAnswer = 'line-rate' | 'one-gig' | 'divided';
const SHARE_ANSWERS: readonly ShareAnswer[] = ['line-rate', 'one-gig', 'divided'];
type LossAnswer = 'tiny' | 'one-stage' | 'stages';
const LOSS_ANSWERS: readonly LossAnswer[] = ['tiny', 'one-stage', 'stages'];
type UpAnswer = 'wavelengths' | 'grants' | 'listen';
const UP_ANSWERS: readonly UpAnswer[] = ['wavelengths', 'listen', 'grants'];

const SHARE_OF: Record<ShareAnswer, number> = {
  'line-rate': TECHS.xgspon.downMbps,
  'one-gig': 1000,
  divided: share('xgspon', SPLIT).downMbps,
};
const LOSS_OF: Record<LossAnswer, number> = {
  tiny: 0.5,
  'one-stage': STAGE_DB,
  stages: splitterLoss(SPLIT).typicalDb,
};

/** The option nearest a value, on a log scale. */
function nearest<K extends string>(options: Record<K, number>, value: number): K {
  const keys = Object.keys(options) as K[];
  return keys.reduce((best, key) =>
    Math.abs(Math.log(options[key] / value)) < Math.abs(Math.log(options[best] / value))
      ? key
      : best,
  );
}

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };
const db = (value: number) => `${value.toFixed(1)} dB`;
const rate = (mbps: number) =>
  mbps >= 1000 ? `${(mbps / 1000).toFixed(2)} Gb/s` : `${mbps.toFixed(1)} Mb/s`;
const techName = (id: TechId) => (id === 'gpon' ? 'GPON' : 'XGS-PON');

const BAR_W = 360;
const BAR_MAX_DB = 40;

/** The plant's loss against the class's window of allowed loss. */
function LossBar({ result, cls }: { result: Budget; cls: OpticalClass }) {
  const t = useT();
  const x = (value: number) => (Math.min(value, BAR_MAX_DB) / BAR_MAX_DB) * BAR_W;
  const parts = [
    { db: result.splitterDb, color: 'var(--netlab-accent-cyan)' },
    { db: result.fibreDb, color: 'var(--netlab-accent-green)' },
    { db: result.connectorDb, color: 'var(--netlab-accent-yellow)' },
  ];
  let at = 0;
  return (
    <svg
      data-testid="pn-bar"
      viewBox={`-10 0 ${BAR_W + 20} 78`}
      style={{ width: '100%', maxWidth: 560 }}
      role="img"
      aria-label={t(
        `${db(result.totalDb)} of loss; class ${cls.id} allows ${cls.minDb} to ${cls.maxDb} dB`,
        `損失 ${db(result.totalDb)}。クラス ${cls.id} の範囲は ${cls.minDb}〜${cls.maxDb} dB`,
      )}
    >
      <rect
        x={x(cls.minDb)}
        y={6}
        width={x(cls.maxDb) - x(cls.minDb)}
        height={40}
        fill="var(--netlab-bg-elevated)"
        stroke="var(--netlab-border-strong)"
        strokeDasharray="4 3"
      />
      {parts.map((part, i) => {
        const start = at;
        at += part.db;
        return (
          <rect
            key={i}
            x={x(start)}
            y={16}
            width={Math.max(0, x(at) - x(start))}
            height={20}
            fill={part.color}
          />
        );
      })}
      <text
        x={x(cls.minDb)}
        y={62}
        textAnchor="middle"
        fontSize={12}
        fill="var(--netlab-text-secondary)"
      >
        {`${cls.minDb}`}
      </text>
      <text
        x={x(cls.maxDb)}
        y={62}
        textAnchor="middle"
        fontSize={12}
        fill="var(--netlab-text-secondary)"
      >
        {`${cls.maxDb} dB`}
      </text>
      <text x={0} y={62} fontSize={12} fill="var(--netlab-text-secondary)">
        0
      </text>
      <text x={BAR_W} y={76} textAnchor="end" fontSize={12} fill="var(--netlab-text-secondary)">
        {t(`class ${cls.id} window dashed`, `点線の枠がクラス ${cls.id} の範囲`)}
      </text>
    </svg>
  );
}

/** One upstream frame, with each ONU's burst where the OLT placed it. */
function Timeline({ demands }: { demands: readonly number[] }) {
  const t = useT();
  const grants = dbaGrants('xgspon', demands);
  const x = (us: number) => (us / FRAME_US) * BAR_W;
  const colors = [
    'var(--netlab-accent-cyan)',
    'var(--netlab-accent-green)',
    'var(--netlab-accent-yellow)',
    'var(--netlab-accent-purple)',
  ];
  return (
    <svg
      data-testid="pn-timeline"
      viewBox={`-10 0 ${BAR_W + 20} 70`}
      style={{ width: '100%', maxWidth: 560 }}
      role="img"
      aria-label={t(
        'One 125 µs upstream frame shared by the ONUs in turn',
        '1 つの 125 µs の上りフレームを ONU が順番に使います',
      )}
    >
      {grants.map((g, i) => (
        <g key={g.onu}>
          <rect
            x={x(g.startUs)}
            y={8}
            width={Math.max(0, x(g.endUs) - x(g.startUs))}
            height={28}
            fill={colors[i % colors.length]}
            stroke="var(--netlab-bg-primary)"
          />
          {x(g.endUs) - x(g.startUs) >= 34 ? (
            <text
              x={(x(g.startUs) + x(g.endUs)) / 2}
              y={27}
              textAnchor="middle"
              fontSize={12}
              fontFamily="monospace"
              fill="var(--netlab-bg-primary)"
            >
              {`ONU${g.onu}`}
            </text>
          ) : null}
        </g>
      ))}
      <text x={0} y={54} fontSize={12} fill="var(--netlab-text-secondary)">
        0 µs
      </text>
      <text x={BAR_W} y={54} textAnchor="end" fontSize={12} fill="var(--netlab-text-secondary)">
        {`${FRAME_US} µs`}
      </text>
    </svg>
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

function Verdict({ right }: { right: boolean }) {
  const t = useT();
  return (
    <strong>
      {right
        ? t('As you predicted. ', '予想どおりです。')
        : t('Not what you predicted. ', '予想とちがいました。')}
    </strong>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function PonLesson() {
  const t = useT();
  const [shareGuess, setShareGuess] = useState<ShareAnswer | null>(null);
  const [shareRevealed, setShareRevealed] = useState(false);
  const [tech, setTech] = useState<TechId>('xgspon');
  const [busy, setBusy] = useState(SPLIT);
  const [lossGuess, setLossGuess] = useState<LossAnswer | null>(null);
  const [lossRevealed, setLossRevealed] = useState(false);
  const [plant, setPlant] = useState(ASKED_PLANT);
  const [classId, setClassId] = useState('N1');
  const [upGuess, setUpGuess] = useState<UpAnswer | null>(null);
  const [upRevealed, setUpRevealed] = useState(false);
  const [onu1, setOnu1] = useState(8000);

  const xgs = TECHS.xgspon;
  const asked = share('xgspon', SPLIT);
  const shareTruth = nearest(SHARE_OF, asked.downMbps);
  const mineShare = share(tech, busy);
  const loss32 = splitterLoss(SPLIT);
  const lossTruth = nearest(LOSS_OF, loss32.typicalDb);
  const cls = CLASSES.find((c) => c.id === classId)!;
  const mine = budget(plant, cls);
  const askedBudget = budget(ASKED_PLANT, CLASSES.find((c) => c.id === 'N1')!);
  const demands = [onu1, ...OTHER_DEMANDS];
  const grants = dbaGrants('xgspon', demands);
  // The OLT's grants never overlap: the ONUs take turns in time.
  const upTruth: UpAnswer = grants.every((g, i) => i === 0 || g.startUs >= grants[i - 1]!.endUs)
    ? 'grants'
    : 'listen';

  const shareName = (id: ShareAnswer) =>
    ({
      'line-rate': t(
        `About ${rate(SHARE_OF['line-rate'])} each`,
        `1 軒あたり約 ${rate(SHARE_OF['line-rate'])}`,
      ),
      'one-gig': t(
        `About ${rate(SHARE_OF['one-gig'])} each`,
        `1 軒あたり約 ${rate(SHARE_OF['one-gig'])}`,
      ),
      divided: t(`About ${rate(SHARE_OF.divided)} each`, `1 軒あたり約 ${rate(SHARE_OF.divided)}`),
    })[id];
  const lossName = (id: LossAnswer) =>
    ({
      tiny: t('Under 1 dB: it is passive glass', '1 dB 未満（ただのガラスだから）'),
      'one-stage': t(
        `About ${db(LOSS_OF['one-stage'])}, whatever the split`,
        `分岐数に関係なく約 ${db(LOSS_OF['one-stage'])}`,
      ),
      stages: t(`About ${db(LOSS_OF.stages)}`, `約 ${db(LOSS_OF.stages)}`),
    })[id];
  const upName = (id: UpAnswer) =>
    ({
      wavelengths: t('Each home transmits on its own wavelength', '家ごとに別の波長で送る'),
      listen: t(
        'Each ONU listens and sends when the fibre is quiet, as early Ethernet did',
        '昔のイーサネットのように、空いているのを確かめてから送る',
      ),
      grants: t(
        'The OLT tells each ONU when, and for how long, it may send',
        'OLT が各 ONU に、いつ・どれだけ送ってよいかを指示する',
      ),
    })[id];
  const verdictText = (b: Budget) =>
    b.verdict === 'over'
      ? t(
          `${db(b.totalDb)}: ${db(-b.marginDb)} more loss than class ${cls.id} allows. The light is too weak.`,
          `${db(b.totalDb)}。クラス ${cls.id} の上限を ${db(-b.marginDb)} 超えています。光が弱すぎます。`,
        )
      : b.verdict === 'under'
        ? t(
            `${db(b.totalDb)}: below class ${cls.id}’s minimum of ${cls.minDb} dB. The light is too strong and can overload the receiver; an attenuator is added.`,
            `${db(b.totalDb)}。クラス ${cls.id} の下限 ${cls.minDb} dB を下回っています。光が強すぎて受信器が飽和しかねないので、減衰器を入れます。`,
          )
        : t(
            `${db(b.totalDb)}: within class ${cls.id}, ${db(b.marginDb)} below its ${cls.maxDb} dB maximum.`,
            `${db(b.totalDb)}。クラス ${cls.id} の範囲内で、上限 ${cls.maxDb} dB まで ${db(b.marginDb)} あります。`,
          );

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
        <div style={LESSON_LABEL}>{t('Fibre to the home', '光回線の仕組み')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `Most fibre to the home is a passive optical network (PON). In the provider’s building, one port of an OLT (optical line terminal) drives one fibre. Out near the homes, an optical splitter, with no power and no electronics, divides that fibre into ${SPLIT}. Each home has an ONU (optical network unit) at its end. Downstream the OLT sends on one wavelength (${xgs.downNm} nm for XGS-PON); upstream every ONU sends on another (${xgs.upNm} nm) into the same fibre.`,
            `家庭向けの光回線の多くは PON（パッシブ光ネットワーク）です。事業者の局舎では、OLT（局側の光回線終端装置）の 1 ポートが 1 本のファイバを受け持ちます。家の近くでは、電源も電子回路も持たない光スプリッタがそのファイバを ${SPLIT} 本に分けます。各家庭の端には ONU（宅内側の光回線終端装置）があります。下りは OLT が 1 つの波長（XGS-PON では ${xgs.downNm} nm）で送り、上りはすべての ONU が別の波長（${xgs.upNm} nm）で同じファイバに送ります。`,
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="pn-share-card">
        <div style={LESSON_LABEL}>{t('Predict first: the speed', 'まず予想：速さ')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `The OLT port runs XGS-PON, whose line rate is ${rate(xgs.downMbps)} downstream. Behind its 1:${SPLIT} splitter are ${SPLIT} homes, each sold a “10 Gb/s” plan. In the evening all ${SPLIT} download as fast as they can at once. At most, what does each home get downstream?`,
            `OLT のポートは XGS-PON で、下りの回線速度は ${rate(xgs.downMbps)} です。1:${SPLIT} のスプリッタの先に ${SPLIT} 軒あり、どの家も「10 Gb/s」のプランを契約しています。夜、${SPLIT} 軒が一斉に全力でダウンロードします。1 軒が下りで得られるのは最大どれくらい？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {SHARE_ANSWERS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={shareGuess === id}
              data-testid={`pn-guess-${id}`}
              disabled={shareRevealed}
              onClick={() => setShareGuess(id)}
              style={{ ...lessonChoice(shareGuess === id), textAlign: 'left' }}
            >
              {predictionMark(id, shareGuess, shareTruth, shareRevealed)}
              {shareName(id)}
            </button>
          ))}
        </div>
        {shareRevealed ? (
          <>
            <p
              data-testid="pn-reveal"
              data-right={String(shareGuess === shareTruth)}
              data-down={asked.downMbps}
              role="status"
              style={{ margin: '8px 0 0', lineHeight: 1.7 }}
            >
              <Verdict right={shareGuess === shareTruth} />
              {t(
                `${rate(asked.downMbps)}. The splitter cannot switch anything: it sends the OLT’s light to all ${SPLIT} homes, so one ${rate(xgs.downMbps)} stream carries everyone’s traffic and ${rate(xgs.downMbps)} ÷ ${SPLIT} = ${rate(asked.downMbps)}. Every ONU receives every frame and keeps only its own; unicast downstream traffic is encrypted (AES-128) with a key per ONU, so neighbours cannot read each other’s. The “10 Gb/s” is what one home gets when the others are quiet, which is most of the time.`,
                `${rate(asked.downMbps)} です。スプリッタは何も切り替えられず、OLT の光を ${SPLIT} 軒すべてに届けます。つまり 1 本の ${rate(xgs.downMbps)} の流れで全員の通信を運ぶので、${rate(xgs.downMbps)} ÷ ${SPLIT} = ${rate(asked.downMbps)} です。どの ONU もすべてのフレームを受け取り、自分あての分だけを取り出します。下りのユニキャスト通信は ONU ごとの鍵で暗号化（AES-128）されているので、隣の家の通信は読めません。「10 Gb/s」は、ほかの家が静かなときに 1 軒が得られる速さで、たいていの時間はそうなっています。`,
              )}
            </p>
            <div
              role="tablist"
              style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}
            >
              {(['xgspon', 'gpon'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tech === id}
                  data-testid={`pn-tech-${id}`}
                  onClick={() => setTech(id)}
                  style={lessonChoice(tech === id)}
                >
                  {techName(id)}
                </button>
              ))}
            </div>
            <label
              style={{
                display: 'flex',
                gap: 6,
                alignItems: 'center',
                flexWrap: 'wrap',
                marginTop: 6,
              }}
            >
              {t('Homes busy at once', '同時に使う家')}
              <input
                type="range"
                min={1}
                max={64}
                value={busy}
                data-testid="pn-busy"
                onChange={(event) => setBusy(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{t(`${busy}`, `${busy} 軒`)}</span>
            </label>
            <p
              data-testid="pn-share"
              data-down={mineShare.downMbps}
              data-up={mineShare.upMbps}
              style={{ margin: '4px 0 0', fontWeight: 700, lineHeight: 1.7 }}
            >
              {t(
                `${techName(tech)}: ${rate(mineShare.downMbps)} down and ${rate(mineShare.upMbps)} up each (line rate ${rate(TECHS[tech].downMbps)} / ${rate(TECHS[tech].upMbps)}).`,
                `${techName(tech)}：1 軒あたり下り ${rate(mineShare.downMbps)}、上り ${rate(mineShare.upMbps)}（回線速度 ${rate(TECHS[tech].downMbps)} / ${rate(TECHS[tech].upMbps)}）。`,
              )}
            </p>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 13,
                color: 'var(--netlab-text-secondary)',
                lineHeight: 1.7,
              }}
            >
              {t(
                'These are line rates: framing and error correction take a part of them, so what arrives is somewhat less.',
                'これは回線速度です。フレーム化や誤り訂正の分が差し引かれるので、実際に届くのはもう少し少なくなります。',
              )}
            </p>
          </>
        ) : (
          <RevealButton
            testId="pn-reveal-button"
            ready={shareGuess !== null}
            label={t('Share the fibre', 'ファイバを分け合う')}
            onClick={() => setShareRevealed(true)}
          />
        )}
      </div>

      <div style={LESSON_CARD} data-testid="pn-loss-card">
        <div style={LESSON_LABEL}>
          {t('Predict: the splitter’s loss', '予想：スプリッタの損失')}
        </div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `The 1:${SPLIT} splitter divides the light equally among its ${SPLIT} outputs, and a real splitter loses a little more than that (excess loss). How much weaker is the light on one output than at the input, typically?`,
            `1:${SPLIT} のスプリッタは光を ${SPLIT} の出力に均等に分け、実物はそれに加えて少し余分に失います（過剰損失）。1 つの出力の光は、入力より一般的にどれだけ弱くなる？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {LOSS_ANSWERS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={lossGuess === id}
              data-testid={`pn-loss-guess-${id}`}
              disabled={lossRevealed}
              onClick={() => setLossGuess(id)}
              style={{ ...lessonChoice(lossGuess === id), textAlign: 'left' }}
            >
              {predictionMark(id, lossGuess, lossTruth, lossRevealed)}
              {lossName(id)}
            </button>
          ))}
        </div>
        {lossRevealed ? (
          <p
            data-testid="pn-loss-reveal"
            data-right={String(lossGuess === lossTruth)}
            data-loss={loss32.typicalDb}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <Verdict right={lossGuess === lossTruth} />
            {t(
              `About ${db(loss32.typicalDb)}. Each output gets 1/${SPLIT} of the light, and 10 × log₁₀(${SPLIT}) = ${db(loss32.idealDb)} even for a perfect splitter. A 1:${SPLIT} splitter works like ${Math.log2(SPLIT)} stages of 1:2, each typically about ${db(STAGE_DB)} with its excess loss: ${Math.log2(SPLIT)} × ${STAGE_DB} = ${db(loss32.typicalDb)}. That one part loses as much as ${Math.round(loss32.typicalDb / FIBRE_DB_PER_KM)} km of fibre.`,
              `約 ${db(loss32.typicalDb)} です。各出力に届くのは光の 1/${SPLIT} なので、理想的なスプリッタでも 10 × log₁₀(${SPLIT}) = ${db(loss32.idealDb)} 失います。1:${SPLIT} は 1:2 を ${Math.log2(SPLIT)} 段重ねたのと同じで、過剰損失を含めて 1 段あたり一般的に約 ${db(STAGE_DB)}、${Math.log2(SPLIT)} × ${STAGE_DB} = ${db(loss32.typicalDb)} です。この部品 1 つで、ファイバ ${Math.round(loss32.typicalDb / FIBRE_DB_PER_KM)} km 分と同じだけ失います。`,
            )}
          </p>
        ) : (
          <RevealButton
            testId="pn-loss-reveal-button"
            ready={lossGuess !== null}
            label={t('Measure the outputs', '出力を測る')}
            onClick={() => setLossRevealed(true)}
          />
        )}
      </div>

      {lossRevealed ? (
        <div style={LESSON_CARD} data-testid="pn-budget-card">
          <div style={LESSON_LABEL}>{t('The optical budget', '光の損失バジェット')}</div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              `The standards give each optical class a window of loss between OLT and ONU that its optics must work across. With ${ASKED_PLANT.km} km of fibre and ${ASKED_PLANT.connectors} connectors, the 1:${SPLIT} plant loses ${db(askedBudget.totalDb)}, inside XGS-PON class N1 (14–29 dB). Change the plant:`,
              `規格は光のクラスごとに、OLT と ONU の間で許される損失の範囲を決めていて、光モジュールはその範囲で動かなければなりません。ファイバ ${ASKED_PLANT.km} km、コネクタ ${ASKED_PLANT.connectors} 個の 1:${SPLIT} の設備では損失は ${db(askedBudget.totalDb)} で、XGS-PON のクラス N1（14〜29 dB）に収まります。設備を変えてみてください。`,
            )}
          </p>
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SPLITS.map((split) => (
              <button
                key={split}
                type="button"
                role="tab"
                aria-selected={plant.split === split}
                data-testid={`pn-split-${split}`}
                onClick={() => setPlant((p) => ({ ...p, split }))}
                style={lessonChoice(plant.split === split)}
              >
                {`1:${split}`}
              </button>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'center',
              marginTop: 6,
            }}
          >
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {t('Fibre', 'ファイバ')}
              <input
                type="range"
                min={0}
                max={40}
                value={plant.km}
                data-testid="pn-km"
                onChange={(event) => setPlant((p) => ({ ...p, km: Number(event.target.value) }))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{`${plant.km} km`}</span>
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {t('Connectors', 'コネクタ')}
              <input
                type="range"
                min={2}
                max={8}
                value={plant.connectors}
                data-testid="pn-connectors"
                onChange={(event) =>
                  setPlant((p) => ({ ...p, connectors: Number(event.target.value) }))
                }
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{plant.connectors}</span>
            </label>
          </div>
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {CLASSES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={classId === c.id}
                data-testid={`pn-class-${c.id}`}
                onClick={() => setClassId(c.id)}
                style={lessonChoice(classId === c.id)}
              >
                {`${techName(c.tech)} ${c.id}`}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={cell}>
                    {t(`Splitter 1:${plant.split}`, `スプリッタ 1:${plant.split}`)}
                  </td>
                  <td style={mono}>{db(mine.splitterDb)}</td>
                </tr>
                <tr>
                  <td style={cell}>
                    {t(
                      `Fibre, ${plant.km} km × ${FIBRE_DB_PER_KM} dB/km`,
                      `ファイバ ${plant.km} km × ${FIBRE_DB_PER_KM} dB/km`,
                    )}
                  </td>
                  <td style={mono}>{db(mine.fibreDb)}</td>
                </tr>
                <tr>
                  <td style={cell}>
                    {t(
                      `Connectors, ${plant.connectors} × ${CONNECTOR_DB} dB`,
                      `コネクタ ${plant.connectors} × ${CONNECTOR_DB} dB`,
                    )}
                  </td>
                  <td style={mono}>{db(mine.connectorDb)}</td>
                </tr>
                <tr>
                  <td style={{ ...cell, fontWeight: 700 }}>{t('Total', '合計')}</td>
                  <td style={{ ...mono, fontWeight: 700 }}>{db(mine.totalDb)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <LossBar result={mine} cls={cls} />
          <p
            data-testid="pn-budget"
            data-total={mine.totalDb}
            data-margin={mine.marginDb}
            data-verdict={mine.verdict}
            style={{ margin: '4px 0 0', fontWeight: 700, lineHeight: 1.7 }}
          >
            {verdictText(mine)}
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
              `Class windows: GPON B+ 13–28 dB and C+ 17–32 dB (ITU-T G.984.2); XGS-PON N1 14–29, N2 16–31, E1 18–33, E2 20–35 dB (ITU-T G.9807.1). The losses are typical values for this lesson (${STAGE_DB} dB per 1:2 stage, ${FIBRE_DB_PER_KM} dB/km, ${CONNECTOR_DB} dB per connector); real designs use the worst-case figures of the parts installed and keep some margin for repairs. A bigger split or a longer fibre needs a higher class, which means stronger, costlier optics.`,
              `クラスの範囲：GPON の B+ は 13〜28 dB、C+ は 17〜32 dB（ITU-T G.984.2）、XGS-PON の N1 は 14〜29、N2 は 16〜31、E1 は 18〜33、E2 は 20〜35 dB（ITU-T G.9807.1）。損失はこのレッスンで使う代表的な値です（1:2 の 1 段あたり ${STAGE_DB} dB、${FIBRE_DB_PER_KM} dB/km、コネクタ 1 個 ${CONNECTOR_DB} dB）。実際の設計では設置する部品の最悪値を使い、修理に備えて余裕も残します。分岐を増やしたりファイバを延ばしたりするには上のクラス、つまり強くて高価な光モジュールが要ります。`,
            )}
          </p>
        </div>
      ) : null}

      <div style={LESSON_CARD} data-testid="pn-up-card">
        <div style={LESSON_LABEL}>{t('Predict: the way back', '予想：上りの通信')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `Upstream, the splitter works in reverse and combines the light of all ${SPLIT} ONUs into the one fibre to the OLT. All of them use the same upstream wavelength, and if two sent at the same moment their light would mix and both would be lost. ONUs cannot hear one another, since each one’s light goes only up to the OLT. How do they share the upstream?`,
            `上りでは、スプリッタが逆向きに働き、${SPLIT} 台の ONU の光を OLT へ向かう 1 本のファイバにまとめます。どの ONU も同じ上りの波長を使うので、2 台が同時に送ると光が混ざって両方とも失われます。各 ONU の光は OLT へ上るだけなので、ONU どうしはお互いの送信を聞けません。上りはどう分け合う？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {UP_ANSWERS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={upGuess === id}
              data-testid={`pn-up-guess-${id}`}
              disabled={upRevealed}
              onClick={() => setUpGuess(id)}
              style={{ ...lessonChoice(upGuess === id), textAlign: 'left' }}
            >
              {predictionMark(id, upGuess, upTruth, upRevealed)}
              {upName(id)}
            </button>
          ))}
        </div>
        {upRevealed ? (
          <>
            <p
              data-testid="pn-up-reveal"
              data-right={String(upGuess === upTruth)}
              role="status"
              style={{ margin: '8px 0 0', lineHeight: 1.7 }}
            >
              <Verdict right={upGuess === upTruth} />
              {t(
                `The OLT grants time. Upstream is cut into ${FRAME_US} µs frames (${frameBytes('xgspon').toLocaleString('en')} bytes each at XGS-PON’s ${rate(xgs.upMbps)}), and the OLT tells each ONU where its burst starts and ends (TDMA). ONUs report how much they have queued, and dynamic bandwidth assignment (DBA) sizes the next grants. Listening cannot work, because no ONU can hear the others; a wavelength per home is a different, costlier design (WDM-PON). Below, four busy ONUs share one frame.`,
                `OLT が時間を割り当てます。上りは ${FRAME_US} µs ごとのフレームに区切られ（XGS-PON の ${rate(xgs.upMbps)} で 1 フレーム ${frameBytes('xgspon').toLocaleString('ja')} バイト）、OLT が各 ONU にバーストの始まりと終わりを指示します（TDMA）。ONU は自分の待ち行列にどれだけたまっているかを報告し、DBA（動的帯域割り当て）が次の割り当ての大きさを決めます。ONU どうしはお互いを聞けないので、空きを確かめて送る方式は使えません。家ごとに波長を分けるのは WDM-PON という別の、より高価な方式です。下では、忙しい 4 台の ONU が 1 つのフレームを分け合います。`,
              )}
            </p>
            <label
              style={{
                display: 'flex',
                gap: 6,
                alignItems: 'center',
                flexWrap: 'wrap',
                marginTop: 8,
              }}
            >
              {t('ONU1 wants', 'ONU1 の要求')}
              <input
                type="range"
                min={0}
                max={10000}
                step={100}
                value={onu1}
                data-testid="pn-onu1"
                onChange={(event) => setOnu1(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{rate(onu1)}</span>
            </label>
            <div style={{ overflowX: 'auto', marginTop: 6 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                    <th style={cell}>ONU</th>
                    <th style={cell}>{t('Wants', '要求')}</th>
                    <th style={cell}>{t('Granted', '割り当て')}</th>
                    <th style={cell}>{t('Burst in each frame', '各フレームでの送信時間')}</th>
                  </tr>
                </thead>
                <tbody>
                  {grants.map((g) => (
                    <tr key={g.onu} data-testid={`pn-grant-${g.onu}`} data-grant={g.grantMbps}>
                      <td style={mono}>{`ONU${g.onu}`}</td>
                      <td style={mono}>{rate(g.demandMbps)}</td>
                      <td style={mono}>{rate(g.grantMbps)}</td>
                      <td style={mono}>{`${g.startUs.toFixed(1)}–${g.endUs.toFixed(1)} µs`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Timeline demands={demands} />
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 13,
                color: 'var(--netlab-text-secondary)',
                lineHeight: 1.7,
              }}
            >
              {t(
                'Simplified: the grants here are a fair share (an ONU asking for less than an equal share gets what it asks, the rest split the remainder equally), and the guard time and preamble before each burst are left out. Real DBA gives each service fixed, assured, non-assured and best-effort parts.',
                '簡略化しています。ここでの割り当ては公平な分け方（均等な取り分より少なく求める ONU には求めた分を、残りはほかの ONU で均等に分ける）で、各バーストの前のガードタイムやプリアンブルは省いています。実際の DBA は、サービスごとに固定・保証・非保証・ベストエフォートの部分を割り当てます。',
              )}
            </p>
          </>
        ) : (
          <RevealButton
            testId="pn-up-reveal-button"
            ready={upGuess !== null}
            label={t('Watch the upstream', '上りを見る')}
            onClick={() => setUpRevealed(true)}
          />
        )}
      </div>
    </div>
  );
}

export default function PonDemo() {
  return (
    <DemoShell
      title="Passive optical networks"
      desc="How one fibre from the provider is shared by the homes behind an optical splitter"
    >
      <PonLesson />
    </DemoShell>
  );
}
