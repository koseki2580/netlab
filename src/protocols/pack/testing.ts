/** Test helpers for the protocol-pack trial (imported by tests only). */
import { expect } from 'vitest';
import { NetlabError } from '../../errors';
import type { NetlabErrorCode } from '../../errors/codes';
import type { HeaderField, ProtocolDescriptor } from './types';

/** A one-byte field; an override set to `undefined` removes that property. */
export function toyField(
  overrides: { [K in keyof HeaderField]?: HeaderField[K] | undefined } = {},
): HeaderField {
  const merged: Record<string, unknown> = {
    key: 'a',
    name: 'A',
    type: 'uint',
    bits: 8,
    meaning: { en: 'A byte.', ja: '1 バイト。' },
    example: 1,
    ...overrides,
  };
  for (const key of Object.keys(merged)) if (merged[key] === undefined) delete merged[key];
  return merged as unknown as HeaderField;
}

export function toyDescriptor(overrides: Partial<ProtocolDescriptor> = {}): ProtocolDescriptor {
  return {
    apiVersion: 1,
    id: 'toy',
    name: { short: 'TOY', en: 'Toy protocol', ja: 'おもちゃのプロトコル' },
    layer: 'L4',
    specs: [{ id: 'RFC 9999', title: 'Toy', year: 2026, status: 'experimental' }],
    versions: [{ id: 'v1', specs: ['RFC 9999'], default: true }],
    header: [toyField()],
    ...overrides,
  };
}

/** Asserts `fn` throws a NetlabError with this code, `context.reason` and (optionally) `context.path`. */
export function expectRefused(
  fn: () => unknown,
  code: NetlabErrorCode,
  reason: string,
  path?: string,
): NetlabError {
  let caught: unknown;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  expect(NetlabError.isInstance(caught), 'expected a NetlabError').toBe(true);
  const error = caught as NetlabError;
  expect({ code: error.code, reason: error.context?.['reason'] }).toEqual({ code, reason });
  if (path !== undefined) expect(error.context?.['path']).toBe(path);
  return error;
}
