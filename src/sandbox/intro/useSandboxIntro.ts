import { useContext } from 'react';
import { NetlabError } from '../../errors';
import { SandboxIntroContext } from './SandboxIntroProvider';

export function useSandboxIntro() {
  const context = useContext(SandboxIntroContext);
  if (!context) {
    throw new NetlabError({
      code: 'sandbox-intro/missing-provider',
      message: '[netlab] useSandboxIntro must be used within <SandboxIntroProvider>',
    });
  }

  return context;
}
