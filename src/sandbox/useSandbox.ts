import { useContext } from 'react';
import { SandboxContext, useSandbox, type SandboxContextValue } from './SandboxContext';

export { useSandbox };

export function useSandboxOrNull(): SandboxContextValue | null {
  return useContext(SandboxContext);
}
