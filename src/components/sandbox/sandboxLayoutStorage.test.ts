/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SANDBOX_DEFAULT_WIDTH,
  SANDBOX_MAX_ABS_WIDTH,
  SANDBOX_MIN_WIDTH,
  clampSandboxWidth,
  readSandboxWidth,
  writeSandboxWidth,
} from './sandboxLayoutStorage';

const KEY = 'netlab.sandbox.width';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('clampSandboxWidth', () => {
  it('clamps to [min, min(0.5 * viewport, 720)]', () => {
    expect(clampSandboxWidth(100, 1600)).toBe(SANDBOX_MIN_WIDTH);
    expect(clampSandboxWidth(900, 1600)).toBe(SANDBOX_MAX_ABS_WIDTH);
    expect(clampSandboxWidth(500, 1600)).toBe(500);
  });

  it('uses 0.5 * viewport as max when smaller than absolute cap', () => {
    expect(clampSandboxWidth(900, 1200)).toBe(600);
  });

  it('keeps the value within range when both bounds collapse on a tiny viewport', () => {
    const result = clampSandboxWidth(500, 400);
    expect(result).toBe(200);
  });
});

describe('readSandboxWidth', () => {
  it('returns the default width clamped against viewport when storage is empty', () => {
    expect(readSandboxWidth(1600)).toBe(SANDBOX_DEFAULT_WIDTH);
  });

  it('returns the stored width when within bounds', () => {
    window.localStorage.setItem(KEY, '500');
    expect(readSandboxWidth(1600)).toBe(500);
  });

  it('clamps an oversized stored value down to the viewport cap', () => {
    window.localStorage.setItem(KEY, '9999');
    expect(readSandboxWidth(1600)).toBe(SANDBOX_MAX_ABS_WIDTH);
  });

  it('falls back to the default when the stored value is not a number', () => {
    window.localStorage.setItem(KEY, 'not-a-number');
    expect(readSandboxWidth(1600)).toBe(SANDBOX_DEFAULT_WIDTH);
  });

  it('survives a getItem that throws', () => {
    const spy = vi.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(readSandboxWidth(1600)).toBe(SANDBOX_DEFAULT_WIDTH);
    spy.mockRestore();
  });
});

describe('writeSandboxWidth', () => {
  it('rounds and writes the value to localStorage', () => {
    writeSandboxWidth(412.7);
    expect(window.localStorage.getItem(KEY)).toBe('413');
  });

  it('swallows setItem errors silently', () => {
    const spy = vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => writeSandboxWidth(400)).not.toThrow();
    spy.mockRestore();
  });
});
