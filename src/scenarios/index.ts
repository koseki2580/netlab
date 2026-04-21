import { basicArp } from './basic-arp';
import { fragmentedEcho } from './fragmented-echo';
import { ospfConvergence } from './ospf-convergence';
import { scenarioRegistry, ScenarioRegistry } from './ScenarioRegistry';
import { tcpHandshake } from './tcp-handshake';

const BUILTIN_SCENARIOS = [basicArp, fragmentedEcho, tcpHandshake, ospfConvergence] as const;

for (const scenario of BUILTIN_SCENARIOS) {
  if (!scenarioRegistry.get(scenario.metadata.id)) {
    scenarioRegistry.register(scenario);
  }
}

export { ScenarioRegistry, scenarioRegistry };
export { basicArp, fragmentedEcho, ospfConvergence, tcpHandshake };
