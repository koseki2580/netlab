import type { Tutorial } from '../../tutorials/types';
import { sandboxIntroMtu } from './sandboxIntroMtu';

export type SandboxIntroId = 'sandbox-intro-mtu';

const INTROS: Readonly<Record<SandboxIntroId, Tutorial>> = Object.freeze({
  'sandbox-intro-mtu': sandboxIntroMtu,
});

export const introRegistry = Object.freeze({
  get(id: string): Tutorial | undefined {
    return INTROS[id as SandboxIntroId];
  },
  list(): readonly SandboxIntroId[] {
    return Object.keys(INTROS) as SandboxIntroId[];
  },
});
