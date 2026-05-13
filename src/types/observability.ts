export const NETFLOW_VERSION = 9 as const;
export const NETFLOW_TEMPLATE_ID = 256 as const;
export const SFLOW_VERSION = 5 as const;
export const SFLOW_SAMPLE_FORMAT_FLOW = 1 as const;

export type FlowProtocol = 'tcp' | 'udp' | 'icmp';

export interface NetflowConfig {
  readonly enabled: boolean;
  readonly inactiveTimeoutMs?: number;
  readonly activeTimeoutMs?: number;
  readonly maxCacheEntries?: number;
}

export interface SflowConfig {
  readonly enabled: boolean;
  readonly rate: number;
  readonly headerCaptureBytes?: number;
  readonly samplingSeed?: number;
}

export interface NetflowRecord {
  readonly version: typeof NETFLOW_VERSION;
  readonly templateId: typeof NETFLOW_TEMPLATE_ID;
  readonly samplerRouterId: string;
  readonly key: {
    readonly srcIp: string;
    readonly dstIp: string;
    readonly srcPort: number;
    readonly dstPort: number;
    readonly proto: FlowProtocol;
    readonly ingressIfId: string;
    readonly egressIfId: string;
    readonly tos: number;
  };
  readonly packets: number;
  readonly bytes: number;
  readonly firstStep: number;
  readonly lastStep: number;
  readonly tcpFlagsUnion: number;
  readonly reason: 'inactive-timeout' | 'active-timeout' | 'tcp-fin' | 'tcp-rst' | 'cache-evict';
}

export interface SflowSample {
  readonly version: typeof SFLOW_VERSION;
  readonly sampleFormat: typeof SFLOW_SAMPLE_FORMAT_FLOW;
  readonly samplerSwitchId: string;
  readonly portId: string;
  readonly sequence: number;
  readonly samplingRate: number;
  readonly samplePool: number;
  readonly drops: number;
  readonly inputIfId: string;
  readonly outputIfId: string;
  readonly frameLength: number;
  readonly headerBytes: Uint8Array;
  readonly step: number;
}
