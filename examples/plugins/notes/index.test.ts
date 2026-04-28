import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../../src/hooks/HookEngine';
import { SimulationEngine } from '../../../src/simulation/SimulationEngine';
import { directTopology } from '../../../src/simulation/__fixtures__/topologies';
import { EditSession } from '../../../src/sandbox/EditSession';
import { fromEngine } from '../../../src/sandbox/SimulationSnapshot';
import { decodeEdit, encodeEdit } from '../../../src/sandbox/urlCodec';
import { registerSandboxEdit } from '../../../src/sandbox/plugin/registry';
import { testPlugin } from '../../../src/sandbox/plugin/testPlugin';
import { createNoteEdit, notesPlugin } from './index';

describe('example notes sandbox plugin', () => {
  it('passes the public plugin harness', () => {
    const sampleSnapshot = fromEngine(new SimulationEngine(directTopology(), new HookEngine()));
    const sampleEdit = createNoteEdit('client-1', 'Remember the ingress host');

    expect(testPlugin(notesPlugin, { sampleEdit, sampleSnapshot }).ok).toBe(true);
  });

  it('stores notes in snapshot metadata and round-trips through the shared codec', () => {
    const unregister = registerSandboxEdit(notesPlugin);
    const snapshot = fromEngine(new SimulationEngine(directTopology(), new HookEngine()));
    const edit = createNoteEdit('client-1', 'Remember the ingress host');

    try {
      expect(decodeEdit(encodeEdit(edit))).toEqual(edit);

      const result = EditSession.empty().push(edit).apply(snapshot);

      expect(result.meta?.notes).toEqual({
        'client-1': 'Remember the ingress host',
      });
    } finally {
      unregister();
    }
  });
});
