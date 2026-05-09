import type { Assertion, AssertionResult } from './assertions/types';
import { createAssertionContext } from './assertions/built-in';
import { evaluateRegisteredAssertion } from './assertions/registry';
import { loadScenario } from './scenario-loader';
import { decodeSessionInput } from './session-loader';
import { emitTap } from './tap';

export type CliFormat = 'tap' | 'json';

export interface RunNetlabRunInput {
  readonly scenarioId: string;
  readonly sessionText: string;
  readonly assertionsText: string;
  readonly format: CliFormat;
  readonly verbose?: boolean;
}

export interface RunNetlabRunResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isAssertion(value: unknown): value is Assertion {
  if (!isRecord(value) || typeof value.kind !== 'string') return false;
  switch (value.kind) {
    case 'packet-reaches':
      return (
        typeof value.source === 'string' &&
        typeof value.destination === 'string' &&
        positiveInteger(value.within)
      );
    case 'packet-fails':
      return (
        typeof value.source === 'string' &&
        typeof value.destination === 'string' &&
        (value.reason === 'ttl' ||
          value.reason === 'no-route' ||
          value.reason === 'mtu' ||
          value.reason === 'filtered')
      );
    case 'arp-cache-contains':
      return typeof value.nodeId === 'string' && typeof value.ip === 'string';
    case 'route-table-contains':
      return (
        typeof value.nodeId === 'string' &&
        typeof value.destination === 'string' &&
        typeof value.nextHop === 'string'
      );
    case 'fragmentation-occurs':
      return typeof value.atNodeId === 'string';
    case 'tcp-established':
      return typeof value.client === 'string' && typeof value.server === 'string';
    case 'ospf-converged':
      return positiveInteger(value.withinSteps);
    case 'rubric-passes':
      return typeof value.rubricId === 'string';
    default:
      return false;
  }
}

export function parseAssertionsInput(text: string): readonly Assertion[] {
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed) || !parsed.every(isAssertion)) {
    throw new Error('[netlab-run] invalid assertions JSON');
  }
  return parsed;
}

function emitJson(scenarioId: string, results: readonly AssertionResult[]): string {
  const passCount = results.filter((item) => item.pass).length;
  const failCount = results.length - passCount;
  return `${JSON.stringify({ scenarioId, passCount, failCount, results }, null, 2)}\n`;
}

function redactDiagnostics(result: AssertionResult): AssertionResult {
  if (result.diagnostics === undefined) return result;
  return {
    pass: result.pass,
    description: result.description,
    ...(result.message === undefined ? {} : { message: result.message }),
  };
}

export async function runNetlabRun(input: RunNetlabRunInput): Promise<RunNetlabRunResult> {
  try {
    const scenario = loadScenario(input.scenarioId);
    const decoded = decodeSessionInput(input.sessionText);
    const assertions = parseAssertionsInput(input.assertionsText);
    const context = createAssertionContext({ scenario, session: decoded.session });
    const results: AssertionResult[] = [];

    for (const assertion of assertions) {
      results.push(await evaluateRegisteredAssertion(assertion, context));
    }

    const failCount = results.filter((item) => !item.pass).length;
    const outputResults = input.verbose ? results : results.map(redactDiagnostics);
    return {
      exitCode: Math.min(failCount, 255),
      stdout:
        input.format === 'json'
          ? emitJson(input.scenarioId, outputResults)
          : emitTap(outputResults),
      stderr: '',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exitCode: 2,
      stdout: '',
      stderr: `${message}\n`,
    };
  }
}
