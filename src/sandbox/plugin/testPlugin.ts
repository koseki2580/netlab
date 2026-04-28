import { cloneSnapshot, snapshotEquals } from '../SimulationSnapshot';
import type { PluginEdit, PluginEditSpec, PluginTestOptions, PluginTestResult } from './types';
import { assertValidPluginEditSpec } from './validator';

function addError(errors: string[], message: string): void {
  errors.push(message);
}

export function testPlugin<E extends PluginEdit>(
  spec: PluginEditSpec<E>,
  options: PluginTestOptions<E>,
): PluginTestResult {
  const errors: string[] = [];

  try {
    assertValidPluginEditSpec(spec);
  } catch (error) {
    addError(errors, error instanceof Error ? error.message : 'invalid plugin edit spec');
    return { ok: false, errors };
  }

  if (options.sampleEdit.kind !== spec.kind) {
    addError(errors, 'sample edit kind must match the plugin spec kind');
  }
  if (!spec.validator(options.sampleEdit)) {
    addError(errors, 'plugin validator must accept its sample edit');
  }

  try {
    const encoded = spec.serializer.encode(options.sampleEdit);
    const decoded = spec.serializer.decode(encoded);
    if (!decoded || !spec.validator(decoded)) {
      addError(errors, 'plugin serializer must decode its encoded sample edit');
    } else if (JSON.stringify(decoded) !== JSON.stringify(options.sampleEdit)) {
      addError(errors, 'plugin serializer must round-trip the sample edit');
    }
  } catch (error) {
    addError(
      errors,
      `plugin serializer must not throw for the sample edit: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const before = cloneSnapshot(options.sampleSnapshot);
  try {
    const first = spec.reducer(options.sampleSnapshot, options.sampleEdit);
    const second = spec.reducer(options.sampleSnapshot, options.sampleEdit);
    const twice = spec.reducer(first, options.sampleEdit);
    if (!snapshotEquals(options.sampleSnapshot, before)) {
      addError(errors, 'plugin reducer must not mutate its input snapshot');
    }
    if (!snapshotEquals(first, second)) {
      addError(errors, 'plugin reducer must be deterministic for the same snapshot and edit');
    }
    if (!snapshotEquals(twice, first)) {
      addError(errors, 'plugin reducer must be idempotent for the same edit');
    }
  } catch (error) {
    addError(
      errors,
      `plugin reducer must be total and must not mutate frozen input snapshots: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  return { ok: errors.length === 0, errors };
}
