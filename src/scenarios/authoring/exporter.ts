import type { EditSession } from '../../sandbox/EditSession';
import type { TraceAnnotation } from '../../sandbox/annotations/types';
import type { Edit } from '../../sandbox/edits';
import type { ProtocolParameterSet, SimulationSnapshot } from '../../sandbox/types';
import { scenarioRegistry } from '../index';
import type { Scenario } from '../types';
import { formatScenarioTsSource, toScenarioConstName } from './ts-formatter';
import { validateScenarioExport, type ScenarioExportOptions } from './validator';

export type ExportOptions = ScenarioExportOptions;

export interface AuthoredScenario extends Scenario {
  readonly parameters: ProtocolParameterSet;
  readonly authoring: {
    readonly preseedStrategy: ExportOptions['preseedStrategy'];
  };
}

export interface ExportedScenarioJson {
  readonly schemaVersion: 1;
  readonly scenario: AuthoredScenario;
  readonly assessmentRubricId?: string;
}

export interface ExportResult {
  readonly ts: string;
  readonly json: string;
  readonly warnings: readonly string[];
}

type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly SerializableValue[]
  | { readonly [key: string]: SerializableValue };

type SerializableValue = JsonValue | MapMarker;

interface MapMarker {
  readonly __netlabMap: readonly [string, SerializableValue][];
}

interface TsExpression {
  readonly __netlabTsExpression: string;
}

function isMapMarker(value: unknown): value is MapMarker {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { __netlabMap?: unknown }).__netlabMap)
  );
}

function isTsExpression(value: unknown): value is TsExpression {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { __netlabTsExpression?: unknown }).__netlabTsExpression === 'string'
  );
}

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function unsupportedValue(path: string): never {
  throw new Error(`unsupported scenario export value at ${path}`);
}

function childPath(path: string, key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;
}

function tsExpression(source: string): TsExpression {
  return { __netlabTsExpression: source };
}

function toSerializable(value: unknown, path = 'value'): SerializableValue {
  if (value instanceof Map) {
    return {
      __netlabMap: Array.from(value.entries()).map(([key, entry]) => [
        String(key),
        toSerializable(entry, `${path}.get(${JSON.stringify(String(key))})`),
      ]),
    };
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => toSerializable(entry, `${path}[${index}]`));
  }
  if (typeof value === 'object' && value !== null) {
    if (!isPlainObject(value)) {
      unsupportedValue(path);
    }
    const output: Record<string, SerializableValue> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        output[key] = toSerializable(entry, childPath(path, key));
      }
    }
    return output;
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  unsupportedValue(path);
}

function fromSerializable(value: unknown): unknown {
  if (isMapMarker(value)) {
    return new Map(value.__netlabMap.map(([key, entry]) => [key, fromSerializable(entry)]));
  }
  if (Array.isArray(value)) {
    return value.map(fromSerializable);
  }
  if (typeof value === 'object' && value !== null) {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      output[key] = fromSerializable(entry);
    }
    return output;
  }
  return value;
}

