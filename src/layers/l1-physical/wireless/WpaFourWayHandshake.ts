import type { CryptoProvider } from '../../../crypto/CryptoProvider';

const encoder = new TextEncoder();

export interface WpaFourWayHandshakeInput {
  readonly ssid: string;
  readonly psk: string;
  readonly apMac: string;
  readonly stationMac: string;
  readonly seed: number;
}

export interface WpaHandshakeMessage {
  readonly type: 'M1' | 'M2' | 'M3' | 'M4';
  readonly replayCounter: number;
  readonly nonceHex?: string;
}

export interface WpaFourWayHandshakeResult {
  readonly status: 'connected';
  readonly ptkHex: string;
  readonly messages: readonly WpaHandshakeMessage[];
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export class WpaFourWayHandshake {
  constructor(private readonly provider: CryptoProvider) {}

  async run(input: WpaFourWayHandshakeInput): Promise<WpaFourWayHandshakeResult> {
    const anonce = this.provider.randomBytes(32, input.seed);
    const snonce = this.provider.randomBytes(32, input.seed + 1);
    const salt = encoder.encode(input.ssid);
    const ikm = encoder.encode(
      `${input.psk}|${input.apMac}|${input.stationMac}|${hex(anonce)}|${hex(snonce)}`,
    );
    const pmk = await this.provider.hkdfExtract(salt, ikm, 'SHA-256');
    const ptk = await this.provider.hkdfExpandLabel(
      pmk,
      'wpa2 ptk',
      encoder.encode(`${input.apMac}|${input.stationMac}`),
      32,
    );

    return {
      status: 'connected',
      ptkHex: hex(ptk),
      messages: [
        { type: 'M1', replayCounter: 1, nonceHex: hex(anonce) },
        { type: 'M2', replayCounter: 1, nonceHex: hex(snonce) },
        { type: 'M3', replayCounter: 2, nonceHex: hex(anonce) },
        { type: 'M4', replayCounter: 2 },
      ],
    };
  }
}
