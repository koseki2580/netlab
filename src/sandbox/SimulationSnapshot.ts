import { HookEngine } from '../hooks/HookEngine';
import { SimulationEngine } from '../simulation/SimulationEngine';
import type { SimulationState } from '../types/simulation';
import type { NetworkTopology } from '../types/topology';
import { DEFAULT_PARAMETERS, type ProtocolParameterSet, type SimulationSnapshot } from './types';

type Freezable =
  | Record<string, unknown>
  | readonly unknown[]
  | Map<unknown, unknown>
  | Set<unknown>
  | Date
  | object;

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const objectValue = value as Freezable;
  if (seen.has(objectValue)) {
    return value;
  }
  seen.add(objectValue);

  if (objectValue instanceof Map) {
    objectValue.forEach((mapValue, key) => {
      deepFreeze(key, seen);
      deepFreeze(mapValue, seen);
    });
  } else if (objectValue instanceof Set) {
    objectValue.forEach((setValue) => deepFreeze(setValue, seen));
  } else {
    Object.values(objectValue).forEach((nested) => deepFreeze(nested, seen));
  }

  return Object.freeze(value);
}

function cloneFrozen<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function normalize(value: unknown): unknown {
  if (value instanceof Map) {
    return {
      __kind: 'Map',
      entries: Array.from(value.entries())
        .map(([key, mapValue]) => [normalize(key), normalize(mapValue)] as const)
        .sort(([left], [right]) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
    };
  }

  if (value instanceof Set) {
    return {
      __kind: 'Set',
      values: Array.from(value.values())
        .map((setValue) => normalize(setValue))
        .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalize(item));
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, normalize(nested)]),
    );
  }

  return value;
}

function structuralString(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function fromEngine(
  engine: SimulationEngine,
  parameters: ProtocolParameterSet = DEFAULT_PARAMETERS,
): SimulationSnapshot {
  const state = cloneFrozen(engine.getState());
  return deepFreeze({
    id: crypto.randomUUID(),
    capturedAt: state.currentStep,
    topology: cloneFrozen(engine.getTopology()),
    state,
    parameters: cloneFrozen(parameters),
  });
}

export function toEngine(snapshot: SimulationSnapshot): SimulationEngine {
  const engine = new SimulationEngine(structuredClone(snapshot.topology), new HookEngine());
  engine.setState(structuredClone(snapshot.state));
  engine.setPlayInterval(snapshot.parameters.engine.tickMs);
  return engine;
}

export function snapshotEquals(a: SimulationSnapshot, b: SimulationSnapshot): boolean {
  return (
    structuralString({
      capturedAt: a.capturedAt,
      topology: a.topology,
      state: a.state,
      parameters: a.parameters,
    }) ===
    structuralString({
      capturedAt: b.capturedAt,
      topology: b.topology,
      state: b.state,
      parameters: b.parameters,
    })
  );
}

export function cloneSnapshot(snapshot: SimulationSnapshot): SimulationSnapshot {
  return deepFreeze({
    id: snapshot.id,
    capturedAt: snapshot.capturedAt,
    topology: structuredClone(snapshot.topology) as NetworkTopology,
    state: structuredClone(snapshot.state) as SimulationState,
    parameters: structuredClone(snapshot.parameters) as ProtocolParameterSet,
  });
}
