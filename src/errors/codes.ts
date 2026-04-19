export const NETLAB_ERROR_CODES = [
  'config/missing-topology',
  'config/missing-provider',
  'invariant/not-found',
  'invariant/not-configured',
  'invariant/next-called-twice',
  'invariant/cannot-fragment',
  'invariant/malformed-id',
  'invariant/not-multicast',
  'invariant/no-ip',
  'protocol/invalid-packet',
  'protocol/invalid-request',
  'protocol/invalid-response',
  'protocol/handshake-failed',
  'protocol/session-desync',
] as const;

export type NetlabErrorCode = (typeof NETLAB_ERROR_CODES)[number];
