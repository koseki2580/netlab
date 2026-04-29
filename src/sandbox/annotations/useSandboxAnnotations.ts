import { useSandbox } from '../useSandbox';
import type { TraceAnnotation } from './types';

export function useSandboxAnnotations(): readonly TraceAnnotation[] {
  return useSandbox().engine.snapshot.annotations;
}
