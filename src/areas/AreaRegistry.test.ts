import { describe, expect, it } from 'vitest';
import { assertDefined } from '../utils';
import type { NetworkArea } from '../types/areas';
import { areasToNodes } from './AreaRegistry';

function makeArea(overrides: Partial<NetworkArea> = {}): NetworkArea {
  return {
    id: 'area-1',
    name: 'Test Area',
    type: 'private',
    subnet: '10.0.0.0/24',
    devices: [],
    ...overrides,
  };
}

describe('areasToNodes', () => {
  it('returns empty array for empty input', () => {
    expect(areasToNodes([])).toEqual([]);
  });

  it('transforms a single area with full visualConfig', () => {
    const [node] = areasToNodes([
      makeArea({
        visualConfig: {
          x: 10,
          y: 20,
          width: 500,
          height: 600,
          color: 'rgba(1, 2, 3, 0.5)',
          label: 'Private Segment',
        },
      }),
    ]);

    expect(node).toMatchObject({
      id: '__area__area-1',
      type: 'netlab-area',
      position: { x: 10, y: 20 },
      zIndex: -1,
      selectable: false,
      draggable: false,
      data: {
        label: 'Private Segment',
        name: 'Test Area',
        type: 'private',
        width: 500,
        height: 600,
        color: 'rgba(1, 2, 3, 0.5)',
      },
    });
  });

  it('applies default values when visualConfig is missing', () => {
    const [node] = areasToNodes([makeArea()]);

    expect(node).toMatchObject({
      position: { x: 0, y: 0 },
      data: {
        label: 'Test Area',
        width: 300,
        height: 400,
      },
    });
  });

  it('applies default values when visualConfig has partial fields', () => {
    const [node] = areasToNodes([
      makeArea({
        visualConfig: {
          x: 50,
          y: 75,
          width: 450,
          height: 400,
        },
      }),
    ]);

    expect(node).toMatchObject({
      position: { x: 50, y: 75 },
      data: {
        label: 'Test Area',
        width: 450,
        height: 400,
      },
    });
  });

  it('generates correct node ID with __area__ prefix', () => {
    const node = areasToNodes([makeArea({ id: 'dmz-1' })])[0];
    assertDefined(node, 'expected generated area node');

    expect(node.id).toBe('__area__dmz-1');
  });

  it('sets type to netlab-area', () => {
    const node = areasToNodes([makeArea()])[0];
    assertDefined(node, 'expected area node');

    expect(node.type).toBe('netlab-area');
  });

  it('sets zIndex to -1', () => {
    const node = areasToNodes([makeArea()])[0];
    assertDefined(node, 'expected area node');

    expect(node.zIndex).toBe(-1);
  });

  it('sets selectable to false and draggable to false', () => {
    const node = areasToNodes([makeArea()])[0];
    assertDefined(node, 'expected area node');

    expect(node.selectable).toBe(false);
    expect(node.draggable).toBe(false);
  });

  it('transforms multiple areas independently', () => {
    const nodes = areasToNodes([
      makeArea({ id: 'area-1', name: 'Area One' }),
      makeArea({
        id: 'area-2',
        name: 'Area Two',
        type: 'dmz',
        visualConfig: {
          x: 100,
          y: 200,
          width: 350,
          height: 250,
          label: 'DMZ',
        },
      }),
    ]);

    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({
      id: '__area__area-1',
      data: { label: 'Area One', type: 'private' },
    });
    expect(nodes[1]).toMatchObject({
      id: '__area__area-2',
      position: { x: 100, y: 200 },
      data: { label: 'DMZ', type: 'dmz', width: 350, height: 250 },
    });
  });
});
