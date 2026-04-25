import type { Tutorial } from '../../tutorials/types';
import { sandboxIntroMtu } from './sandboxIntroMtu';
import { sandboxIntroNat } from './sandboxIntroNat';
import { sandboxIntroOspf } from './sandboxIntroOspf';
import { sandboxIntroTcp } from './sandboxIntroTcp';

export type SandboxIntroId =
  | 'sandbox-intro-mtu'
  | 'sandbox-intro-tcp'
  | 'sandbox-intro-ospf'
  | 'sandbox-intro-nat';

const INTROS: Readonly<Record<SandboxIntroId, Tutorial>> = Object.freeze({
  'sandbox-intro-mtu': sandboxIntroMtu,
  'sandbox-intro-tcp': sandboxIntroTcp,
  'sandbox-intro-ospf': sandboxIntroOspf,
  'sandbox-intro-nat': sandboxIntroNat,
});

export const introRegistry = Object.freeze({
  get(id: string): Tutorial | undefined {
    return INTROS[id as SandboxIntroId];
  },
  list(): readonly SandboxIntroId[] {
    return Object.keys(INTROS) as SandboxIntroId[];
  },
});
