export interface LacpConfig {
  readonly key: number;
  readonly systemId: string;
  readonly mode: 'active' | 'passive';
  readonly fastTimer?: boolean;
  readonly channelId?: string;
}

export type LacpPortState = 'defaulted' | 'expired' | 'current' | 'distributing';

export interface LacpRuntimePort {
  readonly state: LacpPortState;
  readonly config: LacpConfig;
}

export interface LacpPdu {
  readonly key: number;
  readonly systemId: string;
  readonly synchronized: boolean;
  readonly aggregation: boolean;
}
