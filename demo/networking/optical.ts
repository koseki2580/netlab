/**
 * The optical lesson (REQ-437): whether a fibre link comes up, from a power
 * budget, and how many DWDM channels fit in the C-band.
 *
 * Link budget: received power = Tx power − fibre loss − connector losses −
 * splice losses; the link comes up when that is at or above the receiver's
 * sensitivity, and the margin is the difference. A margin under 3 dB is taken
 * as "thin" — a common design rule for ageing, repairs and dirty connectors,
 * not a standard. Losses are typical values, not limits: G.652 single-mode
 * fibre about 0.35 dB/km at 1310 nm and 0.25 dB/km at 1550 nm; OM3 multimode
 * about 3 dB/km at 850 nm; 0.5 dB per mated connector; 0.1 dB per fusion
 * splice, with a splice assumed every 5 km of cable. The Tx powers and
 * sensitivities are example datasheet figures, not those of a standard.
 * Multimode reach is limited by modal dispersion rather than loss: 10GBASE-SR
 * reaches 300 m over OM3 (IEEE 802.3 clause 52). Receiver overload, dispersion
 * on single-mode fibre and amplifiers are left out.
 *
 * DWDM: channels sit on the ITU-T G.694.1 grid, 193.1 THz + n × spacing.
 * The C-band is taken as 1530–1565 nm.
 */

export type FibreId = 'smf-1310' | 'smf-1550' | 'mmf-850';

export interface Fibre {
  readonly id: FibreId;
  readonly wavelengthNm: number;
  readonly dbPerKm: number;
  readonly txDbm: number;
  readonly sensitivityDbm: number;
  /** The distance the optic is specified for, when dispersion rather than loss limits it. */
  readonly reachKm: number | null;
}

export const FIBRES: Readonly<Record<FibreId, Fibre>> = {
  'smf-1310': {
    id: 'smf-1310',
    wavelengthNm: 1310,
    dbPerKm: 0.35,
    txDbm: 0,
    sensitivityDbm: -14,
    reachKm: null,
  },
  'smf-1550': {
    id: 'smf-1550',
    wavelengthNm: 1550,
    dbPerKm: 0.25,
    txDbm: 0,
    sensitivityDbm: -14,
    reachKm: null,
  },
  'mmf-850': {
    id: 'mmf-850',
    wavelengthNm: 850,
    dbPerKm: 3,
    txDbm: -1,
    sensitivityDbm: -10,
    reachKm: 0.3,
  },
};

export const CONNECTOR_DB = 0.5;
export const SPLICE_DB = 0.1;
export const SPLICE_EVERY_KM = 5;
export const THIN_MARGIN_DB = 3;

export interface Link {
  readonly fibre: FibreId;
  readonly km: number;
  readonly connectors: number;
}

/** The link the lesson asks about. */
export const ASKED_LINK: Link = { fibre: 'smf-1310', km: 30, connectors: 2 };

export type Verdict = 'down' | 'thin' | 'comfortable';

export interface Budget {
  readonly fibreLossDb: number;
  readonly splices: number;
  readonly spliceLossDb: number;
  readonly connectorLossDb: number;
  readonly totalLossDb: number;
  readonly rxDbm: number;
  readonly marginDb: number;
  readonly verdict: Verdict;
  /** Why a link is down: too much loss, or longer than the optic's reach. */
  readonly limit: 'loss' | 'reach' | null;
}

const round = (value: number) => Math.round(value * 100) / 100;

/** Splices between cable sections, one every SPLICE_EVERY_KM. */
export function splicesFor(km: number): number {
  return Math.max(0, Math.ceil(km / SPLICE_EVERY_KM - 1e-9) - 1);
}

