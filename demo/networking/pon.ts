/**
 * The PON lesson (REQ-443): a passive optical network shares one OLT port
 * among the homes behind an optical splitter.
 *
 * Line rates: GPON (ITU-T G.984) 2.48832 Gb/s down and 1.24416 Gb/s up;
 * XGS-PON (ITU-T G.9807.1) 9.95328 Gb/s both ways. Shares are line rate ÷
 * busy subscribers; framing, FEC and guard times, which take a part of the
 * line rate, are left out.
 *
 * Optical budget: splitter loss + fibre loss + connector loss, compared with
 * the class's range of loss (minimum and maximum, in dB): GPON B+ 13–28 and
 * C+ 17–32 (G.984.2); XGS-PON N1 14–29, N2 16–31, E1 18–33, E2 20–35
 * (G.9807.1). Losses are typical values, not limits: 3.5 dB per 1:2 stage of
 * the splitter (the ideal 3.01 dB plus excess loss), 0.35 dB/km of fibre,
 * 0.5 dB per connector.
 *
 * Upstream: the OLT grants each ONU a slice of each 125 µs upstream frame
 * (TDMA), sized by dynamic bandwidth assignment (DBA). Simplified to a
 * max-min fair share of the frame among the ONUs' demands; real DBA works on
 * T-CONTs with fixed, assured and best-effort parts.
 */

export type TechId = 'gpon' | 'xgspon';

export interface Tech {
  readonly id: TechId;
  readonly downMbps: number;
  readonly upMbps: number;
  readonly downNm: number;
  readonly upNm: number;
}

export const TECHS: Readonly<Record<TechId, Tech>> = {
  gpon: { id: 'gpon', downMbps: 2488.32, upMbps: 1244.16, downNm: 1490, upNm: 1310 },
  xgspon: { id: 'xgspon', downMbps: 9953.28, upMbps: 9953.28, downNm: 1577, upNm: 1270 },
};

export interface OpticalClass {
  readonly id: string;
  readonly tech: TechId;
  readonly minDb: number;
  readonly maxDb: number;
}

export const CLASSES: readonly OpticalClass[] = [
  { id: 'B+', tech: 'gpon', minDb: 13, maxDb: 28 },
  { id: 'C+', tech: 'gpon', minDb: 17, maxDb: 32 },
  { id: 'N1', tech: 'xgspon', minDb: 14, maxDb: 29 },
  { id: 'N2', tech: 'xgspon', minDb: 16, maxDb: 31 },
  { id: 'E1', tech: 'xgspon', minDb: 18, maxDb: 33 },
  { id: 'E2', tech: 'xgspon', minDb: 20, maxDb: 35 },
];

export const STAGE_DB = 3.5;
export const FIBRE_DB_PER_KM = 0.35;
export const CONNECTOR_DB = 0.5;
export const FRAME_US = 125;

const round = (value: number, places = 2) => {
  const f = 10 ** places;
  return Math.round(value * f) / f;
};

/** Each subscriber's share when `busy` of them want all they can get, Mb/s. */
export function share(
  tech: TechId,
  busy: number,
): { readonly downMbps: number; readonly upMbps: number } {
  const n = Math.max(1, busy);
  return { downMbps: round(TECHS[tech].downMbps / n), upMbps: round(TECHS[tech].upMbps / n) };
}

/** A 1:`split` splitter built of 1:2 stages: typical loss, and the loss of an ideal one. */
export function splitterLoss(split: number): {
  readonly typicalDb: number;
  readonly idealDb: number;
} {
  const stages = Math.log2(split);
  return { typicalDb: round(stages * STAGE_DB), idealDb: round(10 * Math.log10(split)) };
}

export interface Plant {
  readonly split: number;
  readonly km: number;
  readonly connectors: number;
}

export type BudgetVerdict = 'ok' | 'over' | 'under';

export interface Budget {
  readonly splitterDb: number;
  readonly fibreDb: number;
  readonly connectorDb: number;
  readonly totalDb: number;
  /** Below the class's maximum loss (negative: over it). */
  readonly marginDb: number;
  /** ok: within the class; over: too much loss; under: so little loss the receiver is overloaded. */
  readonly verdict: BudgetVerdict;
}

export function budget(plant: Plant, cls: OpticalClass): Budget {
  const splitterDb = splitterLoss(plant.split).typicalDb;
  const fibreDb = round(plant.km * FIBRE_DB_PER_KM);
  const connectorDb = round(plant.connectors * CONNECTOR_DB);
  const totalDb = round(splitterDb + fibreDb + connectorDb);
  const verdict: BudgetVerdict =
    totalDb > cls.maxDb ? 'over' : totalDb < cls.minDb ? 'under' : 'ok';
  return {
    splitterDb,
    fibreDb,
    connectorDb,
    totalDb,
    marginDb: round(cls.maxDb - totalDb),
    verdict,
  };
}

export interface Grant {
  readonly onu: number;
  readonly demandMbps: number;
  readonly grantMbps: number;
  /** Where the ONU's burst sits in each upstream frame, µs. */
  readonly startUs: number;
  readonly endUs: number;
  readonly bytesPerFrame: number;
}

/** Bytes the upstream carries in one 125 µs frame. */
export function frameBytes(tech: TechId): number {
  return Math.round((TECHS[tech].upMbps * FRAME_US) / 8);
}

/**
 * Max-min fair DBA: every ONU asking for less than an equal share gets what it
 * asks; what is left is split equally among the rest. Bursts follow one
 * another through the frame without overlapping.
 */
export function dbaGrants(tech: TechId, demandsMbps: readonly number[]): readonly Grant[] {
  const capacity = TECHS[tech].upMbps;
  const grants = new Array<number>(demandsMbps.length).fill(0);
  let left = capacity;
  let open = demandsMbps.map((_, i) => i).filter((i) => demandsMbps[i]! > 0);
  while (open.length > 0 && left > 1e-9) {
    const fair = left / open.length;
    const satisfied = open.filter((i) => demandsMbps[i]! - grants[i]! <= fair);
    if (satisfied.length === 0) {
      for (const i of open) grants[i] = grants[i]! + fair;
      left = 0;
      break;
    }
    for (const i of satisfied) {
      left -= demandsMbps[i]! - grants[i]!;
      grants[i] = demandsMbps[i]!;
    }
    open = open.filter((i) => !satisfied.includes(i));
  }
  let at = 0;
  return demandsMbps.map((demand, i) => {
    const us = (grants[i]! / capacity) * FRAME_US;
    const grant: Grant = {
      onu: i + 1,
      demandMbps: demand,
      grantMbps: round(grants[i]!),
      startUs: round(at),
      endUs: round(at + us),
      bytesPerFrame: Math.round((grants[i]! * FRAME_US) / 8),
    };
    at += us;
    return grant;
  });
}
