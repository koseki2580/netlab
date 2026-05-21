import { basicArp } from './basic-arp';
import { fragmentedEcho } from './fragmented-echo';
import { natBasics } from './nat-basics';
import { ospfConvergence } from './ospf-convergence';
import { scenarioRegistry, ScenarioRegistry } from './ScenarioRegistry';
import { stpLoop } from './stp-loop';
import { tcpHandshake } from './tcp-handshake';
import type { ScenarioBrief } from './types';

const BUILTIN_SCENARIOS = [
  basicArp,
  fragmentedEcho,
  tcpHandshake,
  ospfConvergence,
  stpLoop,
  natBasics,
] as const;

for (const scenario of BUILTIN_SCENARIOS) {
  if (!scenarioRegistry.get(scenario.metadata.id)) {
    scenarioRegistry.register(scenario);
  }
}

/**
 * Resolve the pre-flight brief (M1) for a registered scenario, if it has one.
 * Returns `undefined` for unknown scenarios or scenarios without a brief.
 */
export function getScenarioBrief(scenarioId: string): ScenarioBrief | undefined {
  return scenarioRegistry.get(scenarioId)?.brief;
}

export { ScenarioRegistry, scenarioRegistry };
export { basicArp, fragmentedEcho, natBasics, ospfConvergence, stpLoop, tcpHandshake };
