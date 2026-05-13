export type WifiRole = 'access-point' | 'station';

export interface WifiConfig {
  readonly role: WifiRole;
  readonly ssid: string;
  readonly psk?: string;
  readonly apId?: string;
}

export interface WirelessLinkConfig {
  readonly ssid: string;
  readonly channel: number;
  readonly bandMhz: number;
  readonly txPowerDbm: number;
  readonly antennaGainDbi?: number;
  readonly lossSeed?: number;
}

export type WirelessAssociationPhase =
  | 'unassociated'
  | 'probing'
  | 'authenticated'
  | 'associated'
  | '4way'
  | 'connected';

export interface WirelessAssociationState {
  readonly phase: WirelessAssociationPhase;
  readonly apId?: string;
}

export type WirelessEvent =
  | { readonly type: 'beacon'; readonly ssid: string }
  | { readonly type: 'probeResponse'; readonly ssid: string }
  | { readonly type: 'authSuccess' }
  | { readonly type: 'assocSuccess'; readonly apId: string }
  | { readonly type: 'eapolM1' }
  | { readonly type: 'eapolM2' }
  | { readonly type: 'eapolM3' }
  | { readonly type: 'eapolM4' }
  | { readonly type: 'deauth' }
  | { readonly type: 'timeout' };
