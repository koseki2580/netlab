export interface LinkQosConfig {
  readonly bandwidthBps?: number;
  readonly propagationDelayMs?: number;
  readonly lossPct?: number;
  readonly queueDepthSegments?: number;
  readonly lossSeed?: number;
  readonly shaper?: LinkShaperConfig;
}

export interface LinkShaperClass {
  readonly id: string;
  readonly dscp: readonly number[];
  readonly weightPct: number;
  readonly queueDepthSegments: number;
  readonly default?: boolean;
}

export interface LinkShaperConfig {
  readonly classes: readonly LinkShaperClass[];
}

export interface NormalizedLinkQosConfig {
  readonly bandwidthBps: number;
  readonly propagationDelayMs: number;
  readonly lossPct: number;
  readonly queueDepthSegments: number;
  readonly lossSeed: number | undefined;
}

export type LinkQosDropReason = 'queue-full' | 'class-queue-full' | 'loss' | 'link-failed';

export interface LinkQosTrace {
  readonly edgeId: string;
  readonly segSeq: number;
  readonly queueDepth: number;
  readonly txStartAtStep?: number;
  readonly txEndAtStep?: number;
  readonly totalLatencySteps?: number;
  readonly reason?: LinkQosDropReason;
}

export function normalizeLinkQos(
  config: LinkQosConfig | null | undefined,
): NormalizedLinkQosConfig {
  return {
    bandwidthBps:
      config?.bandwidthBps !== undefined && config.bandwidthBps > 0
        ? config.bandwidthBps
        : Infinity,
    propagationDelayMs:
      config?.propagationDelayMs !== undefined && config.propagationDelayMs > 0
        ? config.propagationDelayMs
        : 0,
    lossPct:
      config?.lossPct !== undefined && config.lossPct > 0 ? Math.min(config.lossPct, 100) : 0,
    queueDepthSegments:
      config?.queueDepthSegments !== undefined && config.queueDepthSegments > 0
        ? config.queueDepthSegments
        : Infinity,
    lossSeed: config?.lossSeed,
  };
}

export function hasActiveLinkQos(config: LinkQosConfig | null | undefined): boolean {
  const normalized = normalizeLinkQos(config);
  return (
    Number.isFinite(normalized.bandwidthBps) ||
    normalized.propagationDelayMs > 0 ||
    normalized.lossPct > 0 ||
    Number.isFinite(normalized.queueDepthSegments) ||
    (config?.shaper?.classes.length ?? 0) > 0
  );
}
