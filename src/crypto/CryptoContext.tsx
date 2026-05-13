import { createContext, useContext } from 'react';
import { NetlabError } from '../errors';
import type { CryptoProvider, ProviderInfo } from './CryptoProvider';

export interface CryptoContextValue {
  readonly provider: CryptoProvider;
  readonly info: ProviderInfo;
}

export const CryptoContext = createContext<CryptoContextValue | null>(null);

export function useCrypto(): CryptoContextValue {
  const ctx = useContext(CryptoContext);
  if (!ctx) {
    throw new NetlabError({
      code: 'config/missing-provider',
      message: '[netlab] useCrypto must be used within <NetlabProvider>',
    });
  }
  return ctx;
}
