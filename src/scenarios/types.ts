import type { NetworkTopology } from '../types/topology';

export interface ScenarioMetadata {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly objective: string;
  readonly difficulty: 'intro' | 'core' | 'advanced';
  readonly protocols: readonly string[];
  readonly prerequisiteIds: readonly string[];
}

export interface ScenarioSampleFlow {
  readonly from: string;
  readonly to: string;
  readonly note?: string;
}

export interface Scenario {
  readonly metadata: ScenarioMetadata;
  readonly topology: NetworkTopology;
  readonly sampleFlows?: readonly ScenarioSampleFlow[];
}
