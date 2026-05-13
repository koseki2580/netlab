import { afterEach, describe, expect, it } from 'vitest';
import {
  decodeEdit,
  decodeSandboxEdits,
  encodeEdit,
  encodeSandboxEdits,
  skippedAnnotationUrlEdits,
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

  it('round-trips short trace annotation edits through sandboxState', () => {
    const edit: Edit = {
      kind: 'trace.annotate.add',
      annotation: {
        id: 'annotation-1',
        traceEventId: 'trace-1:0',
        author: 'user',
        content: 'short note',
        createdAt: 0,
      },
    };

    expect(decodeSandboxEdits(updateSandboxSearch('?sandbox=1', [edit]))).toEqual([edit]);
  });

  it('round-trips link.qos edits through sandboxState', () => {
    const edit: Edit = {
      kind: 'link.qos',
      target: { kind: 'edge', edgeId: 'e1' },
      before: null,
      after: {
        bandwidthBps: 1_000_000,
        propagationDelayMs: 20,
        lossPct: 5,
        queueDepthSegments: 100,
        lossSeed: 42,
      },
    };

    expect(decodeSandboxEdits(updateSandboxSearch('?sandbox=1', [edit]))).toEqual([edit]);
  });

  it('round-trips link.shaper edits through sandboxState', () => {
    const edit: Edit = {
      kind: 'link.shaper',
      target: { kind: 'edge', edgeId: 'e1' },
      before: null,
      after: {
        classes: [
          { id: 'ef', dscp: [46], weightPct: 80, queueDepthSegments: 8 },
          { id: 'be', dscp: [], weightPct: 20, queueDepthSegments: 8, default: true },
        ],
      },
    };

    expect(decodeSandboxEdits(updateSandboxSearch('?sandbox=1', [edit]))).toEqual([edit]);
  });

  it('round-trips node observability edits through sandboxState', () => {
    const edits: Edit[] = [
      {
        kind: 'node.netflow',
        target: { kind: 'node', nodeId: 'r1' },
        before: null,
        after: { enabled: true, inactiveTimeoutMs: 15_000, maxCacheEntries: 128 },
      },
      {
        kind: 'node.sflow',
        target: { kind: 'node', nodeId: 'sw1' },
        before: null,
        after: { enabled: true, rate: 8, samplingSeed: 0x5a4b12 },
      },
    ];

    expect(decodeSandboxEdits(updateSandboxSearch('?sandbox=1', edits))).toEqual(edits);
  });

  it('round-trips VRRP and LACP edits through sandboxState', () => {
    const edits: Edit[] = [
      {
        kind: 'node.vrrp',
        target: { kind: 'interface', nodeId: 'r1', ifaceId: 'eth0' },
        before: null,
        after: {
          vrid: 10,
          virtualIp: '10.0.0.254',
          priority: 120,
          advertIntervalMs: 1000,
        },
      },
      {
        kind: 'link.lacp',
        target: { kind: 'node', nodeId: 'sw1' },
        portId: 'fa0/1',
        before: null,
        after: {
          key: 100,
          systemId: '00:00:00:00:10:ff',
          mode: 'active',
          fastTimer: true,
          channelId: 'po1',
        },
      },
    ];

    expect(decodeSandboxEdits(updateSandboxSearch('?sandbox=1', edits))).toEqual(edits);
  });

  it('round-trips wireless node and link edits through sandboxState', () => {
    const edits: Edit[] = [
      {
        kind: 'node.wifi',
        target: { kind: 'node', nodeId: 'ap-1' },
        before: null,
        after: {
          role: 'access-point',
          ssid: 'netlab-wifi',
          psk: 'correct horse battery staple',
        },
      },
      {
        kind: 'link.wireless',
        target: { kind: 'edge', edgeId: 'wifi-a' },
        before: null,
        after: {
          ssid: 'netlab-wifi',
          channel: 6,
          bandMhz: 2437,
          txPowerDbm: 20,
          lossSeed: 12,
        },
      },
    ];

    expect(decodeSandboxEdits(updateSandboxSearch('?sandbox=1', edits))).toEqual(edits);
  });

  it('round-trips tunneling edits through sandboxState', () => {
    const edits: Edit[] = [
      {
        kind: 'node.gre',
        target: { kind: 'interface', nodeId: 'r1', ifaceId: 'eth0' },
        before: null,
        after: { sourceIp: '198.51.100.1', destinationIp: '198.51.100.2', key: 100 },
      },
      {
        kind: 'node.mpls-vrf',
        target: { kind: 'node', nodeId: 'pe1' },
        before: null,
        after: {
          name: 'blue',
          rd: { type: 0, value: '65000:10' },
          importRts: [{ type: 0x0002, value: '65000:10' }],
          exportRts: [{ type: 0x0002, value: '65000:10' }],
          attachedInterfaces: ['ce'],
        },
      },
      {
        kind: 'node.vxlan-vni',
        target: { kind: 'node', nodeId: 'leaf1' },
        before: null,
        after: {
          vni: 10000,
          sourceVtepIp: '192.0.2.1',
          peerVtepIps: ['192.0.2.2'],
          arpSuppression: true,
        },
      },
    ];

    expect(decodeSandboxEdits(updateSandboxSearch('?sandbox=1', edits))).toEqual(edits);
  });

  it('omits long trace annotation edits from sandboxState', () => {
    const edit: Edit = {
      kind: 'trace.annotate.add',
      annotation: {
        id: 'annotation-1',
        traceEventId: 'trace-1:0',
        author: 'user',
        content: 'x'.repeat(151),
        createdAt: 0,
      },
    };

    expect(decodeSandboxEdits(updateSandboxSearch('?sandbox=1', [edit]))).toEqual([]);
    expect(skippedAnnotationUrlEdits([edit])).toEqual([edit]);
  });
});
