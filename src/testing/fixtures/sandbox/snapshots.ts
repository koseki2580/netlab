import { HookEngine } from '../../../hooks/HookEngine';
import {
  basicArp,
  fragmentedEcho,
  natBasics,
  ospfConvergence,
  tcpHandshake,
} from '../../../scenarios';
import type { Scenario } from '../../../scenarios/types';
import { SimulationEngine } from '../../../simulation/SimulationEngine';
import { fromEngine } from '../../../sandbox/SimulationSnapshot';
import { DEFAULT_PARAMETERS, type SimulationSnapshot } from '../../../sandbox/types';
import type { TraceAnnotation } from '../../../sandbox/annotations/types';

export type ScenarioName = 'mtu' | 'tcp' | 'ospf' | 'arp' | 'nat';

const SCENARIOS: Readonly<Record<ScenarioName, Scenario>> = {
  mtu: fragmentedEcho,
  tcp: tcpHandshake,
  ospf: ospfConvergence,
  arp: basicArp,
  nat: natBasics,
};

export function getScenario(name: ScenarioName): Scenario {
  return SCENARIOS[name];
}

export interface BuildSnapshotOptions {
  readonly preseedAnnotations?: readonly TraceAnnotation[];
}

export function buildSnapshot(
  name: ScenarioName,
  options: BuildSnapshotOptions = {},
): SimulationSnapshot {
  const scenario = SCENARIOS[name];
  const hookEngine = new HookEngine();
  const engine = new SimulationEngine(structuredClone(scenario.topology), hookEngine);
  return fromEngine(
    engine,
    DEFAULT_PARAMETERS,
    options.preseedAnnotations !== undefined
      ? { preseedAnnotations: options.preseedAnnotations }
      : {},
  );
}

export const SCENARIO_NAMES: readonly ScenarioName[] = Object.freeze([
  'mtu',
  'tcp',
  'ospf',
  'arp',
  'nat',
]);
