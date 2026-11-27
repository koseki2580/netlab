/**
 * The physical-layer lesson's challenges (REQ-449): goals reached with the
 * duplex part's own controls (the two port settings and the load). Every
 * `reached` and every number in `why` comes from negotiate / errorCounters in
 * physicalLayer.ts.
 */
import type { Challenge } from '../components/LessonChallenges';
import { errorCounters, negotiate, type PortSetting, type SideResult } from './physicalLayer';

export interface DuplexState {
  /** The switch port. */
  readonly a: PortSetting;
  /** The PC. */
  readonly b: PortSetting;
  readonly loadPct: number;
}

/** The duplex part as it opens: switch fixed at 100 Mbit/s full, PC on auto, 50 % load. */
export const INITIAL_DUPLEX: DuplexState = {
  a: { mode: 'fixed', speed: 100, duplex: 'full' },
  b: { mode: 'auto' },
  loadPct: 50,
};

const isFixed100Full = (port: PortSetting) =>
  port.mode === 'fixed' && port.speed === 100 && port.duplex === 'full';
const en = (side: SideResult) => `${side.speed} Mbit/s ${side.duplex} duplex`;
const ja = (side: SideResult) =>
  `${side.speed} Mbit/s ${side.duplex === 'full' ? '全二重' : '半二重'}`;

export function physicalLayerChallenges(state: DuplexState): Challenge[] {
  const outcome = negotiate(state.a, state.b);
  const counters = errorCounters(outcome, state.loadPct);
  // What the lesson's starting pair (switch fixed full, PC auto) would count at this load.
  const before = errorCounters(negotiate(INITIAL_DUPLEX.a, INITIAL_DUPLEX.b), state.loadPct);
  const clean = outcome.link && !outcome.mismatch;

  // 1. Keep the switch fixed at 100 full; change only the PC; no mismatch.
  const pcOnly = isFixed100Full(state.a) && state.b.mode === 'fixed' && clean;
  // 2. A mismatch where the switch port, not the PC, counts the late collisions.
  const switchCounts = outcome.link && outcome.mismatch && counters.a.lateCollisions > 0;
  // 3. Switch fixed (not auto), PC on auto, and still no mismatch.
  const fixedMeetsAuto = state.a.mode === 'fixed' && state.b.mode === 'auto' && clean;

  return [
    {
      id: 'pc-only',
      goal: {
        en: 'The switch port must stay fixed at 100 Mbit/s full duplex. Change only the PC so the link has no duplex mismatch.',
        ja: 'スイッチのポートは 100 Mbit/s 全二重の固定のままです。PC の設定だけを変えて、デュプレックス不一致をなくしてください。',
      },
      hint: {
        en: 'A fixed port sends no negotiation pulses. What can an auto port learn from the wire alone, and what can it not?',
        ja: '固定したポートはネゴシエーションの信号を送りません。自動のポートが線上の信号だけで分かることと、分からないことは何でしょう。',
      },
      reached: pcOnly,
      why: outcome.link
        ? {
            en: `Both ends are now fixed at ${en(outcome.a)}, so nothing has to be guessed. At ${state.loadPct} % load the PC counts ${counters.b.lateCollisions} late collisions and the switch ${counters.a.fcsErrors} FCS errors in a minute, against ${before.b.lateCollisions} and ${before.a.fcsErrors} with the PC on auto (it assumed half duplex).`,
            ja: `両端とも ${ja(outcome.a)} に固定され、推測する部分がなくなりました。負荷 ${state.loadPct} % で 1 分間に PC のレイトコリジョンは ${counters.b.lateCollisions}、スイッチの FCS エラーは ${counters.a.fcsErrors} です。PC が自動（半二重とみなした）のときは ${before.b.lateCollisions} と ${before.a.fcsErrors} でした。`,
          }
        : { en: '', ja: '' },
    },
    {
      id: 'switch-counts',
      goal: {
        en: 'Make a duplex mismatch, with traffic flowing, in which the switch port — not the PC — counts the late collisions.',
        ja: '通信が流れている状態で、レイトコリジョンを数えるのが PC ではなくスイッチのポートになるデュプレックス不一致を作ってください。',
      },
      hint: {
        en: 'Late collisions are counted by the half-duplex side. Which setting leaves a port in half duplex?',
        ja: 'レイトコリジョンを数えるのは半二重の側です。どの設定だとポートが半二重になるでしょう。',
      },
      reached: switchCounts,
      why: outcome.link
        ? {
            en: `The switch port runs ${en(outcome.a)} and the PC ${en(outcome.b)}. At ${state.loadPct} % load the switch counts ${counters.a.collisions} collisions and ${counters.a.lateCollisions} late collisions in a minute; the PC receives ${counters.b.runts} runts and ${counters.b.fcsErrors} frames with a bad FCS.`,
            ja: `スイッチのポートは ${ja(outcome.a)}、PC は ${ja(outcome.b)} です。負荷 ${state.loadPct} % で 1 分間に、スイッチはコリジョン ${counters.a.collisions}、レイトコリジョン ${counters.a.lateCollisions} を数え、PC にはラント ${counters.b.runts} 個と FCS の壊れたフレーム ${counters.b.fcsErrors} 個が届きます。`,
          }
        : { en: '', ja: '' },
    },
    {
      id: 'fixed-meets-auto',
      goal: {
        en: 'Keep the PC on auto and the switch port fixed (not auto), and still get a link with no duplex mismatch.',
        ja: 'PC は自動のまま、スイッチのポートは固定（自動以外）のままで、デュプレックス不一致のないリンクにしてください。',
      },
      hint: {
        en: 'When it hears no negotiation, what duplex does an auto port fall back to?',
        ja: 'ネゴシエーションが聞こえないとき、自動のポートはどのデュプレックスに落ち着くでしょう。',
      },
      reached: fixedMeetsAuto,
      why: outcome.link
        ? {
            en: `The PC finds ${outcome.b.speed} Mbit/s from the signal (parallel detection) and, hearing no negotiation, assumes half duplex — which is what the switch is set to. Both run ${en(outcome.a)}: ${counters.b.lateCollisions} late collisions and ${counters.a.fcsErrors} FCS errors at ${state.loadPct} % load.`,
            ja: `PC は信号から ${outcome.b.speed} Mbit/s を見つけ（パラレル検出）、ネゴシエーションが聞こえないので半二重とみなします。これはスイッチの設定と同じです。両端とも ${ja(outcome.a)} で、負荷 ${state.loadPct} % でもレイトコリジョンは ${counters.b.lateCollisions}、FCS エラーは ${counters.a.fcsErrors} です。`,
          }
        : { en: '', ja: '' },
    },
  ];
}
