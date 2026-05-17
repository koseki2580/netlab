import { cloneSnapshot } from '../SimulationSnapshot';
import type { SimulationSnapshot } from '../types';
import type { Edit } from './types';
import { registerReducer } from './registry';

function parameterSet(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'param.set' }>,
): SimulationSnapshot {
  const parameters = structuredClone(snapshot.parameters);
  const [group, key] = edit.key.split('.') as [keyof typeof parameters, string];
  const bucket = parameters[group] as Record<string, number>;
  bucket[key] = edit.after;
  return cloneSnapshot({ ...snapshot, parameters });
}

registerReducer('param.set', parameterSet);
