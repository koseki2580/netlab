import { intToIp, ipToInt, networkAddress } from '../../utils/cidr';
import type { SubnetFacts } from './types';

/** Subnet mask as a 32-bit integer; `/0` is all-zeros (JS shifts mod 32). */
export function maskInt(prefix: number): number {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

/**
 * Compute every fact about the subnet that contains `ip` at the given `prefix`.
 * Pure and deterministic; reuses the IPv4 primitives in `utils/cidr`.
 */
export function subnetFacts(ip: string, prefix: number): SubnetFacts {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new RangeError(`prefix must be an integer in 0..32, got ${prefix}`);
  }

  const mask = maskInt(prefix);
  const network = networkAddress(ip, prefix);
  const networkInt = ipToInt(network);
  const broadcastInt = (networkInt | ((~mask >>> 0) & 0xffffffff)) >>> 0;
  const totalAddresses = 2 ** (32 - prefix);
  const hasUsableRange = prefix <= 30;

  return {
    cidr: `${network}/${prefix}`,
    prefix,
    mask: intToIp(mask),
    wildcard: intToIp((~mask >>> 0) & 0xffffffff),
    networkAddress: network,
    broadcastAddress: intToIp(broadcastInt),
    firstUsableHost: hasUsableRange ? intToIp((networkInt + 1) >>> 0) : null,
    lastUsableHost: hasUsableRange ? intToIp((broadcastInt - 1) >>> 0) : null,
    usableHostCount: hasUsableRange ? totalAddresses - 2 : 0,
    totalAddresses,
  };
}