export function budget(link: Link): Budget {
  const fibre = FIBRES[link.fibre];
  const fibreLossDb = round(fibre.dbPerKm * link.km);
  const splices = splicesFor(link.km);
  const spliceLossDb = round(splices * SPLICE_DB);
  const connectorLossDb = round(link.connectors * CONNECTOR_DB);
  const totalLossDb = round(fibreLossDb + spliceLossDb + connectorLossDb);
  const rxDbm = round(fibre.txDbm - totalLossDb);
  const marginDb = round(rxDbm - fibre.sensitivityDbm);
  const tooFar = fibre.reachKm !== null && link.km > fibre.reachKm;
  const limit = marginDb < 0 ? 'loss' : tooFar ? 'reach' : null;
  const verdict: Verdict = limit ? 'down' : marginDb < THIN_MARGIN_DB ? 'thin' : 'comfortable';
  return {
    fibreLossDb,
    splices,
    spliceLossDb,
    connectorLossDb,
    totalLossDb,
    rxDbm,
    marginDb,
    verdict,
    limit,
  };
}

/** Power along the link: a step at each connector and splice, a slope along the fibre. */
export function powerProfile(link: Link): { km: number; dbm: number }[] {
  const fibre = FIBRES[link.fibre];
  const half = link.connectors / 2;
  let dbm = fibre.txDbm - Math.ceil(half) * CONNECTOR_DB;
  const points = [
    { km: 0, dbm: fibre.txDbm },
    { km: 0, dbm: round(dbm) },
  ];
  const splices = splicesFor(link.km);
  for (let i = 1; i <= splices; i += 1) {
    const km = i * SPLICE_EVERY_KM;
    dbm -= fibre.dbPerKm * SPLICE_EVERY_KM;
    points.push({ km, dbm: round(dbm) });
    dbm -= SPLICE_DB;
    points.push({ km, dbm: round(dbm) });
  }
  dbm -= fibre.dbPerKm * (link.km - splices * SPLICE_EVERY_KM);
  points.push({ km: link.km, dbm: round(dbm) });
  dbm -= Math.floor(half) * CONNECTOR_DB;
  points.push({ km: link.km, dbm: round(dbm) });
  return points;
}

/** The longest link this fibre and these connectors allow by loss alone, km. */
export function lossLimitedKm(fibre: FibreId, connectors: number): number {
  let km = 0;
  while (budget({ fibre, km: round(km + 0.1), connectors }).marginDb >= 0) km = round(km + 0.1);
  return km;
}

// --- DWDM ---------------------------------------------------------------

/** The speed of light, nm·THz. */
export const C_NM_THZ = 299_792.458;
export const GRID_ANCHOR_THZ = 193.1;
export const C_BAND_NM = { lo: 1530, hi: 1565 } as const;

export const thzOf = (nm: number) => C_NM_THZ / nm;
export const nmOf = (thz: number) => C_NM_THZ / thz;

export interface Grid {
  readonly spacingGhz: number;
  readonly count: number;
  readonly channelsThz: readonly number[];
  /** The channel spacing expressed in wavelength near 1550 nm. */
  readonly spacingNmAt1550: number;
}

/** The G.694.1 channels whose centre frequencies fall inside the band. */
export function dwdmGrid(spacingGhz: number, band = C_BAND_NM): Grid {
  const step = spacingGhz / 1000;
  const lowThz = thzOf(band.hi);
  const highThz = thzOf(band.lo);
  const nMin = Math.ceil((lowThz - GRID_ANCHOR_THZ) / step - 1e-9);
  const nMax = Math.floor((highThz - GRID_ANCHOR_THZ) / step + 1e-9);
  const channelsThz: number[] = [];
  for (let n = nMin; n <= nMax; n += 1)
    channelsThz.push(Math.round((GRID_ANCHOR_THZ + n * step) * 1000) / 1000);
  return {
    spacingGhz,
    count: channelsThz.length,
    channelsThz,
    spacingNmAt1550: Math.round(((1550 * 1550 * step) / C_NM_THZ) * 1000) / 1000,
  };
}
