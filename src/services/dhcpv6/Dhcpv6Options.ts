export interface Dhcpv6RawOption {
  readonly code: number;
  readonly value: string;
}

function hexByte(value: number): string {
  return value.toString(16).padStart(2, '0');
}

export function buildDuidLl(macAddress: string): string {
  const octets = macAddress.split(':').map((part) => Number.parseInt(part, 16));
  if (
    octets.length !== 6 ||
    octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    throw new RangeError(`Invalid MAC address for DUID-LL: ${macAddress}`);
  }
  return `00030001${octets.map(hexByte).join('')}`;
}

export function encodeDhcpv6Options(options: readonly Dhcpv6RawOption[]): Uint8Array {
  const bytes = options.flatMap((option) => {
    const valueBytes = option.value.match(/../g)?.map((part) => Number.parseInt(part, 16)) ?? [];
    return [
      (option.code >> 8) & 0xff,
      option.code & 0xff,
      (valueBytes.length >> 8) & 0xff,
      valueBytes.length & 0xff,
      ...valueBytes,
    ];
  });
  return Uint8Array.from(bytes);
}

export function decodeDhcpv6Options(bytes: Uint8Array): Dhcpv6RawOption[] {
  const options: Dhcpv6RawOption[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    const code = ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
    const length = ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0);
    const valueBytes = Array.from(bytes.slice(offset + 4, offset + 4 + length));
    options.push({ code, value: valueBytes.map(hexByte).join('') });
    offset += 4 + length;
  }
  return options;
}
