const IPV4_RE = /^(\d{1,3})(\.(\d{1,3})){3}$/;
const MAC_RE = /^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/i;

export function validateIpAddress(value: string): string | null {
  if (!IPV4_RE.test(value)) {
    return 'Invalid IPv4 address';
  }

  const octets = value.split('.').map((part) => Number.parseInt(part, 10));
  return octets.every((octet) => octet >= 0 && octet <= 255) ? null : 'Invalid IPv4 address';
}

export function validateMacAddress(value: string): string | null {
  return MAC_RE.test(value) ? null : 'Invalid MAC address';
}

export function validatePrefixLength(value: number): string | null {
  return Number.isInteger(value) && value >= 0 && value <= 32
    ? null
    : 'Prefix length must be between 0 and 32';
}

export function validateCidr(value: string): string | null {
  const [ip, prefixLength] = value.split('/');
  if (!ip || prefixLength === undefined) {
    return 'Invalid CIDR';
  }

  const ipError = validateIpAddress(ip);
  if (ipError) {
    return 'Invalid CIDR';
  }

  const prefix = Number.parseInt(prefixLength, 10);
  return validatePrefixLength(prefix) === null ? null : 'Invalid CIDR';
}

export function validateNoDuplicateIp(value: string, existingIps: string[]): string | null {
  return existingIps.includes(value) ? 'Duplicate IP address' : null;
}
