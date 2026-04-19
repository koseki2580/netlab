import { NetlabError } from '../errors/NetlabError';

/**
 * Narrow `T | undefined` to `T`. Throws NetlabError when undefined.
 * `null` is intentionally allowed through.
 */
export function assertDefined<T>(
  value: T | undefined,
  message = 'value is undefined',
): asserts value is T {
  if (value === undefined) {
    throw new NetlabError({ code: 'invariant/undefined-value', message });
  }
}

/**
 * Index access that throws on out-of-bounds. Use in production where an
 * invariant guarantees presence.
 */
export function getRequired<T>(
  arr: ArrayLike<T>,
  index: number,
  context?: Record<string, unknown>,
): T {
  const value = arr[index];
  if (value === undefined) {
    throw new NetlabError({
      code: 'invariant/index-out-of-bounds',
      message: `index ${index} out of bounds (length=${arr.length})`,
      context: { index, length: arr.length, ...(context ?? {}) },
    });
  }
  return value;
}
