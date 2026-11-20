/**
 * The modern Wi-Fi lesson (REQ-395): what Wi-Fi 6 (IEEE 802.11ax), 6E and
 * Wi-Fi 7 (802.11be) change, and what WPA3-SAE changes over WPA2-PSK.
 *
 * Simplified:
 * - Airtime: every transmission costs a fixed overhead (contention, preamble,
 *   acknowledgement), taken as 200 µs, plus the data at an assumed 100 Mb/s
 *   over the whole 20 MHz channel. With OFDMA the AP splits the 20 MHz
 *   channel into resource units (RUs): 9 × 26-tone, 4 × 52-tone, 2 × 106-tone
 *   or 1 × 242-tone, with 24, 48, 102 and 234 data subcarriers. An RU's rate
 *   is the channel's rate scaled by its data subcarriers. Trigger frames and
 *   multi-user block acks are not modelled, so the real saving is smaller.
 * - Channels: each band is a list of contiguous spectrum blocks (edges of the
 *   20 MHz channel plan) per region; a block holds floor(block / width)
 *   channels of a width. 2.4 GHz is counted from its 5 MHz-spaced channel
 *   numbers and the 22 MHz width of the original 802.11b signal.
 * - Passwords: guess rates are assumptions, not measurements.
 */

// ---------------------------------------------------------------- airtime

/** Contention + preamble + acknowledgement per transmission, µs (assumed). */
export const OVERHEAD_US = 200;
/** Data rate over the whole 20 MHz channel, Mb/s (assumed). */
export const CHANNEL_RATE_MBPS = 100;
/** Data subcarriers of a full 20 MHz (242-tone) RU. */
const FULL_TONES = 234;
/** The ways OFDMA splits 20 MHz: how many RUs, and each RU's data subcarriers. */
export const RU_SPLITS: readonly { readonly rus: number; readonly dataTones: number }[] = [
  { rus: 1, dataTones: 234 },
  { rus: 2, dataTones: 102 },
  { rus: 4, dataTones: 48 },
  { rus: 9, dataTones: 24 },
];
export const MAX_RUS = 9;

export type AirtimeMode = 'single' | 'faster' | 'ofdma';
export const AIRTIME_MODES: readonly AirtimeMode[] = ['single', 'faster', 'ofdma'];

export interface Airtime {
  readonly transmissions: number;
  /** Total airtime, µs, rounded. */
  readonly totalUs: number;
  /** Of which the per-transmission overhead, µs. */
  readonly overheadUs: number;
}

const dataUs = (bytes: number, rateMbps: number) => (bytes * 8) / rateMbps;

/**
 * Airtime to send one packet of `bytes` to each of `clients` phones.
 * single: one phone per transmission (Wi-Fi 5); faster: the same at twice the
 * rate; ofdma: up to 9 phones per transmission, each on its own RU.
 */
export function airtime(mode: AirtimeMode, clients: number, bytes: number): Airtime {
  if (mode !== 'ofdma') {
    const rate = mode === 'faster' ? CHANNEL_RATE_MBPS * 2 : CHANNEL_RATE_MBPS;
    return {
      transmissions: clients,
      totalUs: Math.round(clients * (OVERHEAD_US + dataUs(bytes, rate))),
      overheadUs: clients * OVERHEAD_US,
    };
  }
  let left = clients;
  let total = 0;
  let transmissions = 0;
  while (left > 0) {
    const group = Math.min(left, MAX_RUS);
    const split = RU_SPLITS.find((entry) => entry.rus >= group)!;
    total += OVERHEAD_US + dataUs(bytes, (CHANNEL_RATE_MBPS * split.dataTones) / FULL_TONES);
    transmissions += 1;
    left -= group;
  }
  return {
    transmissions,
    totalUs: Math.round(total),
    overheadUs: transmissions * OVERHEAD_US,
  };
}

// ---------------------------------------------------------------- channels

export type Region = 'us' | 'jp';
export const REGIONS: readonly Region[] = ['us', 'jp'];
export type Band = '2.4' | '5' | '6';
export const BANDS: readonly Band[] = ['2.4', '5', '6'];
export const WIDTHS: readonly number[] = [20, 40, 80, 160, 320];

