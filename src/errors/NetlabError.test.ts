import { describe, expect, it } from 'vitest';
import { NetlabError } from './NetlabError';
import type { NetlabErrorCode } from './codes';
import { NETLAB_ERROR_CODES } from './codes';

describe('NetlabError', () => {
  it('exposes code, message, and context', () => {
    const err = new NetlabError({
      code: 'config/missing-topology',
      message: 'topology is required',
      context: { nodeId: 'n1' },
    });
    expect(err.code).toBe('config/missing-topology');
    expect(err.message).toBe('topology is required');
    expect(err.context).toEqual({ nodeId: 'n1' });
    expect(err.name).toBe('NetlabError');
  });

  it('preserves cause chain', () => {
    const cause = new Error('root');
    const err = new NetlabError({
      code: 'invariant/not-found',
      message: 'node missing',
      cause,
    });
    expect(err.cause).toBe(cause);
  });

  it('is catchable via instanceof', () => {
    const err = new NetlabError({
      code: 'protocol/invalid-packet',
      message: 'bad packet',
    });
    expect(err).toBeInstanceOf(NetlabError);
    expect(err).toBeInstanceOf(Error);
  });

  it('isInstance detects branded errors across realms', () => {
    const err = new NetlabError({
      code: 'protocol/session-desync',
      message: 'desync',
    });
    expect(NetlabError.isInstance(err)).toBe(true);
    expect(NetlabError.isInstance(new Error('plain'))).toBe(false);
    expect(NetlabError.isInstance(null)).toBe(false);
    expect(NetlabError.isInstance(undefined)).toBe(false);
    expect(NetlabError.isInstance(42)).toBe(false);
  });

  it('has name === "NetlabError" for stack traces', () => {
    const err = new NetlabError({
      code: 'invariant/cannot-fragment',
      message: 'too small',
    });
    expect(err.name).toBe('NetlabError');
    expect(err.stack).toContain('NetlabError');
  });

  it('context is optional', () => {
    const err = new NetlabError({
      code: 'config/missing-provider',
      message: 'no provider',
    });
    expect(err.context).toBeUndefined();
  });

  it('NETLAB_ERROR_CODES covers all expected codes', () => {
    expect(NETLAB_ERROR_CODES.length).toBeGreaterThanOrEqual(10);
    const codes: readonly NetlabErrorCode[] = NETLAB_ERROR_CODES;
    expect(codes).toContain('config/missing-topology');
    expect(codes).toContain('invariant/not-found');
    expect(codes).toContain('protocol/invalid-packet');
  });

  it('works with expect().toThrow() pattern', () => {
    const fn = () => {
      throw new NetlabError({
        code: 'config/missing-topology',
        message: 'NetlabProvider: either topology or defaultTopology must be provided',
      });
    };
    // Old pattern still works
    expect(fn).toThrow('NetlabProvider: either topology or defaultTopology must be provided');
    // New structured pattern
    expect(fn).toThrow(expect.objectContaining({ code: 'config/missing-topology' }));
  });
});
