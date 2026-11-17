/**
 * The encrypted-DNS lesson (REQ-384): one lookup of clinic.example sent four
 * ways — classic DNS on UDP 53, DNS over TLS (RFC 7858), DNS over HTTPS
 * (RFC 8484) and DNS over QUIC (RFC 9250) — and what a café's network can
 * read of it and do with it: see the name, change the answer, or block the
 * method by its port alone.
 */
export type Method = 'do53' | 'dot' | 'doh' | 'doq';
export const METHODS: readonly Method[] = ['do53', 'dot', 'doh', 'doq'];

export interface Transport {
  readonly proto: 'udp' | 'tcp';
  readonly port: number;
  /** Encrypted between the client and its resolver. */
  readonly encrypted: boolean;
  readonly rfc: number;
}

export const TRANSPORT: Record<Method, Transport> = {
  do53: { proto: 'udp', port: 53, encrypted: false, rfc: 1035 },
  dot: { proto: 'tcp', port: 853, encrypted: true, rfc: 7858 },
  doh: { proto: 'tcp', port: 443, encrypted: true, rfc: 8484 },
  doq: { proto: 'udp', port: 853, encrypted: true, rfc: 9250 },
};

export const QUERY = 'clinic.example';
export const RESOLVER = '198.51.100.53';

/** Ports the rest of the web also uses: HTTPS on TCP 443 (and HTTP/3 on UDP 443). */
const SHARED_WITH_WEB = new Set(['tcp/443', 'udp/443']);

export interface WhatTheNetworkCan {
  /** Read the name being looked up. */
  readonly readName: boolean;
  /** Change the answer without the client noticing. */
  readonly forgeAnswer: boolean;
  /** Block this method by its port without also blocking ordinary web traffic. */
  readonly blockByPortAlone: boolean;
}

export function networkCan(method: Method): WhatTheNetworkCan {
  const transport = TRANSPORT[method];
  return {
    readName: !transport.encrypted,
    forgeAnswer: !transport.encrypted,
    blockByPortAlone: !SHARED_WITH_WEB.has(`${transport.proto}/${transport.port}`),
  };
}