interface Block {
  readonly fromMHz: number;
  readonly toMHz: number;
}

/** Contiguous 20 MHz channel-plan edges per region and band (2.4 GHz is counted separately). */
export const PLANS: Record<Region, Record<'5' | '6', readonly Block[]>> = {
  us: {
    // Channels 36–64, 100–144, 149–165.
    '5': [
      { fromMHz: 5170, toMHz: 5330 },
      { fromMHz: 5490, toMHz: 5730 },
      { fromMHz: 5735, toMHz: 5835 },
    ],
    // 5925–7125 MHz; channels 1–233.
    '6': [{ fromMHz: 5945, toMHz: 7125 }],
  },
  jp: {
    // W52/W53 (36–64) and W56 (100–144, channel 144 since 2019).
    '5': [
      { fromMHz: 5170, toMHz: 5330 },
      { fromMHz: 5490, toMHz: 5730 },
    ],
    // 5925–6425 MHz; channels 1–93.
    '6': [{ fromMHz: 5945, toMHz: 6425 }],
  },
};

/** 5 GHz spectrum where the AP must first listen for radar (DFS): channels 52–64 and 100–144. */
export const DFS_RANGES: readonly Block[] = [
  { fromMHz: 5250, toMHz: 5330 },
  { fromMHz: 5490, toMHz: 5730 },
];

/** Highest 2.4 GHz channel number used for Wi-Fi in each region. */
export const LAST_24_CHANNEL: Record<Region, number> = { us: 11, jp: 13 };
/** Width of the original 802.11b signal the 2.4 GHz channel numbers were laid out for, MHz. */
export const WIDTH_24_MHZ = 22;

export interface ChannelCount {
  readonly count: number;
  /** How many of them need DFS (radar detection) first. */
  readonly dfs: number;
}

/** Non-overlapping 2.4 GHz channels: from channel 1, take each next one at least 22 MHz away. */
export function nonOverlapping24(region: Region): number[] {
  const picked: number[] = [];
  for (let channel = 1; channel <= LAST_24_CHANNEL[region]; channel++) {
    const last = picked[picked.length - 1];
    if (last === undefined || (channel - last) * 5 >= WIDTH_24_MHZ) picked.push(channel);
  }
  return picked;
}

/** How many non-overlapping channels of `widthMHz` fit; null where the width is not used (2.4 GHz above 20 MHz). */
export function channelCount(region: Region, band: Band, widthMHz: number): ChannelCount | null {
  if (band === '2.4') {
    return widthMHz === 20 ? { count: nonOverlapping24(region).length, dfs: 0 } : null;
  }
  let count = 0;
  let dfs = 0;
  for (const block of PLANS[region][band]) {
    const fits = Math.floor((block.toMHz - block.fromMHz) / widthMHz);
    for (let index = 0; index < fits; index++) {
      const from = block.fromMHz + index * widthMHz;
      const to = from + widthMHz;
      count += 1;
      if (DFS_RANGES.some((range) => from < range.toMHz && to > range.fromMHz)) dfs += 1;
    }
  }
  return { count, dfs };
}

// ---------------------------------------------------------------- passwords

/** Offline guesses a second against a captured WPA2 handshake, one fast GPU (assumed). */
export const OFFLINE_GUESSES_PER_S = 1_000_000;
/** Online guesses a second against an AP running SAE, one exchange each (assumed). */
export const ONLINE_GUESSES_PER_S = 1;
export const WORDLISTS: readonly number[] = [10_000, 1_000_000, 100_000_000];

export interface CrackTime {
  /** WPA2-PSK: guesses checked against the captured handshake, seconds. */
  readonly offlineS: number;
  /** WPA3-SAE: every guess is a live exchange with the AP, seconds. */
  readonly onlineS: number;
  /** How many times longer the online attack takes. */
  readonly ratio: number;
}

/** Time to try every word of a list, offline (WPA2) and online (WPA3-SAE). */
export function crackTime(words: number): CrackTime {
  const offlineS = words / OFFLINE_GUESSES_PER_S;
  const onlineS = words / ONLINE_GUESSES_PER_S;
  return { offlineS, onlineS, ratio: onlineS / offlineS };
}
