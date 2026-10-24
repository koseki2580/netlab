import { describe, expect, it, vi } from 'vitest';
import type { NetworkArea } from '../types/areas';
import type { NetlabEdge, NetlabNode } from '../types/topology';
import {
  lodView,
  neighboursOf,
  styleEdges,
  styleNodes,
  type FailureView,
  type PathHighlight,
} from './canvasViewModel';

const node = (id: string, extra: Partial<NetlabNode['data']> = {}): NetlabNode => ({
  id,
  type: 'client',
  position: { x: 0, y: 0 },
  data: { label: id, role: 'client', layerId: 'l7', ip: '10.0.0.1', ...extra },
});
const edge = (id: string, source: string, target: string, extra: Partial<NetlabEdge> = {}) =>
  ({ id, source, target, ...extra }) as NetlabEdge;

const noFailure: FailureView = {
  isNodeDown: () => false,
  isEdgeDown: () => false,
  isInterfaceDown: () => false,
};
const noPath: PathHighlight = {
  activeEdgeIds: [],
  activePathEdgeIds: [],
  mode: 'path',
  color: 'c',
};

describe('neighboursOf', () => {
  it('names the devices and links one hop from the selection, and nothing without one', () => {
    const edges = [edge('a-b', 'a', 'b'), edge('b-c', 'b', 'c'), edge('c-d', 'c', 'd')];
    const { neighborNodeIds, neighborEdgeIds } = neighboursOf('b', edges);
    expect([...neighborNodeIds].sort()).toEqual(['a', 'c']);
    expect([...neighborEdgeIds].sort()).toEqual(['a-b', 'b-c']);
    expect(neighboursOf(null, edges).neighborNodeIds.size).toBe(0);
  });
});

describe('styleNodes', () => {
  it('marks the selected device and its neighbours, and leaves the rest as they were', () => {
    const nodes = [node('a'), node('b'), node('c')];
    const styled = styleNodes(nodes, noFailure, 'a', new Set(['b']));
    expect(styled[0]?.className).toBe('netlab-node-selected');
    expect(styled[1]?.className).toBe('netlab-node-neighbor');
    expect(styled[2]).toBe(nodes[2]);
  });

  it('greys a device that is down and counts its interfaces that are down', () => {
    const router = node('r', {
      role: 'router',
      interfaces: [
        { id: 'e0', name: 'e0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: 'm' },
      ],
    });
    const failure: FailureView = {
      ...noFailure,
      isNodeDown: (id) => id === 'pc',
      isInterfaceDown: (id, iface) => id === 'r' && iface === 'e0',
    };
    const [pc, r] = styleNodes([node('pc'), router], failure, null, new Set());
    expect(pc?.style).toMatchObject({ opacity: 0.4, filter: 'grayscale(80%)' });
    expect(r?.data._downInterfaceCount).toBe(1);
  });

  it('never marks an area background as selected', () => {
    const area = { ...node('__area__x'), type: 'netlab-area' };
    expect(styleNodes([area], noFailure, '__area__x', new Set())[0]).toBe(area);
  });
});

describe('styleEdges', () => {
  const nodes = [node('a'), node('b')];

  it('draws a down link red and dashed, a blocked one dotted, and never animates them', () => {
    const failure = { ...noFailure, isEdgeDown: (id: string) => id === 'down' };
    const [down, blocked] = styleEdges(
      [
        edge('down', 'a', 'b', { animated: true }),
        edge('blocked', 'a', 'b', { data: { state: 'blocked' } }),
      ],
      nodes,
      noPath,
      failure,
      new Set(),
      false,
    );
    expect(down).toMatchObject({
      animated: false,
      data: { state: 'down' },
      style: { stroke: 'var(--netlab-accent-red)', strokeDasharray: '6 3' },
    });
    expect(blocked).toMatchObject({ animated: false, style: { strokeDasharray: '1 3' } });
  });

  it("colours the hop being shown and, in path mode, the path so far in the trace's colour", () => {
    const [hop, path, other] = styleEdges(
      [edge('hop', 'a', 'b'), edge('path', 'a', 'b'), edge('other', 'a', 'b')],
      nodes,
      { activeEdgeIds: ['hop'], activePathEdgeIds: ['hop', 'path'], mode: 'path', color: 'gold' },
      noFailure,
      new Set(),
      false,
    );
    expect(hop).toMatchObject({
      animated: true,
      style: { stroke: 'gold', strokeWidth: 3, opacity: 1 },
    });
    expect(path).toMatchObject({ animated: true, style: { stroke: 'gold', opacity: 0.45 } });
    expect(other?.style?.stroke).toBeUndefined();
  });

  it('animates nothing when motion is reduced, whoever asked for it', () => {
    const styled = styleEdges(
      [edge('hop', 'a', 'b'), edge('authored', 'a', 'b', { animated: true })],
      nodes,
      { ...noPath, activeEdgeIds: ['hop'] },
      noFailure,
      new Set(),
      true,
    );
    expect(styled.every((entry) => entry.animated !== true)).toBe(true);
  });

  it('gives every plain link the validation type and marks neighbouring links', () => {
    const [styled] = styleEdges(
      [edge('e', 'a', 'b')],
      nodes,
      noPath,
      noFailure,
      new Set(['e']),
      false,
    );
    expect(styled).toMatchObject({
      type: 'validation-smoothstep',
      className: 'netlab-edge-neighbor',
    });
  });
});

describe('lodView', () => {
  const area: NetworkArea = {
    id: 'lan',
    name: 'LAN',
    type: 'private',
    subnet: '10.0.0.0/24',
    devices: Array.from({ length: 12 }, (_, index) => `h${index}`),
    visualConfig: { x: 0, y: 0, width: 100, height: 100 },
  };
  const hosts = area.devices.map((id) => node(id));

  it('collapses a crowded area when zoomed out, and the cluster expands its area', () => {
    const expand = vi.fn();
    const view = lodView([area], hosts, [], 0.2, new Set(), expand);
    const cluster = view.nodes.find((entry) => entry.type === 'netlab-area-cluster');
    expect(cluster).toBeDefined();
    expect(view.nodes.some((entry) => entry.id === 'h0')).toBe(false);
    (cluster?.data as unknown as { onExpand: () => void }).onExpand();
    expect(expand).toHaveBeenCalledWith('lan');
  });

  it('leaves an area open when it has been pinned open', () => {
    const view = lodView([area], hosts, [], 0.2, new Set(['lan']), () => undefined);
    expect(view.nodes.map((entry) => entry.id)).toEqual(area.devices);
  });
});
