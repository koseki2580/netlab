const CRC32_POLYNOMIAL = 0xedb88320;

let crc32Table: Uint32Array | null = null;

function getCrc32Table(): Uint32Array {
  if (crc32Table) return crc32Table;

  crc32Table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let value = i;
    for (let bit = 0; bit < 8; bit++) {
      value = (value & 1) !== 0 ? (value >>> 1) ^ CRC32_POLYNOMIAL : value >>> 1;
    }
    crc32Table[i] = value >>> 0;
  }
  return crc32Table;
}

export function computeIpv4Checksum(header: number[]): number {
  let sum = 0;

  for (let i = 0; i < header.length; i += 2) {
    const word = ((header[i] ?? 0) << 8) | (header[i + 1] ?? 0);
    sum += word;
    sum = (sum & 0xffff) + (sum >>> 16);
  }

  while (sum >>> 16) {
    sum = (sum & 0xffff) + (sum >>> 16);
  }

  return (~sum) & 0xffff;
}

export function computeFcs(bytes: number[]): number {
  const table = getCrc32Table();
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}
