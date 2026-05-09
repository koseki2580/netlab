import { scenarioRegistry as defaultRegistry } from '../index';
import type { ScenarioRegistry } from '../ScenarioRegistry';
import type { SimulationSnapshot } from '../../sandbox/types';

export interface ScenarioExportOptions {
  readonly scenarioId: string;
  readonly title: string;
  readonly summary: string;
  readonly includeAnnotations: boolean;
  readonly preseedStrategy: 'as-initial' | 'as-delta';
  readonly attachRubricId?: string;
}

export interface ScenarioExportValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export interface ScenarioExportValidationContext {
  readonly registry?: ScenarioRegistry;
}

function addDuplicateErrors(values: readonly string[], label: string, errors: string[]): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      errors.push(`duplicate ${label} id: ${value}`);
    }
    seen.add(value);
  }
}

function hasUnsupportedMarkup(content: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(content);
}

function rubricSourceScenarioIds(registry: ScenarioRegistry, rubricId: string): readonly string[] {
  return registry
    .list()
    .filter((scenario) => scenario.assessmentRubric?.id === rubricId)
    .map((scenario) => scenario.metadata.id);
}

export function validateScenarioExport(
  snapshot: SimulationSnapshot,
  options: ScenarioExportOptions,
  context: ScenarioExportValidationContext = {},
): ScenarioExportValidationResult {
  const registry = context.registry ?? defaultRegistry;
  const errors: string[] = [];

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.scenarioId)) {
    errors.push('scenarioId must be kebab-case');
  }
  if (registry.get(options.scenarioId)) {
    errors.push(`scenarioId already exists: ${options.scenarioId}`);
  }
  if (options.title.trim().length === 0) {
    errors.push('title is required');
  }
  if (options.summary.trim().length === 0) {
    errors.push('summary is required');
  }

  const nodeIds = snapshot.topology.nodes.map((node) => node.id);
  const edgeIds = snapshot.topology.edges.map((edge) => edge.id);
  addDuplicateErrors(nodeIds, 'node', errors);
  addDuplicateErrors(edgeIds, 'edge', errors);

  const nodeIdSet = new Set(nodeIds);
  for (const edge of snapshot.topology.edges) {
    if (!nodeIdSet.has(edge.source)) {
      errors.push(`edge ${edge.id} source node is missing: ${edge.source}`);
    }
    if (!nodeIdSet.has(edge.target)) {
      errors.push(`edge ${edge.id} target node is missing: ${edge.target}`);
    }
  }

  const parameters = snapshot.parameters;
  const parameterEntries: [string, number][] = [
    ['tcp.initialWindow', parameters.tcp.initialWindow],
    ['tcp.mss', parameters.tcp.mss],
    ['tcp.rto', parameters.tcp.rto],
    ['ospf.helloIntervalMs', parameters.ospf.helloIntervalMs],
    ['ospf.deadIntervalMs', parameters.ospf.deadIntervalMs],
    ['arp.cacheTtlMs', parameters.arp.cacheTtlMs],
    ['engine.tickMs', parameters.engine.tickMs],
    ['engine.maxTtl', parameters.engine.maxTtl],
  ];
  for (const [key, value] of parameterEntries) {
    if (!Number.isFinite(value) || value <= 0) {
      errors.push(`parameter ${key} must be positive`);
    }
  }

  if (options.includeAnnotations) {
    for (const annotation of snapshot.annotations) {
      if (hasUnsupportedMarkup(annotation.content)) {
        errors.push(`annotation ${annotation.id} contains unsupported markup`);
      }
    }
  }

  if (options.attachRubricId) {
    const sourceScenarioIds = rubricSourceScenarioIds(registry, options.attachRubricId);
    if (sourceScenarioIds.length === 0) {
      errors.push(`rubric id is not registered: ${options.attachRubricId}`);
    } else if (sourceScenarioIds.length > 1) {
      errors.push(
        `rubric id is ambiguous: ${options.attachRubricId} (${sourceScenarioIds.join(', ')})`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}
