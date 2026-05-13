export interface VrrpConfig {
  readonly vrid: number;
  readonly virtualIp: string;
  readonly priority: number;
  readonly advertIntervalMs?: number;
  readonly preempt?: boolean;
  readonly hsrpMode?: boolean;
}

export type VrrpRole = 'init' | 'backup' | 'master';

export interface VrrpState {
  readonly role: VrrpRole;
  readonly remainingMs: number;
}

export interface VrrpMember {
  readonly nodeId: string;
  readonly interfaceId: string;
  readonly realIp: string;
  readonly config: VrrpConfig;
}

export type VrrpEvent =
  | { readonly type: 'startup' }
  | { readonly type: 'helloRecv'; readonly priority: number; readonly srcIp: string }
  | { readonly type: 'masterDownTimerExpire' }
  | { readonly type: 'adverTimerExpire' }
  | { readonly type: 'shutdown' }
  | { readonly type: 'interfaceDown' };
