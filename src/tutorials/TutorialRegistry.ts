import { NetlabError } from '../errors';
import { scenarioRegistry, type ScenarioRegistry } from '../scenarios';
import { isTutorial } from './types';
import type { Tutorial } from './types';

export class TutorialRegistry {
  private readonly byId = new Map<string, Tutorial>();

  constructor(private readonly scenarios: ScenarioRegistry = scenarioRegistry) {}

  register(tutorial: Tutorial): void {
    if (!isTutorial(tutorial)) {
      throw new NetlabError({
        code: 'invariant/not-configured',
        message: '[netlab] tutorial must match Tutorial shape',
      });
    }

    if (this.byId.has(tutorial.id)) {
      throw new NetlabError({
        code: 'invariant/not-configured',
        message: `[netlab] duplicate tutorial id: ${tutorial.id}`,
      });
    }

    if (!this.scenarios.get(tutorial.scenarioId)) {
      throw new NetlabError({
        code: 'invariant/not-found',
        message: `[netlab] unknown tutorial scenario id: ${tutorial.scenarioId}`,
      });
    }

    if (tutorial.steps.length < 1 || tutorial.steps.length > 12) {
      throw new NetlabError({
        code: 'invariant/not-configured',
        message: `[netlab] tutorial ${tutorial.id} must define between 1 and 12 steps`,
      });
    }

    if (tutorial.steps.some((step) => typeof step.predicate !== 'function')) {
      throw new NetlabError({
        code: 'invariant/not-configured',
        message: `[netlab] tutorial ${tutorial.id} contains a step without a predicate`,
      });
    }

    this.byId.set(tutorial.id, tutorial);
  }

  get(id: string): Tutorial | undefined {
    return this.byId.get(id);
  }

  findByScenarioId(scenarioId: string): Tutorial | undefined {
    return [...this.byId.values()].find((tutorial) => tutorial.scenarioId === scenarioId);
  }

  list(): readonly Tutorial[] {
    return [...this.byId.values()];
  }

  clear(): void {
    this.byId.clear();
  }
}
