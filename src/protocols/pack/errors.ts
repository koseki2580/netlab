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

/**
 * The message is the rule and the field (`pack/misaligned at header.ver`): the rule
 * itself is `context.reason`, the field `context.path`. Kept short, as this is in the
 * main bundle; docs/core/protocol-packs.md explains each rule.
 */
function packError(code: NetlabErrorCode, reason: string, path?: string, detail?: string) {
  const where = path === undefined ? '' : ` at ${path}`;
  return new NetlabError({
    code,
    message: `${reason}${where}${detail === undefined ? '' : `: ${detail}`}`,
    context: path === undefined ? { reason } : { reason, path },
  });
}

/** A descriptor, tier, registry or version rule was broken; `context.reason` names it. */
export const descriptorError = (reason: string, path?: string, detail?: string) =>
  packError(codeOf(reason), reason, path, detail);

/** A header object disagrees with the schema (`protocol-pack/invalid-header`). */
export const valueError = (reason: string, path: string, detail?: string) =>
  packError('protocol-pack/invalid-header', reason, path, detail);
