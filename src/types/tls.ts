export const TLS_VERSION_1_3 = 0x0304 as const;
export const TLS_RECORD_LEGACY_VERSION = 0x0303 as const;
export const TLS_AES_128_GCM_SHA256 = 0x1301 as const;
export const TLS_GROUP_X25519 = 0x001d as const;
export const TLS_SIGNATURE_ED25519 = 0x0807 as const;

export type TlsContentType = 'handshake' | 'application_data' | 'alert' | 'change_cipher_spec';
export type TlsAlertLevel = 'warning' | 'fatal';
export type TlsAlertDescription =
  | 'close_notify'
  | 'unexpected_message'
  | 'bad_record_mac'
  | 'handshake_failure'
  | 'illegal_parameter'
  | 'no_application_protocol'
  | 'internal_error'
  | 'decode_error'
  | 'certificate_required';

export interface TlsRecord {
  readonly contentType: TlsContentType;
  readonly version: typeof TLS_RECORD_LEGACY_VERSION;
  readonly payload: Uint8Array;
}

export interface TlsClientHello {
  readonly random: Uint8Array;
  readonly cipherSuites: readonly [typeof TLS_AES_128_GCM_SHA256];
  readonly keyShare: { readonly group: typeof TLS_GROUP_X25519; readonly pub: Uint8Array };
  readonly alpnProtocols: readonly string[];
  readonly serverName?: string;
  readonly signatureAlgorithms: readonly [typeof TLS_SIGNATURE_ED25519];
  readonly supportedVersions: readonly [typeof TLS_VERSION_1_3];
}

export interface TlsServerHello {
  readonly random: Uint8Array;
  readonly cipherSuite: typeof TLS_AES_128_GCM_SHA256;
  readonly keyShare: { readonly group: typeof TLS_GROUP_X25519; readonly pub: Uint8Array };
  readonly supportedVersion: typeof TLS_VERSION_1_3;
  readonly selectedAlpn?: string;
}

export type TlsHandshakeState = 'init' | 'wait_sh' | 'wait_ee_etc' | 'connected' | 'closed';

export interface TlsConnectionContext {
  readonly state: TlsHandshakeState;
  readonly transcriptHash: Uint8Array;
  readonly handshakeSecret?: Uint8Array;
  readonly clientHandshakeKey?: Uint8Array;
  readonly clientHandshakeIv?: Uint8Array;
  readonly serverHandshakeKey?: Uint8Array;
  readonly serverHandshakeIv?: Uint8Array;
  readonly clientAppKey?: Uint8Array;
  readonly clientAppIv?: Uint8Array;
  readonly serverAppKey?: Uint8Array;
  readonly serverAppIv?: Uint8Array;
  readonly clientSeqNum: bigint;
  readonly serverSeqNum: bigint;
  readonly negotiatedAlpn?: string;
  readonly alert?: {
    readonly level: TlsAlertLevel;
    readonly description: TlsAlertDescription;
  };
}

export interface TlsServerConfig {
  readonly enabled: boolean;
  readonly alpnProtocols: readonly string[];
  readonly hostname?: string;
  readonly certificate?: { readonly pubKey: Uint8Array; readonly sigAlg: 'ed25519' };
}

export type TlsAnnotation =
  | {
      readonly kind: 'tls:client-hello';
      readonly keyShareLen: number;
      readonly alpnList: readonly string[];
    }
  | { readonly kind: 'tls:server-hello'; readonly selectedAlpn?: string }
  | { readonly kind: 'tls:certificate'; readonly certBytes: number }
  | { readonly kind: 'tls:certificate-verify'; readonly sigBytes: number }
  | { readonly kind: 'tls:finished'; readonly who: 'client' | 'server' }
  | { readonly kind: 'tls:application-data'; readonly bytes: number }
  | {
      readonly kind: 'tls:alert';
      readonly level: TlsAlertLevel;
      readonly description: TlsAlertDescription;
    };
