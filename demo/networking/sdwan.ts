/**
 * The SD-WAN lesson (REQ-376): a branch with three uplinks, measured every
 * period (latency, jitter, loss), and a policy per kind of traffic that picks
 * the cheapest link meeting its needs — and moves when a link stops meeting
 * them.
 *
 * Real SD-WAN policies name a preferred link and backup links, and dampen
 * switching (hold-downs, averaging windows) so a link is not flapped on one
 * bad probe; "the cheapest link that meets the needs" is this lesson's
 * simplification of that.
 */
export interface LinkSample {
  readonly latencyMs: number;
  readonly jitterMs: number;
  readonly lossPct: number;
}

export interface Uplink {
  readonly id: 'mpls' | 'internet' | 'lte';
  readonly name: { readonly en: string; readonly ja: string };
  /** Lower is cheaper; a policy prefers the cheapest link that meets it. */
  readonly cost: number;
  /** One measurement per period. */
  readonly samples: readonly LinkSample[];
}

export interface AppPolicy {
  readonly id: 'voice' | 'video' | 'backup';
  readonly name: { readonly en: string; readonly ja: string };
  /** The most each may be; a link meeting all three is good enough. */
  readonly sla: { readonly latencyMs: number; readonly jitterMs: number; readonly lossPct: number };
}

export const PERIODS = 4;

export const UPLINKS: readonly Uplink[] = [
  {
    id: 'mpls',
    name: { en: 'MPLS line', ja: 'MPLS 回線' },
    cost: 3,
    samples: [
      { latencyMs: 30, jitterMs: 2, lossPct: 0 },
      { latencyMs: 30, jitterMs: 2, lossPct: 0 },
      { latencyMs: 30, jitterMs: 2, lossPct: 0 },
      { latencyMs: 30, jitterMs: 2, lossPct: 0 },
    ],
  },
  {
    id: 'internet',
    name: { en: 'Internet broadband', ja: 'インターネット（光回線）' },
    cost: 1,
    samples: [
      { latencyMs: 25, jitterMs: 4, lossPct: 0.1 },
      // An evening rush: delay and loss climb.
      { latencyMs: 120, jitterMs: 40, lossPct: 3 },
      { latencyMs: 60, jitterMs: 12, lossPct: 0.5 },
      { latencyMs: 25, jitterMs: 4, lossPct: 0.1 },
    ],
  },
  {
    id: 'lte',
    name: { en: 'LTE', ja: 'LTE（モバイル）' },
    cost: 2,
    samples: [
      { latencyMs: 70, jitterMs: 15, lossPct: 1 },
      { latencyMs: 70, jitterMs: 15, lossPct: 1 },
      { latencyMs: 70, jitterMs: 15, lossPct: 1 },
      { latencyMs: 70, jitterMs: 15, lossPct: 1 },
    ],
  },
];

export const POLICIES: readonly AppPolicy[] = [
  {
    id: 'voice',
    name: { en: 'Voice calls', ja: '音声通話' },
    sla: { latencyMs: 150, jitterMs: 30, lossPct: 1 },
  },
  {
    id: 'video',
    name: { en: 'Video meetings', ja: 'ビデオ会議' },
    sla: { latencyMs: 100, jitterMs: 20, lossPct: 0.5 },
  },
  {
    id: 'backup',
    name: { en: 'Nightly backup', ja: '夜間バックアップ' },
    sla: { latencyMs: 1000, jitterMs: 500, lossPct: 5 },
  },
];

/** Whether a link's sample meets a policy's needs. */
export function meets(sample: LinkSample, policy: AppPolicy): boolean {
  return (
    sample.latencyMs <= policy.sla.latencyMs &&
    sample.jitterMs <= policy.sla.jitterMs &&
    sample.lossPct <= policy.sla.lossPct
  );
}

/**
 * The link a policy uses in a period: the cheapest that meets its needs; when
 * none does, the one with the least loss (traffic still has to go somewhere).
 */
export function choose(policy: AppPolicy, period: number): Uplink['id'] {
  const fit = UPLINKS.filter((link) => meets(link.samples[period]!, policy)).sort(
    (a, b) => a.cost - b.cost,
  );
  if (fit[0]) return fit[0].id;
  return [...UPLINKS].sort((a, b) => a.samples[period]!.lossPct - b.samples[period]!.lossPct)[0]!
    .id;
}

/** Why a link does not meet a policy in a period, as the measurements that fail. */
export function misses(link: Uplink, policy: AppPolicy, period: number): string[] {
  const sample = link.samples[period]!;
  return [
    ...(sample.latencyMs > policy.sla.latencyMs
      ? [`latency ${sample.latencyMs} > ${policy.sla.latencyMs} ms`]
      : []),
    ...(sample.jitterMs > policy.sla.jitterMs
      ? [`jitter ${sample.jitterMs} > ${policy.sla.jitterMs} ms`]
      : []),
    ...(sample.lossPct > policy.sla.lossPct
      ? [`loss ${sample.lossPct} > ${policy.sla.lossPct} %`]
      : []),
  ];
}
