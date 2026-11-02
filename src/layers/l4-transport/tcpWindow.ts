/**
 * How much a sender may still send: bytes in flight stay within the smaller of
 * the congestion window and the window the receiver last advertised (RFC 5681
 * §3, RFC 9293 §3.8.6.2.1).
 */
export function usableWindow(state: {
  readonly cwnd: number;
  readonly rwnd: number;
  readonly inFlight: number;
}): number {
  return Math.max(0, Math.min(state.cwnd, state.rwnd) - state.inFlight);
}
