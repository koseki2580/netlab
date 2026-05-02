import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SANDBOX_PROPOSAL_TIMEOUT_MS, resolveSandboxControlMode } from './sandbox-mode';

describe('resolveSandboxControlMode', () => {
  it('preserves an explicit proposes mode', () => {
    expect(
      resolveSandboxControlMode({
        hasControlledTopology: true,
        sandboxEnabled: true,
        sandboxControlMode: 'sandbox-proposes',
        dev: true,
      }),
    ).toBe('sandbox-proposes');
  });

  it('preserves an explicit owns mode', () => {
    expect(
      resolveSandboxControlMode({
        hasControlledTopology: true,
        sandboxEnabled: true,
        sandboxControlMode: 'sandbox-owns',
        dev: true,
      }),
    ).toBe('sandbox-owns');
  });

  it('defaults controlled sandbox mounts to proposes', () => {
    expect(
      resolveSandboxControlMode({
        hasControlledTopology: true,
        sandboxEnabled: true,
        dev: false,
      }),
    ).toBe('sandbox-proposes');
  });

  it('warns in development when controlled sandbox mode is implicit', () => {
    const warn = vi.fn();

    resolveSandboxControlMode({
      hasControlledTopology: true,
      sandboxEnabled: true,
      dev: true,
      warn,
    });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('sandboxControlMode');
  });

  it('does not warn in production when controlled sandbox mode is implicit', () => {
    const warn = vi.fn();

    resolveSandboxControlMode({
      hasControlledTopology: true,
      sandboxEnabled: true,
      dev: false,
      warn,
    });

    expect(warn).not.toHaveBeenCalled();
  });

  it('returns undefined when sandbox is disabled', () => {
    expect(
      resolveSandboxControlMode({
        hasControlledTopology: true,
        sandboxEnabled: false,
        dev: true,
      }),
    ).toBeUndefined();
  });

  it('keeps the default proposal timeout at 5 seconds', () => {
    expect(DEFAULT_SANDBOX_PROPOSAL_TIMEOUT_MS).toBe(5000);
  });
});
