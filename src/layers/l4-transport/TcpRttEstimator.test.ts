import { describe, expect, it } from 'vitest';
import { TcpRttEstimator } from './TcpRttEstimator';

describe('TcpRttEstimator', () => {
  it('starts with the minimum RTO before any sample', () => {
    const estimator = new TcpRttEstimator();

    expect(estimator.getSrttMs()).toBe(0);
    expect(estimator.getRttVarMs()).toBe(0);
    expect(estimator.getRtoMs()).toBe(1000);
  });

  it('initializes SRTT and RTTVAR from the first sample', () => {
    const estimator = new TcpRttEstimator();

    estimator.update(3000);

    expect(estimator.getSrttMs()).toBe(3000);
    expect(estimator.getRttVarMs()).toBe(1500);
    expect(estimator.getRtoMs()).toBe(9000);
  });

  it('updates values with RFC 6298 alpha and beta constants', () => {
    const estimator = new TcpRttEstimator();

    estimator.update(3000);
    estimator.update(3600);

    expect(estimator.getSrttMs()).toBeCloseTo(3075, 0);
    expect(estimator.getRttVarMs()).toBeCloseTo(1275, 0);
    expect(estimator.getRtoMs()).toBeCloseTo(8175, 0);
  });

  it('clamps RTO to at least 1000 ms', () => {
    const estimator = new TcpRttEstimator();

    estimator.update(20);

    expect(estimator.getRtoMs()).toBe(1000);
  });

  it('clamps RTO to at most 60000 ms', () => {
    const estimator = new TcpRttEstimator();

    estimator.update(30000);

    expect(estimator.getRtoMs()).toBe(60000);
  });

  it('ignores retransmitted segment samples', () => {
    const estimator = new TcpRttEstimator();
    estimator.update(3000);

    estimator.update(9000, true);

    expect(estimator.getSrttMs()).toBe(3000);
    expect(estimator.getRttVarMs()).toBe(1500);
    expect(estimator.getRtoMs()).toBe(9000);
  });

  it('ignores non-finite samples', () => {
    const estimator = new TcpRttEstimator();

    estimator.update(Number.NaN);
    estimator.update(Number.POSITIVE_INFINITY);

    expect(estimator.getRtoMs()).toBe(1000);
  });

  it('ignores zero and negative samples', () => {
    const estimator = new TcpRttEstimator();

    estimator.update(0);
    estimator.update(-10);

    expect(estimator.getSrttMs()).toBe(0);
  });

  it('returns a read-only snapshot of the current estimate', () => {
    const estimator = new TcpRttEstimator();
    estimator.update(3000);

    expect(estimator.snapshot()).toEqual({
      rttSmoothedMs: 3000,
      rttVarMs: 1500,
      rtoMs: 9000,
    });
  });

  it('uses independent state per estimator', () => {
    const first = new TcpRttEstimator();
    const second = new TcpRttEstimator();

    first.update(3000);

    expect(second.getRtoMs()).toBe(1000);
  });
});
