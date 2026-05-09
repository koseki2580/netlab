import { NetlabError } from '../errors';
import { scenarioRegistry } from '../scenarios';
import type { Scenario } from '../scenarios/types';
import { ensureCliRuntimeRegistered } from './runtime';

export function listScenarioIds(): string[] {
  ensureCliRuntimeRegistered();
  return scenarioRegistry.list().map((scenario) => scenario.metadata.id);
}

export function loadScenario(id: string): Scenario {
  ensureCliRuntimeRegistered();
  const scenario = scenarioRegistry.get(id);
  if (!scenario) {
    throw new NetlabError({
      code: 'invariant/not-found',
      message: `[netlab-run] unknown scenario: ${id}`,
      context: { available: listScenarioIds() },
    });
  }
  return scenario;
}
