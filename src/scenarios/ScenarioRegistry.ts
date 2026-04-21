import { NetlabError } from '../errors';
import type { Scenario } from './types';

export class ScenarioRegistry {
  private readonly byId = new Map<string, Scenario>();

  register(scenario: Scenario): void {
    const id = scenario.metadata.id;
    if (this.byId.has(id)) {
      throw new NetlabError({
        code: 'invariant/not-configured',
        message: `[netlab] duplicate scenario id: ${id}`,
      });
    }

    this.byId.set(id, scenario);
  }

  get(id: string): Scenario | undefined {
    return this.byId.get(id);
  }

  list(): readonly Scenario[] {
    return [...this.byId.values()];
  }

  clear(): void {
    this.byId.clear();
  }
}

export const scenarioRegistry = new ScenarioRegistry();
