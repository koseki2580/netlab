import type { NetworkTopology } from '../../types/topology';
import { isIpAddress } from '../../utils/network';
import type { NatRule } from '../types';
import { parseCidr } from './route';

export type NatValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'bad-cidr' | 'bad-translate-to' | 'bad-interface' };

export function validateNatRule(
  topology: NetworkTopology,
  nodeId: string,
  rule: NatRule,
): NatValidationResult {
  if (rule.matchSrc !== undefined && !parseCidr(rule.matchSrc)) {
    return { ok: false, reason: 'bad-cidr' };
  }
  if (rule.matchDst !== undefined && !parseCidr(rule.matchDst)) {
    return { ok: false, reason: 'bad-cidr' };
  }
  if (!isIpAddress(rule.translateTo)) {
    return { ok: false, reason: 'bad-translate-to' };
  }

  const node = topology.nodes.find((candidate) => candidate.id === nodeId);
  if (!node?.data.interfaces?.some((iface) => iface.id === rule.outInterface)) {
    return { ok: false, reason: 'bad-interface' };
  }

  return { ok: true };
}
