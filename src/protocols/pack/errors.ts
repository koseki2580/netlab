import { NetlabError } from '../../errors/NetlabError';
import type { NetlabErrorCode } from '../../errors/codes';

/** The `protocol-pack/*` code a rule belongs to (REQ-310). */
const REGISTRY_REASONS = new Set([
  'pack/duplicate-id',
  'pack/duplicate-number',
  'pack/unknown-id',
  'pack/identity-mismatch',
]);

function codeOf(reason: string): NetlabErrorCode {
  if (REGISTRY_REASONS.has(reason)) return 'protocol-pack/registry';
  return reason === 'pack/unknown-version'
    ? 'protocol-pack/unknown-version'
    : 'protocol-pack/invalid-descriptor';
}

function packError(code: NetlabErrorCode, reason: string, message: string, path?: string) {
  return new NetlabError({
    code,
    message: path === undefined ? message : `${message} (at ${path})`,
    context: path === undefined ? { reason } : { reason, path },
  });
}

/** A descriptor, tier, registry or version rule was broken; `context.reason` names it. */
export const descriptorError = (reason: string, message: string, path?: string) =>
  packError(codeOf(reason), reason, message, path);

/** A header object disagrees with the schema (`protocol-pack/invalid-header`). */
export const valueError = (reason: string, message: string, path: string) =>
  packError('protocol-pack/invalid-header', reason, message, path);