function quote(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function propertyKey(key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : quote(key);
}

function literal(value: unknown, indent = 0, path = 'value'): string {
  const pad = ' '.repeat(indent);
  const childPad = ' '.repeat(indent + 2);

  if (isTsExpression(value)) {
    return value.__netlabTsExpression;
  }
  if (value instanceof Map) {
    const entries = Array.from(value.entries());
    if (entries.length === 0) return 'new Map()';
    const body = entries
      .map(
        ([key, entry]) =>
          `${childPad}[${quote(String(key))}, ${literal(
            entry,
            indent + 2,
            `${path}.get(${JSON.stringify(String(key))})`,
          )}],`,
      )
      .join('\n');
    return `new Map([\n${body}\n${pad}])`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const body = value
      .map((entry, index) => `${childPad}${literal(entry, indent + 2, `${path}[${index}]`)},`)
      .join('\n');
    return `[\n${body}\n${pad}]`;
  }
  if (typeof value === 'object' && value !== null) {
    if (!isPlainObject(value)) {
      unsupportedValue(path);
    }
    const entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
    if (entries.length === 0) return '{}';
    const body = entries
      .map(
        ([key, entry]) =>
          `${childPad}${propertyKey(key)}: ${literal(entry, indent + 2, childPath(path, key))},`,
      )
      .join('\n');
    return `{\n${body}\n${pad}}`;
  }
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (value === null) return 'null';
  unsupportedValue(path);
}

function normalizeAnnotations(snapshot: SimulationSnapshot): readonly TraceAnnotation[] {
  return snapshot.annotations.map((annotation) => ({ ...annotation, author: 'scenario' }));
}

function rubricSourceScenarioId(rubricId: string | undefined): string | null {
  if (!rubricId) return null;
  return (
    scenarioRegistry.list().find((scenario) => scenario.assessmentRubric?.id === rubricId)?.metadata
      .id ?? null
  );
}

function warningsForOptions(options: ExportOptions): readonly string[] {
  const sourceScenarioId = rubricSourceScenarioId(options.attachRubricId);
  return sourceScenarioId && options.attachRubricId
    ? [
        `assessment rubric ${options.attachRubricId} is referenced through scenario ${sourceScenarioId}`,
      ]
    : [];
}

function buildScenario(
  snapshot: SimulationSnapshot,
  session: EditSession,
  options: ExportOptions,
): AuthoredScenario {
  const scenario: AuthoredScenario = {
    metadata: {
      id: options.scenarioId,
      title: options.title.trim(),
      summary: options.summary.trim(),
      objective: options.summary.trim(),
      difficulty: 'core',
      protocols: [],
      prerequisiteIds: [],
    },
    topology: snapshot.topology,
    parameters: snapshot.parameters,
    authoring: { preseedStrategy: options.preseedStrategy },
  };
  return {
    ...scenario,
    ...(options.preseedStrategy === 'as-delta'
      ? { preseedEdits: session.edits as readonly Edit[] }
      : {}),
    ...(options.includeAnnotations ? { preseedAnnotations: normalizeAnnotations(snapshot) } : {}),
  };
}

function buildJson(scenario: AuthoredScenario, options: ExportOptions): string {
  const payload = {
    schemaVersion: 1,
    scenario,
    ...(options.attachRubricId ? { assessmentRubricId: options.attachRubricId } : {}),
  };
  return JSON.stringify(toSerializable(payload, 'export'), null, 2);
}

function buildTs(scenario: AuthoredScenario, options: ExportOptions): string {
  const constName = toScenarioConstName(options.scenarioId);
  const sourceScenarioId = rubricSourceScenarioId(options.attachRubricId);
  const imports = [
    "import type { Scenario } from './types';",
    ...(sourceScenarioId ? ["import { scenarioRegistry } from './ScenarioRegistry';"] : []),
  ];
  const scenarioLiteral = {
    ...scenario,
    ...(sourceScenarioId
      ? {
          assessmentRubric: tsExpression(
            `scenarioRegistry.get(${quote(sourceScenarioId)})!.assessmentRubric!`,
          ),
        }
      : {}),
  };

  return formatScenarioTsSource(
    `${imports.join('\n')}\n\nexport const ${constName}: Scenario = ${literal(
      scenarioLiteral,
      0,
      'scenario',
    )};`,
  );
}

export function exportScenarioFromSnapshot(
  snapshot: SimulationSnapshot,
  session: EditSession,
  options: ExportOptions,
): ExportResult {
  const validation = validateScenarioExport(snapshot, options);
  if (!validation.valid) {
    throw new Error(validation.errors.join('\n'));
  }

  const scenario = buildScenario(snapshot, session, options);
  return {
    ts: buildTs(scenario, options),
    json: buildJson(scenario, options),
    warnings: warningsForOptions(options),
  };
}

export function parseExportedScenarioJson(text: string): ExportedScenarioJson {
  const parsed = fromSerializable(JSON.parse(text) as unknown);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('invalid scenario export JSON');
  }
  const record = parsed as { readonly schemaVersion?: unknown; readonly scenario?: unknown };
  if (record.schemaVersion !== 1) {
    if (typeof record.schemaVersion === 'number') {
      throw new Error(`unsupported scenario export schema: ${record.schemaVersion}`);
    }
    throw new Error('invalid scenario export JSON');
  }
  if (typeof record.scenario !== 'object' || record.scenario === null) {
    throw new Error('invalid scenario export JSON');
  }
  return parsed as ExportedScenarioJson;
}
