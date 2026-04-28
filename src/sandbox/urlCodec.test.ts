import { afterEach, describe, expect, it } from 'vitest';
import {
  decodeEdit,
  decodeSandboxEdits,
  encodeEdit,
  encodeSandboxEdits,
  updateSandboxSearch,
} from './urlCodec';
import type { Edit } from './edits';
import type { PluginEdit, PluginEditSpec } from './plugin/types';
import { registerSandboxEdit } from './plugin/registry';

interface UrlPluginEdit extends PluginEdit {
  readonly kind: 'plugin:test.url';
  readonly value: string;
}

const unregisters: (() => void)[] = [];

function isUrlPluginEdit(value: unknown): value is UrlPluginEdit {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'plugin:test.url' &&
    typeof (value as { value?: unknown }).value === 'string'
  );
}

const urlPluginSpec: PluginEditSpec<UrlPluginEdit> = {
  version: 1,
  kind: 'plugin:test.url',
  validator: isUrlPluginEdit,
  serializer: {
    encode: (edit) => edit.value,
    decode: (value) => {
      const edit = { kind: 'plugin:test.url', value };
      return isUrlPluginEdit(edit) ? edit : null;
    },
  },
  reducer: (snapshot) => snapshot,
  labelFn: (edit) => `URL ${edit.value}`,
};

afterEach(() => {
  while (unregisters.length > 0) unregisters.pop()?.();
});

describe('sandbox url codec', () => {
  it('exposes shared per-edit encode/decode helpers for non-URL transports', () => {
    const edit: Edit = {
      kind: 'interface.mtu',
      target: { kind: 'interface', nodeId: 'router-r1', ifaceId: 'tun0' },
      before: 1500,
      after: 500,
    };

    expect(decodeEdit(encodeEdit(edit))).toEqual(edit);
    expect(decodeEdit({ kind: 'param.set', key: 'unknown', before: 1, after: 2 })).toBeNull();
  });

  it('round-trips a mixed edit session through the sandboxState param', () => {
    const edits: Edit[] = [
      { kind: 'noop' },
      { kind: 'param.set', key: 'engine.tickMs', before: 100, after: 200 },
      {
        kind: 'traffic.launch',
        flow: {
          id: 'flow-1',
          srcNodeId: 'host-a',
          dstNodeId: 'host-b',
          protocol: 'icmp',
        },
      },
    ];

    const search = updateSandboxSearch('?sandbox=1&sandboxTab=traffic', edits);

    expect(decodeSandboxEdits(search)).toEqual(edits);
  });

  it('returns an empty edit list for malformed params', () => {
    expect(decodeSandboxEdits('?sandboxState=not-base64')).toEqual([]);
  });

  it('filters invalid edit payloads out of decoded state', () => {
    const raw = btoa(
      JSON.stringify({
        version: 1,
        edits: [{ kind: 'noop' }, { kind: 'param.set', key: 'unknown', before: 1, after: 2 }],
      }),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    expect(decodeSandboxEdits(`?sandboxState=${raw}`)).toEqual([{ kind: 'noop' }]);
  });

  it('removes sandboxState when the edit list is empty', () => {
    expect(updateSandboxSearch('?sandbox=1&sandboxState=abc', [])).toBe('?sandbox=1');
  });

  it('preserves unrelated query params while updating sandboxState', () => {
    const encoded = encodeSandboxEdits([{ kind: 'noop' }]);

    expect(encoded).toBeTypeOf('string');
    expect(updateSandboxSearch('?sandbox=1&intro=sandbox-intro-mtu', [{ kind: 'noop' }])).toBe(
      `?sandbox=1&intro=sandbox-intro-mtu&sandboxState=${encoded}`,
    );
  });

  it('round-trips registered plugin edits through sandboxState', () => {
    unregisters.push(registerSandboxEdit(urlPluginSpec));
    const edit: UrlPluginEdit = { kind: 'plugin:test.url', value: 'persist me' };

    const search = updateSandboxSearch('?sandbox=1', [edit]);

    expect(decodeSandboxEdits(search)).toEqual([edit]);
  });
});
