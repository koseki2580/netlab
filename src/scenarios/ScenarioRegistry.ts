import { NetlabError } from '../errors';
import type { Scenario } from './types';

const SCENARIO_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ScenarioRegistry {
  private readonly byId = new Map<string, Scenario>();

  register(scenario: Scenario): void {
    const id = scenario.metadata.id;
    this.validateMetadata(scenario);
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

  private validateMetadata(scenario: Scenario): void {
    const { metadata } = scenario;
    if (!SCENARIO_ID_RE.test(metadata.id)) {
      throw new NetlabError({
        code: 'invariant/malformed-id',
        message: '[netlab] scenario id must be kebab-case',
        context: { id: metadata.id },
      });
    }
    if (metadata.summary.length > 140) {
      throw new NetlabError({
        code: 'invariant/not-configured',
        message: '[netlab] scenario summary must be 140 characters or fewer',
        context: { id: metadata.id, length: metadata.summary.length },
      });
    }
    if (!['intro', 'core', 'advanced'].includes(metadata.difficulty)) {
      throw new NetlabError({
        code: 'invariant/not-configured',
        message: '[netlab] scenario difficulty is unsupported',
        context: { id: metadata.id, difficulty: metadata.difficulty },
      });
    }
  }
}

export const scenarioRegistry = new ScenarioRegistry();
