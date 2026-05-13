import { NetlabError } from '../errors';
import type { CryptoProvider, CryptoProviderId, ProviderInfo } from './CryptoProvider';
import { FakeDeterministicProvider } from './FakeDeterministicProvider';
import { probeCapabilities } from './probe';
import { WebCryptoProvider } from './WebCryptoProvider';

export type CryptoProviderSelection = 'auto' | CryptoProviderId | CryptoProvider;

const FAKE_CAPABILITIES = {
  ecdh: 'x25519',
  signing: 'ed25519',
  hmacHashForWpa2: 'sha-256',
} as const;

export async function selectProvider(opts: { readonly forced?: CryptoProviderId } = {}): Promise<{
  readonly provider: CryptoProvider;
  readonly info: ProviderInfo;
}> {
  if (opts.forced === 'fake-deterministic') {
    return {
      provider: new FakeDeterministicProvider(),
      info: { id: 'fake-deterministic', capabilities: FAKE_CAPABILITIES, source: 'forced' },
    };
  }

  if (opts.forced === 'webcrypto') {
    const capabilities = await probeCapabilities();
    return {
      provider: new WebCryptoProvider({ capabilities }),
      info: { id: 'webcrypto', capabilities, source: 'forced' },
    };
  }

  if (!globalThis.crypto?.subtle) {
    return {
      provider: new FakeDeterministicProvider(),
      info: { id: 'fake-deterministic', capabilities: FAKE_CAPABILITIES, source: 'auto-detected' },
    };
  }

  const capabilities = await probeCapabilities();
  return {
    provider: new WebCryptoProvider({ capabilities }),
    info: { id: 'webcrypto', capabilities, source: 'auto-detected' },
  };
}

export function resolveProviderSync(selection: CryptoProviderSelection = 'auto'): {
  readonly provider: CryptoProvider;
  readonly info: ProviderInfo;
} {
  if (typeof selection === 'object') {
    return {
      provider: selection,
      info: {
        id: selection.id,
        capabilities:
          selection.id === 'webcrypto'
            ? { ecdh: 'p-256', signing: 'ecdsa-p-256', hmacHashForWpa2: 'sha-1' }
            : FAKE_CAPABILITIES,
        source: 'forced',
      },
    };
  }

  if (selection === 'fake-deterministic') {
    return {
      provider: new FakeDeterministicProvider(),
      info: { id: 'fake-deterministic', capabilities: FAKE_CAPABILITIES, source: 'forced' },
    };
  }

  if (selection === 'webcrypto') {
    if (!globalThis.crypto?.subtle) {
      throw new NetlabError({
        code: 'crypto/unsupported-operation',
        message: 'cryptoProvider="webcrypto" requires crypto.subtle',
      });
    }
    const capabilities = {
      ecdh: 'p-256',
      signing: 'ecdsa-p-256',
      hmacHashForWpa2: 'sha-1',
    } as const;
    return {
      provider: new WebCryptoProvider({ capabilities }),
      info: { id: 'webcrypto', capabilities, source: 'forced' },
    };
  }

  if (globalThis.crypto?.subtle) {
    const capabilities = {
      ecdh: 'p-256',
      signing: 'ecdsa-p-256',
      hmacHashForWpa2: 'sha-1',
    } as const;
    return {
      provider: new WebCryptoProvider({ capabilities }),
      info: { id: 'webcrypto', capabilities, source: 'auto-detected' },
    };
  }

  return {
    provider: new FakeDeterministicProvider(),
    info: { id: 'fake-deterministic', capabilities: FAKE_CAPABILITIES, source: 'auto-detected' },
  };
}
