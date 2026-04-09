export function deriveDeterministicMac(nodeId: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < nodeId.length; i++) {
    hash ^= nodeId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  const bytes = [
    0x02,
    (hash >>> 24) & 0xff,
    (hash >>> 16) & 0xff,
    (hash >>> 8) & 0xff,
    hash & 0xff,
    nodeId.length & 0xff,
  ];

  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join(':');
}

export function extractHostname(url: string): string | null {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

export function isIpAddress(value: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value);
}
