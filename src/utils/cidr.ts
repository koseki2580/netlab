function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

function intToIp(value: number): string {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff].join(
    '.',
  );
}

function networkAddress(ip: string, prefix: number): string {
  if (prefix === 0) return '0.0.0.0';
  const mask = (~0 << (32 - prefix)) >>> 0;
  return intToIp(ipToInt(ip) & mask);
}

export function isInSubnet(ip: string, cidr: string): boolean {
  const [prefix, lengthStr] = cidr.split('/');
  const length = parseInt(lengthStr, 10);
  if (length === 0) return true; // 0.0.0.0/0 matches everything
  const mask = (~0 << (32 - length)) >>> 0;
  return (ipToInt(ip) & mask) === (ipToInt(prefix) & mask);
}

export function parseCidr(cidr: string): { prefix: string; length: number } {
  const [prefix, lengthStr] = cidr.split('/');
  return { prefix, length: parseInt(lengthStr, 10) };
}

export function isInSameSubnet(cidr1: string, cidr2: string): boolean {
  const first = parseCidr(cidr1);
  const second = parseCidr(cidr2);

  if (first.length !== second.length) {
    return false;
  }

  return (
    networkAddress(first.prefix, first.length) === networkAddress(second.prefix, second.length)
  );
}

export function prefixLength(cidr: string): number {
  return parseInt(cidr.split('/')[1], 10);
}
