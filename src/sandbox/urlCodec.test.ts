import { describe, expect, it } from 'vitest';
import { decodeSandboxEdits, encodeSandboxEdits, updateSandboxSearch } from './urlCodec';
import type { Edit } from './edits';

describe('sandbox url codec', () => {
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
});
