import { describe, expect, it } from 'vitest';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { HookEngine } from '../../hooks/HookEngine';
import { directTopology } from '../../simulation/__fixtures__/topologies';
import { fromEngine } from '../SimulationSnapshot';
import type { PluginEdit, PluginEditSpec } from './types';
import { testPlugin } from './testPlugin';

interface TestPluginEdit extends PluginEdit {
  readonly kind: 'plugin:test.harness';
  readonly value: string;
}

function isTestPluginEdit(value: unknown): value is TestPluginEdit {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'plugin:test.harness' &&
    typeof (value as { value?: unknown }).value === 'string'
  );
}

function makeSpec(
  reducer: PluginEditSpec<TestPluginEdit>['reducer'] = (snapshot) => snapshot,
): PluginEditSpec<TestPluginEdit> {
  return {
    version: 1,
    kind: 'plugin:test.harness',
    validator: isTestPluginEdit,
    serializer: {
      encode: (edit) => JSON.stringify({ value: edit.value }),
      decode: (value) => {
        const parsed = JSON.parse(value) as { value?: unknown };
        const edit = { kind: 'plugin:test.harness', value: parsed.value };
        return isTestPluginEdit(edit) ? edit : null;
      },
    },
    reducer,
    labelFn: (edit) => edit.value,
  };
}

describe('testPlugin', () => {
  it('passes a pure plugin reducer and serializer round-trip', () => {
    const sampleEdit: TestPluginEdit = { kind: 'plugin:test.harness', value: 'ok' };
    const sampleSnapshot = fromEngine(new SimulationEngine(directTopology(), new HookEngine()));

    expect(testPlugin(makeSpec(), { sampleEdit, sampleSnapshot }).ok).toBe(true);
  });

  it('reports reducers that mutate their input snapshot', () => {
    const sampleEdit: TestPluginEdit = { kind: 'plugin:test.harness', value: 'bad' };
    const sampleSnapshot = fromEngine(new SimulationEngine(directTopology(), new HookEngine()));

    const result = testPlugin(
      makeSpec((snapshot) => {
        (snapshot.topology.nodes as unknown as unknown[]).push({ id: 'mutated' });
        return snapshot;
      }),
      { sampleEdit, sampleSnapshot },
    );

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toMatch(/mutate/i);
  });
});
