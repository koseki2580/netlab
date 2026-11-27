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
  ASKED_LINK,
  CONNECTOR_DB,
  C_BAND_NM,
  FIBRES,
  GRID_ANCHOR_THZ,
  SPLICE_DB,
  SPLICE_EVERY_KM,
  THIN_MARGIN_DB,
  budget,
  dwdmGrid,
  lossLimitedKm,
  nmOf,
  powerProfile,
  thzOf,
  type FibreId,
  type Link,
  type Verdict,
} from './optical';
import { opticalChallenges } from './opticalChallenges';

type CountAnswer = 'about-2' | 'about-40' | 'about-400';
const COUNT_ANSWERS: readonly CountAnswer[] = ['about-2', 'about-40', 'about-400'];
const COUNT_OF: Record<CountAnswer, number> = { 'about-2': 2, 'about-40': 40, 'about-400': 400 };
const VERDICTS: readonly Verdict[] = ['down', 'thin', 'comfortable'];
const FIBRE_IDS: readonly FibreId[] = ['smf-1310', 'smf-1550', 'mmf-850'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

const db = (value: number) => `${value.toFixed(1)} dB`;
const dbm = (value: number) => `${value.toFixed(1)} dBm`;
const distance = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`);

/** The option nearest a channel count, on a log scale. */
function countAnswerOf(count: number): CountAnswer {
  return COUNT_ANSWERS.reduce((best, id) =>
    Math.abs(Math.log(COUNT_OF[id] / count)) < Math.abs(Math.log(COUNT_OF[best] / count))
      ? id
      : best,
  );
}

const CHART_W = 360;
const CHART_H = 120;

/** Optical power along the link against the receiver's sensitivity. */
function PowerChart({ link }: { link: Link }) {
  const t = useT();
  const fibre = FIBRES[link.fibre];
  const points = powerProfile(link);
  const result = budget(link);
  const top = Math.ceil(fibre.txDbm + 1);
  const bottom = Math.floor(Math.min(fibre.sensitivityDbm, result.rxDbm) - 2);
  const x = (km: number) => (km / link.km) * CHART_W;
  const y = (value: number) => ((top - value) / (top - bottom)) * CHART_H;
  const sensY = y(fibre.sensitivityDbm);
  return (
    <svg
      data-testid="op-chart"
      viewBox={`-62 -8 ${CHART_W + 72} ${CHART_H + 34}`}
      style={{ width: '100%', maxWidth: 520 }}
      role="img"
      aria-label={t(
        `Power falls from ${dbm(fibre.txDbm)} to ${dbm(result.rxDbm)} over ${distance(link.km)}; the receiver needs ${dbm(fibre.sensitivityDbm)}`,
        `${distance(link.km)} の間に光パワーは ${dbm(fibre.txDbm)} から ${dbm(result.rxDbm)} へ下がります。受信には ${dbm(fibre.sensitivityDbm)} が必要です`,
      )}
    >
      {[top, fibre.sensitivityDbm, bottom].map((value) => (
        <text
          key={value}
          x={-6}
          y={y(value) + 4}
          textAnchor="end"
          fontSize={12}
          fill="var(--netlab-text-secondary)"
        >
          {`${value} dBm`}
        </text>
      ))}
      <line x1={0} x2={0} y1={0} y2={CHART_H} stroke="var(--netlab-border)" />
      <line x1={0} x2={CHART_W} y1={CHART_H} y2={CHART_H} stroke="var(--netlab-border)" />
      <line
        x1={0}
        x2={CHART_W}
        y1={sensY}
        y2={sensY}
        stroke="var(--netlab-accent-red)"
        strokeDasharray="6 4"
        strokeWidth={1.5}
      />
      <text
        x={CHART_W}
        y={sensY - 4}
        textAnchor="end"
        fontSize={12}
        fill="var(--netlab-text-primary)"
      >
        {t('Rx sensitivity', '受信感度')}
      </text>
      <polyline
        points={points.map((p) => `${x(p.km).toFixed(1)},${y(p.dbm).toFixed(1)}`).join(' ')}
        fill="none"
        stroke="var(--netlab-accent-cyan)"
        strokeWidth={2}
      />
      <text
        x={CHART_W / 2}
        y={CHART_H + 20}
        textAnchor="middle"
        fontSize={12}
        fill="var(--netlab-text-secondary)"
      >
        {t(`0 → ${distance(link.km)}`, `0 → ${distance(link.km)}`)}
      </text>
    </svg>
  );
}

const SPEC_W = 360;

/** The grid's channels across the C-band, by wavelength. */
function Spectrum({ spacingGhz }: { spacingGhz: number }) {
  const t = useT();
  const grid = dwdmGrid(spacingGhz);
  const span = C_BAND_NM.hi - C_BAND_NM.lo;
  const x = (nm: number) => ((nm - C_BAND_NM.lo) / span) * SPEC_W;
  return (
    <svg
      viewBox={`-20 0 ${SPEC_W + 40} 76`}
      style={{ width: '100%', maxWidth: 520 }}
      role="img"
      aria-label={t(
        `${grid.count} channels between ${C_BAND_NM.lo} and ${C_BAND_NM.hi} nm`,
        `${C_BAND_NM.lo}〜${C_BAND_NM.hi} nm に ${grid.count} チャネル`,
      )}
    >
      <line x1={0} x2={SPEC_W} y1={44} y2={44} stroke="var(--netlab-border-strong)" />
      {grid.channelsThz.map((thz) => (
        <line
          key={thz}
          x1={x(nmOf(thz))}
          x2={x(nmOf(thz))}
          y1={10}
          y2={44}
          stroke="var(--netlab-accent-cyan)"
          strokeWidth={1.5}
        />
      ))}
      <text x={0} y={64} fontSize={12} fill="var(--netlab-text-secondary)">
        {`${C_BAND_NM.lo} nm`}
      </text>
      <text x={SPEC_W} y={64} textAnchor="end" fontSize={12} fill="var(--netlab-text-secondary)">
        {`${C_BAND_NM.hi} nm`}
      </text>
    </svg>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function OpticalLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Verdict | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [link, setLink] = useState<Link>(ASKED_LINK);
  const [guess2, setGuess2] = useState<CountAnswer | null>(null);
  const [revealed2, setRevealed2] = useState(false);
  const [spacingGhz, setSpacingGhz] = useState(100);

  const asked = budget(ASKED_LINK);
  const askedFibre = FIBRES[ASKED_LINK.fibre];
  const truth = asked.verdict;
  const mine = budget(link);
  const mineFibre = FIBRES[link.fibre];
  const lossReach = lossLimitedKm(link.fibre, link.connectors);
  const grid100 = dwdmGrid(100);
  const truth2 = countAnswerOf(grid100.count);
  const grid = dwdmGrid(spacingGhz);
  const at1550 = { ...ASKED_LINK, fibre: 'smf-1550' as const };

  const verdictName = (verdict: Verdict) =>
    ({
      down: t('It stays down', 'リンクは上がらない'),
      thin: t(
        `It comes up, with under ${THIN_MARGIN_DB} dB to spare`,
        `上がるが、余裕は ${THIN_MARGIN_DB} dB 未満`,
      ),
      comfortable: t(
        `It comes up, with ${THIN_MARGIN_DB} dB or more to spare`,
        `上がり、余裕は ${THIN_MARGIN_DB} dB 以上`,
      ),
    })[verdict];
  const fibreName = (id: FibreId) =>
    ({
      'smf-1310': t('Single-mode, 1310 nm', 'シングルモード 1310 nm'),
      'smf-1550': t('Single-mode, 1550 nm', 'シングルモード 1550 nm'),
      'mmf-850': t('Multimode OM3, 850 nm', 'マルチモード OM3 850 nm'),
    })[id];
  const verdictText = (b: ReturnType<typeof budget>) =>
    b.limit === 'reach'
      ? t(
          `Down: the power is fine (margin ${db(b.marginDb)}), but the link is longer than the optic’s ${distance(mineFibre.reachKm ?? 0)} reach.`,
          `上がりません。光パワーは足りています（余裕 ${db(b.marginDb)}）が、モジュールの到達距離 ${distance(mineFibre.reachKm ?? 0)} を超えています。`,
        )
      : b.verdict === 'down'
        ? t(
            `Down: ${db(-b.marginDb)} short of the sensitivity.`,
            `上がりません。受信感度に ${db(-b.marginDb)} 足りません。`,
          )
        : t(`Up, with ${db(b.marginDb)} of margin.`, `上がります。余裕は ${db(b.marginDb)} です。`);

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
        <div style={LESSON_LABEL}>{t('A fibre link budget', '光ファイバのリンクバジェット')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'Light leaves the transmitter at some power and loses a little at every connector, every splice and every kilometre of glass. Power is counted in dBm (decibels against 1 mW), so losses in dB simply subtract. The link comes up if what arrives is at least the receiver’s sensitivity; what is left over is the margin.',
            '光は送信器からある強さで出て、コネクタ、融着接続、ガラスの 1 km ごとに少しずつ弱くなります。光パワーは dBm（1 mW を基準にしたデシベル）で数えるので、dB の損失はそのまま引き算できます。届いた光が受信器の受信感度以上ならリンクは上がり、その差が余裕（マージン）です。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="op-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `A pair of optics, transmitting at ${dbm(askedFibre.txDbm)} with a receiver sensitivity of ${dbm(askedFibre.sensitivityDbm)}, is joined by ${ASKED_LINK.km} km of single-mode fibre at ${askedFibre.wavelengthNm} nm (${askedFibre.dbPerKm} dB/km). There is a connector at each end (${CONNECTOR_DB} dB each) and a splice every ${SPLICE_EVERY_KM} km where cable sections meet (${SPLICE_DB} dB each). Designers like at least ${THIN_MARGIN_DB} dB of margin for ageing, repairs and dirty connectors. Does the link come up?`,
            `送信 ${dbm(askedFibre.txDbm)}、受信感度 ${dbm(askedFibre.sensitivityDbm)} の光モジュールの組を、${askedFibre.wavelengthNm} nm のシングルモードファイバ ${ASKED_LINK.km} km（${askedFibre.dbPerKm} dB/km）でつなぎます。両端にコネクタが 1 つずつ（各 ${CONNECTOR_DB} dB）、ケーブルの継ぎ目に ${SPLICE_EVERY_KM} km ごとに融着接続（各 ${SPLICE_DB} dB）があります。設計では、経年劣化・修理・コネクタの汚れに備えて ${THIN_MARGIN_DB} dB 以上の余裕を取りたいところです。リンクは上がる？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {VERDICTS.map((verdict) => (
            <button
              key={verdict}
              type="button"
              role="radio"
              aria-checked={guess === verdict}
              data-testid={`op-guess-${verdict}`}
              disabled={revealed}
              onClick={() => setGuess(verdict)}
              style={{ ...lessonChoice(guess === verdict), textAlign: 'left' }}
            >
              {predictionMark(verdict, guess, truth, revealed)}
              {verdictName(verdict)}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="op-reveal"
            data-right={String(guess === truth)}
            data-margin={asked.marginDb}
            data-rx={asked.rxDbm}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {guess === truth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `It comes up, but with only ${db(asked.marginDb)}. The fibre costs ${ASKED_LINK.km} × ${askedFibre.dbPerKm} = ${db(asked.fibreLossDb)}, the ${asked.splices} splices ${db(asked.spliceLossDb)} and the connectors ${db(asked.connectorLossDb)}: ${db(asked.totalLossDb)} in all. ${dbm(askedFibre.txDbm)} − ${db(asked.totalLossDb)} = ${dbm(asked.rxDbm)} arrives, against ${dbm(askedFibre.sensitivityDbm)} needed. One dirty connector or a repair splice later, it could drop.`,
              `上がりますが、余裕は ${db(asked.marginDb)} しかありません。ファイバで ${ASKED_LINK.km} × ${askedFibre.dbPerKm} = ${db(asked.fibreLossDb)}、${asked.splices} か所の融着で ${db(asked.spliceLossDb)}、コネクタで ${db(asked.connectorLossDb)}、合計 ${db(asked.totalLossDb)} を失います。届くのは ${dbm(askedFibre.txDbm)} − ${db(asked.totalLossDb)} = ${dbm(asked.rxDbm)} で、必要なのは ${dbm(askedFibre.sensitivityDbm)} です。コネクタが 1 つ汚れたり、修理で融着が増えたりすれば落ちかねません。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="op-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Add up the losses', '損失を足し合わせる')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="op-budget">
          <div style={LESSON_LABEL}>{t('Change the link', 'リンクを変えてみる')}</div>
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FIBRE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={link.fibre === id}
                data-testid={`op-fibre-${id}`}
                onClick={() =>
                  setLink((l) => ({
                    ...l,
                    fibre: id,
                    km: id === 'mmf-850' ? 0.3 : l.km < 1 ? ASKED_LINK.km : l.km,
                  }))
                }
                style={lessonChoice(link.fibre === id)}
              >
                {fibreName(id)}
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
              {t('Length', '長さ')}
              <input
                type="range"
                min={0.1}
                max={link.fibre === 'mmf-850' ? 2 : 80}
                step={0.1}
                value={link.km}
                data-testid="op-km"
                onChange={(event) => setLink((l) => ({ ...l, km: Number(event.target.value) }))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{distance(link.km)}</span>
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {t('Connectors', 'コネクタ')}
              <input
                type="range"
                min={2}
                max={8}
                value={link.connectors}
                data-testid="op-connectors"
                onChange={(event) =>
                  setLink((l) => ({ ...l, connectors: Number(event.target.value) }))
                }
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{link.connectors}</span>
            </label>
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={cell}>{t('Transmit power', '送信パワー')}</td>
                  <td style={mono}>{dbm(mineFibre.txDbm)}</td>
                </tr>
                <tr>
                  <td style={cell}>
                    {t(
                      `Fibre, ${distance(link.km)} × ${mineFibre.dbPerKm} dB/km`,
                      `ファイバ ${distance(link.km)} × ${mineFibre.dbPerKm} dB/km`,
                    )}
                  </td>
                  <td style={mono}>{`−${db(mine.fibreLossDb)}`}</td>
                </tr>
                <tr>
                  <td style={cell}>
                    {t(
                      `Splices, ${mine.splices} × ${SPLICE_DB} dB`,
                      `融着 ${mine.splices} × ${SPLICE_DB} dB`,
                    )}
                  </td>
                  <td style={mono}>{`−${db(mine.spliceLossDb)}`}</td>
                </tr>
                <tr>
                  <td style={cell}>
                    {t(
                      `Connectors, ${link.connectors} × ${CONNECTOR_DB} dB`,
                      `コネクタ ${link.connectors} × ${CONNECTOR_DB} dB`,
                    )}
                  </td>
                  <td style={mono}>{`−${db(mine.connectorLossDb)}`}</td>
                </tr>
                <tr>
                  <td style={cell}>{t('Received', '受信パワー')}</td>
                  <td style={mono}>{dbm(mine.rxDbm)}</td>
                </tr>
                <tr>
                  <td style={cell}>{t('Receiver sensitivity', '受信感度')}</td>
                  <td style={mono}>{dbm(mineFibre.sensitivityDbm)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <PowerChart link={link} />
          <p
            data-testid="op-result"
            data-margin={mine.marginDb}
            data-verdict={mine.verdict}
            data-limit={mine.limit ?? 'none'}
            style={{ margin: '8px 0 0', fontWeight: 700 }}
          >
            {verdictText(mine)}
          </p>
          <p
            data-testid="op-loss-reach"
            data-km={lossReach}
            style={{ margin: '4px 0 0', fontSize: 13 }}
          >
            {t(
              `By loss alone, this fibre and these connectors reach ${distance(lossReach)}.`,
              `損失だけで考えると、このファイバとコネクタで届くのは ${distance(lossReach)} までです。`,
            )}
          </p>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              `At 1550 nm the same glass loses less (${FIBRES['smf-1550'].dbPerKm} dB/km), so the same ${ASKED_LINK.km} km leaves ${db(budget(at1550).marginDb)}. Multimode fibre loses far more per kilometre, yet that is rarely what limits it: light takes many paths of different lengths through its wide core (modal dispersion), and the pulses smear. 10GBASE-SR is specified for ${distance(FIBRES['mmf-850'].reachKm ?? 0)} over OM3 (IEEE 802.3), where the loss is under 2 dB. Single-mode fibre has one path and reaches tens of kilometres.`,
              `1550 nm では同じガラスでも損失が小さい（${FIBRES['smf-1550'].dbPerKm} dB/km）ので、同じ ${ASKED_LINK.km} km でも余裕は ${db(budget(at1550).marginDb)} になります。マルチモードファイバは 1 km あたりの損失がずっと大きいのですが、限界を決めるのはたいていそこではありません。太いコアの中を光が長さの違う多くの経路で進み（モード分散）、パルスがにじむからです。10GBASE-SR は OM3 で ${distance(FIBRES['mmf-850'].reachKm ?? 0)} まで規定されていて（IEEE 802.3）、その損失は 2 dB 未満です。シングルモードファイバは経路が 1 つで、数十 km 届きます。`,
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
              `Simplified: the losses are typical values (G.652 fibre is specified to at most about 0.4 dB/km at 1310 nm and 0.3 dB/km at 1550 nm; installed connectors and splices vary). The Tx powers and sensitivities are example datasheet figures, the ${THIN_MARGIN_DB} dB margin is a rule of thumb, and the splice every ${SPLICE_EVERY_KM} km is an assumption. Left out: a receiver can also be overloaded by too much light on a short link, and dispersion limits long fast single-mode links.`,
              `簡略化しています。損失は代表的な値です（G.652 ファイバの規定は 1310 nm で最大約 0.4 dB/km、1550 nm で約 0.3 dB/km。実際のコネクタや融着はばらつきます）。送信パワーと受信感度はデータシートの例、${THIN_MARGIN_DB} dB の余裕は経験則、${SPLICE_EVERY_KM} km ごとの融着は仮定です。短いリンクで光が強すぎて受信器が飽和することや、長く速いシングルモードのリンクで分散が効いてくることは扱っていません。`,
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <LessonChallenges lessonId="optical" challenges={opticalChallenges(link)} />
      ) : null}

      <div style={LESSON_CARD} data-testid="op-dwdm">
        <div style={LESSON_LABEL}>{t('Many colours on one fibre', '1 本のファイバに多くの色')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `DWDM sends many wavelengths down one fibre, each its own channel. The channels sit on the ITU-T G.694.1 grid: ${GRID_ANCHOR_THZ} THz plus a whole number of steps of the spacing. Take the C-band as ${C_BAND_NM.lo}–${C_BAND_NM.hi} nm, where erbium amplifiers work. On a 100 GHz grid, about how many channels fit?`,
            `DWDM は 1 本のファイバに多くの波長を流し、それぞれを 1 つのチャネルにします。チャネルは ITU-T G.694.1 のグリッド、つまり ${GRID_ANCHOR_THZ} THz に間隔の整数倍を足した周波数に並びます。C バンドを、エルビウム添加ファイバ増幅器が働く ${C_BAND_NM.lo}〜${C_BAND_NM.hi} nm とします。100 GHz 間隔のグリッドなら、だいたい何チャネル入る？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {COUNT_ANSWERS.map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={guess2 === answer}
              data-testid={`op-dwdm-guess-${answer}`}
              disabled={revealed2}
              onClick={() => setGuess2(answer)}
              style={{ ...lessonChoice(guess2 === answer), textAlign: 'left' }}
            >
              {predictionMark(answer, guess2, truth2, revealed2)}
              {t(`About ${COUNT_OF[answer]}`, `約 ${COUNT_OF[answer]}`)}
            </button>
          ))}
        </div>
        {revealed2 ? (
          <>
            <p
              data-testid="op-dwdm-reveal"
              data-right={String(guess2 === truth2)}
              data-count={grid100.count}
              role="status"
              style={{ margin: '8px 0 0', lineHeight: 1.7 }}
            >
              <strong>
                {guess2 === truth2
                  ? t('As you predicted. ', '予想どおりです。')
                  : t('Not what you predicted. ', '予想とちがいました。')}
              </strong>
              {t(
                `${grid100.count}. ${C_BAND_NM.hi} nm is ${thzOf(C_BAND_NM.hi).toFixed(2)} THz and ${C_BAND_NM.lo} nm is ${thzOf(C_BAND_NM.lo).toFixed(2)} THz (frequency = c / wavelength), so the grid points from ${grid100.channelsThz[0]} to ${grid100.channelsThz[grid100.count - 1]} THz fit: ${grid100.count} of them. Near 1550 nm, 100 GHz is ${grid100.spacingNmAt1550} nm, not 0.1 nm.`,
                `${grid100.count} です。${C_BAND_NM.hi} nm は ${thzOf(C_BAND_NM.hi).toFixed(2)} THz、${C_BAND_NM.lo} nm は ${thzOf(C_BAND_NM.lo).toFixed(2)} THz（周波数 = 光速 ÷ 波長）なので、${grid100.channelsThz[0]} から ${grid100.channelsThz[grid100.count - 1]} THz までのグリッド点が入り、その数は ${grid100.count} です。1550 nm 付近では 100 GHz は 0.1 nm ではなく ${grid100.spacingNmAt1550} nm にあたります。`,
              )}
            </p>
            <div
              role="tablist"
              style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}
            >
              {[100, 50].map((ghz) => (
                <button
                  key={ghz}
                  type="button"
                  role="tab"
                  aria-selected={spacingGhz === ghz}
                  data-testid={`op-spacing-${ghz}`}
                  onClick={() => setSpacingGhz(ghz)}
                  style={lessonChoice(spacingGhz === ghz)}
                >
                  {`${ghz} GHz`}
                </button>
              ))}
            </div>
            <p
              data-testid="op-grid"
              data-count={grid.count}
              style={{ margin: '8px 0 4px', fontWeight: 700 }}
            >
              {t(
                `${spacingGhz} GHz spacing: ${grid.count} channels, ${grid.spacingNmAt1550} nm apart near 1550 nm.`,
                `${spacingGhz} GHz 間隔：${grid.count} チャネル、1550 nm 付近で ${grid.spacingNmAt1550} nm おき。`,
              )}
            </p>
            <Spectrum spacingGhz={spacingGhz} />
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 13,
                color: 'var(--netlab-text-secondary)',
                lineHeight: 1.7,
              }}
            >
              {t(
                `The band edges are this lesson’s choice; a real system’s channel plan depends on its amplifiers and filters, so vendors quote 40, 44, 48 or more 100 GHz channels. Each channel needs its own budget too, and amplifiers along the way restore the power the fibre takes. CWDM, by contrast, spaces 18 channels 20 nm apart (ITU-T G.694.2) and needs no amplifiers.`,
                `バンドの端はこのレッスンの決めた値です。実際のチャネル配置は増幅器やフィルタで決まるので、100 GHz 間隔で 40、44、48 チャネル以上などとベンダーごとに異なります。チャネルごとにもリンクバジェットが要り、途中の増幅器がファイバで失われたパワーを取り戻します。対して CWDM は 20 nm おきに 18 チャネル（ITU-T G.694.2）で、増幅器を使いません。`,
              )}
            </p>
          </>
        ) : (
          <button
            type="button"
            data-testid="op-dwdm-reveal-button"
            disabled={!guess2}
            style={{ ...(guess2 ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed2(true)}
          >
            {guess2
              ? t('Lay out the grid', 'グリッドに並べる')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>
    </div>
  );
}

export default function OpticalDemo() {
  return (
    <DemoShell
      title="Optical link budgets and DWDM"
      desc="Whether a fibre link comes up, and how many wavelengths share one fibre"
    >
      <OpticalLesson />
    </DemoShell>
  );
}
