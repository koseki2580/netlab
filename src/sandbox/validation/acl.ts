import type { SandboxAclRule } from '../types';
import { parseCidr } from './route';

export type AclValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'bad-cidr' | 'bad-port' | 'bad-order' | 'bad-proto' };

const PROTOCOLS = new Set(['tcp', 'udp', 'icmp', 'any']);

export function validateAclRule(rule: SandboxAclRule): AclValidationResult {
  if (rule.matchSrc !== undefined && !parseCidr(rule.matchSrc)) {
    return { ok: false, reason: 'bad-cidr' };
  }
  if (rule.matchDst !== undefined && !parseCidr(rule.matchDst)) {
    return { ok: false, reason: 'bad-cidr' };
  }
  if (rule.proto !== undefined && !PROTOCOLS.has(rule.proto)) {
    return { ok: false, reason: 'bad-proto' };
  }
  if (
    rule.dstPort !== undefined &&
    (!Number.isInteger(rule.dstPort) || rule.dstPort < 0 || rule.dstPort > 65535)
  ) {
    return { ok: false, reason: 'bad-port' };
  }
  if (!Number.isInteger(rule.order) || rule.order < 0) {
    return { ok: false, reason: 'bad-order' };
  }

  return { ok: true };
}
