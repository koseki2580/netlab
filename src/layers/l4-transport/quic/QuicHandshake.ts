import type { CryptoProvider } from '../../../crypto/CryptoProvider';
import { FakeDeterministicProvider } from '../../../crypto/FakeDeterministicProvider';
import { deriveQuicKeys, type QuicAeadKeys } from './QuicPacketProtection';

export interface QuicAnnotation {
  readonly kind: 'quic:packet(initial)' | 'quic:packet(handshake)' | 'quic:packet(1rtt)';
}

export interface QuicHandshakeRun {
  readonly state: 'connected';
  readonly selectedAlpn: 'h3';
  readonly keys: { readonly client: QuicAeadKeys; readonly server: QuicAeadKeys };
  readonly annotations: readonly QuicAnnotation[];
}

export class QuicHandshake {
  constructor(private readonly provider: CryptoProvider = new FakeDeterministicProvider()) {}

  async connect(options: { readonly alpn: 'h3' }): Promise<QuicHandshakeRun> {
    const dcid = this.provider.randomBytes(8, 0x81);
    return {
      state: 'connected',
      selectedAlpn: options.alpn,
      keys: {
        client: await deriveQuicKeys(this.provider, dcid, 'client'),
        server: await deriveQuicKeys(this.provider, dcid, 'server'),
      },
      annotations: [
        { kind: 'quic:packet(initial)' },
        { kind: 'quic:packet(handshake)' },
        { kind: 'quic:packet(1rtt)' },
      ],
    };
  }
}
