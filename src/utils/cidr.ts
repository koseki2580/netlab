function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
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

export function prefixLength(cidr: string): number {
  return parseInt(cidr.split('/')[1], 10);
}
