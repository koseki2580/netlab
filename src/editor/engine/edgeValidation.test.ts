import { describe, expect, it } from 'vitest';
import type { NetlabEdge, NetlabNode } from '../../types/topology';
import { createRouterNode, createSwitchNode } from '../utils/nodeFactory';
import { EDGE_TONE_COLOR, edgeVerdict } from './edgeValidation';

function named(node: NetlabNode, id: string): NetlabNode {
  return { ...node, id, data: { ...node.data, label: id } };
}

const SW1 = named(createSwitchNode({ x: 0, y: 0 }), 'sw1');
const SW2 = named(createSwitchNode({ x: 200, y: 0 }), 'sw2');
const R1 = named(createRouterNode({ x: 400, y: 0 }), 'r1');

function edge(id: string, source: string, target: string): NetlabEdge {
  return { id, source, target } as NetlabEdge;
}

describe('edge verdict', () => {
  it('does not fault a link for colliding with itself', () => {
    // The edge under test must be excluded from what it is validated against,
    // or every drawn link reports a duplicate.
    const link = edge('e1', 'sw1', 'sw2');
    const verdict = edgeVerdict([SW1, SW2], [link], link);
    expect(verdict.tone).not.toBe('error');
  });

  it('reports an error for a self-loop', () => {
    const link = edge('e1', 'sw1', 'sw1');
    const verdict = edgeVerdict([SW1], [link], link);
    expect(verdict.tone).toBe('error');
    expect(verdict.messages.join(' ')).toMatch(/Self-loop/);
  });

  it('reports an error for a second link between the same pair', () => {
    const first = edge('e1', 'sw1', 'sw2');
    const second = edge('e2', 'sw1', 'sw2');
    const verdict = edgeVerdict([SW1, SW2], [first, second], second);
    expect(verdict.tone).toBe('error');
    expect(verdict.messages.join(' ')).toMatch(/Duplicate/);
  });

  it('maps each tone to its own colour', () => {
    // Same tone, same colour in both engines — that is the point of sharing it.
    const tones = new Set(Object.values(EDGE_TONE_COLOR));
    expect(tones.size).toBe(3);
  });

  it('carries the messages a learner needs to fix the link', () => {
    const link = edge('e1', 'sw1', 'sw1');
    expect(edgeVerdict([SW1], [link], link).messages.length).toBeGreaterThan(0);
  });

  it('says nothing when a link is fine', () => {
    const link = edge('e1', 'sw1', 'r1');
    const verdict = edgeVerdict([SW1, R1], [link], link);
    if (verdict.tone === 'ok') expect(verdict.messages).toEqual([]);
  });
});
