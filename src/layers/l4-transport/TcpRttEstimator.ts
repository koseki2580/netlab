export interface TcpRttEstimate {
  readonly rttSmoothedMs: number;
  readonly rttVarMs: number;
  readonly rtoMs: number;
}

const ALPHA = 1 / 8;
const BETA = 1 / 4;
const K = 4;
const MIN_RTO_MS = 1000;
const MAX_RTO_MS = 60000;

export class TcpRttEstimator {
  private rttSmoothedMs = 0;
  private rttVarMs = 0;
  private rtoMs = MIN_RTO_MS;

  update(rttMs: number, isRetransmit = false): void {
    if (isRetransmit || !Number.isFinite(rttMs) || rttMs <= 0) {
      return;
    }

    if (this.rttSmoothedMs === 0) {
      this.rttSmoothedMs = rttMs;
      this.rttVarMs = rttMs / 2;
      this.rtoMs = this.clampRto(this.rttSmoothedMs + K * this.rttVarMs);
      return;
    }

    this.rttVarMs = (1 - BETA) * this.rttVarMs + BETA * Math.abs(this.rttSmoothedMs - rttMs);
    this.rttSmoothedMs = (1 - ALPHA) * this.rttSmoothedMs + ALPHA * rttMs;
    this.rtoMs = this.clampRto(this.rttSmoothedMs + K * this.rttVarMs);
  }

  getRtoMs(): number {
    return this.rtoMs;
  }

  getSrttMs(): number {
    return this.rttSmoothedMs;
  }

  getRttVarMs(): number {
    return this.rttVarMs;
  }

  snapshot(): TcpRttEstimate {
    return {
      rttSmoothedMs: this.rttSmoothedMs,
      rttVarMs: this.rttVarMs,
      rtoMs: this.rtoMs,
    };
  }

  private clampRto(value: number): number {
    return Math.min(MAX_RTO_MS, Math.max(MIN_RTO_MS, value));
  }
}
