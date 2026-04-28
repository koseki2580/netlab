import { afterEach, describe, expect, it, vi } from 'vitest';
import { hookEngine } from '../../hooks/HookEngine';
import { HookEngine } from '../../hooks/HookEngine';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { directTopology } from '../../simulation/__fixtures__/topologies';
import { EditSession } from '../EditSession';
import { fromEngine } from '../SimulationSnapshot';
import { decodeEdit, encodeEdit } from '../urlCodec';
import type { PluginEdit, PluginEditSpec } from './types';
import { getSandboxEditSpec, registerSandboxEdit, registeredSandboxEditKinds } from './registry';

interface TestPluginEdit extends PluginEdit {
  readonly kind: 'plugin:test.note';
  readonly target: { readonly kind: 'node'; readonly nodeId: string };
  readonly note: string;
}

const unregisters: (() => void)[] = [];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTestPluginEdit(value: unknown): value is TestPluginEdit {
  return (
    isRecord(value) &&
    value.kind === 'plugin:test.note' &&
    isRecord(value.target) &&
    value.target.kind === 'node' &&
    typeof value.target.nodeId === 'string' &&
    typeof value.note === 'string'
  );
}

function makeSpec(
  overrides: Partial<PluginEditSpec<TestPluginEdit>> = {},
): PluginEditSpec<TestPluginEdit> {
  return {
    version: 1,
    kind: 'plugin:test.note',
    validator: isTestPluginEdit,
    serializer: {
      encode: (edit) => JSON.stringify({ target: edit.target, note: edit.note }),
      decode: (value) => {
        const parsed = JSON.parse(value) as unknown;
        const edit = isRecord(parsed) ? { kind: 'plugin:test.note', ...parsed } : parsed;
        return isTestPluginEdit(edit) ? edit : null;
      },
    },
    reducer: (snapshot, edit) => ({
      ...snapshot,
      topology: {
        ...snapshot.topology,
        nodes: snapshot.topology.nodes.map((node) =>
          node.id === edit.target.nodeId
            ? { ...node, data: { ...node.data, sandboxNote: edit.note } }
            : node,
        ),
      },
    }),
    labelFn: (edit) => `Note: ${edit.note}`,
    ...overrides,
  };
}

afterEach(() => {
  while (unregisters.length > 0) {
    unregisters.pop()?.();
  }
  vi.restoreAllMocks();
});

describe('sandbox plugin edit registry', () => {
  it('registers and unregisters a namespace-prefixed plugin edit atomically', () => {
    const spec = makeSpec();
    const unregister = registerSandboxEdit(spec);
    unregisters.push(unregister);

    expect(registeredSandboxEditKinds()).toContain('plugin:test.note');
    expect(getSandboxEditSpec('plugin:test.note')).toBe(spec);

    unregister();
    unregisters.pop();

    expect(registeredSandboxEditKinds()).not.toContain('plugin:test.note');
    expect(getSandboxEditSpec('plugin:test.note')).toBeNull();
  });

  it.each(['note', 'plugin:', 'plugin:note'])('rejects malformed plugin kind %s', (kind) => {
    expect(() => registerSandboxEdit(makeSpec({ kind: kind as 'plugin:test.note' }))).toThrow(
      /plugin edit kind/i,
    );
  });

  it('rejects duplicate plugin edit kinds', () => {
    unregisters.push(registerSandboxEdit(makeSpec()));

    expect(() => registerSandboxEdit(makeSpec())).toThrow(/duplicate/i);
  });

  it('round-trips plugin edits through the shared per-edit codec', () => {
    unregisters.push(registerSandboxEdit(makeSpec()));
    const edit: TestPluginEdit = {
      kind: 'plugin:test.note',
      target: { kind: 'node', nodeId: 'client-1' },
      note: 'watch this node',
    };

    expect(decodeEdit(encodeEdit(edit))).toEqual(edit);
  });

  it('applies registered plugin reducers as first-class session edits', () => {
    unregisters.push(registerSandboxEdit(makeSpec()));
    const snapshot = fromEngine(new SimulationEngine(directTopology(), new HookEngine()));
    const edit: TestPluginEdit = {
      kind: 'plugin:test.note',
      target: { kind: 'node', nodeId: 'client-1' },
      note: 'watch this node',
    };

    const result = EditSession.empty().push(edit).apply(snapshot);

    expect(result.topology.nodes[0]?.data.sandboxNote).toBe('watch this node');
  });

  it('returns the base snapshot and emits plugin-error when a plugin reducer throws', async () => {
    const rejected = vi.fn((payload: unknown) => {
      void payload;
    });
    const unsubscribe = hookEngine.on('sandbox:edit-rejected', async (payload, next) => {
      rejected(payload);
      await next();
    });
    unregisters.push(
      registerSandboxEdit(
        makeSpec({
          reducer: () => {
            throw new Error('plugin exploded');
          },
        }),
      ),
    );
    const snapshot = fromEngine(new SimulationEngine(directTopology(), new HookEngine()));
    const edit: TestPluginEdit = {
      kind: 'plugin:test.note',
      target: { kind: 'node', nodeId: 'client-1' },
      note: 'watch this node',
    };

    const result = EditSession.empty().push(edit).apply(snapshot);
    await Promise.resolve();
    unsubscribe();

    expect(result).toBe(snapshot);
    expect(rejected).toHaveBeenCalledWith({ edit, reason: 'plugin-error' });
  });
});
