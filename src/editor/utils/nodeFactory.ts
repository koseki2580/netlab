import type { NetlabNode } from '../../types/topology';

// ─── ID & MAC helpers ──────────────────────────────────────────────────────

// Date.now() alone collides: two nodes created inside the same millisecond —
// which is what clicking a palette item twice does — would share an id, and the
// topology keys edges, selection and route tables by it.
let nodeSequence = 0;

function generateNodeId(role: string): string {
  nodeSequence += 1;
  return `${role}-${Date.now().toString(36)}-${nodeSequence.toString(36)}`;
}

function generateMac(): string {
  const hex = () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0');
  // Locally-administered unicast MAC: second nibble set to 2/6/A/E
  return `02:00:${hex()}:${hex()}:${hex()}:${hex()}`;
}

// ─── Factory functions ─────────────────────────────────────────────────────

export function createRouterNode(
  position: { x: number; y: number } = { x: 200, y: 200 },
): NetlabNode {
  const id = generateNodeId('router');
  return {
    id,
    type: 'router',
    position,
    data: {
      label: id,
      layerId: 'l3',
      role: 'router',
      interfaces: [],
      staticRoutes: [],
    },
  };
}

export function createSwitchNode(
  position: { x: number; y: number } = { x: 200, y: 200 },
): NetlabNode {
  const id = generateNodeId('switch');
  return {
    id,
    type: 'switch',
    position,
    data: {
      label: id,
      layerId: 'l2',
      role: 'switch',
      ports: [
        { id: `${id}-p0`, name: 'fa0/0', macAddress: generateMac() },
        { id: `${id}-p1`, name: 'fa0/1', macAddress: generateMac() },
      ],
    },
  };
}

export function createClientNode(
  position: { x: number; y: number } = { x: 200, y: 200 },
): NetlabNode {
  const id = generateNodeId('client');
  return {
    id,
    type: 'client',
    position,
    data: {
      label: id,
      layerId: 'l7',
      role: 'client',
    },
  };
}

export function createServerNode(
  position: { x: number; y: number } = { x: 200, y: 200 },
): NetlabNode {
  const id = generateNodeId('server');
  return {
    id,
    type: 'server',
    position,
    data: {
      label: id,
      layerId: 'l7',
      role: 'server',
    },
  };
}

/** Default position with slight randomization to avoid exact stacking. */
/**
 * Where to drop a newly placed element.
 *
 * Around whatever the learner is looking at, scattered a little so repeated
 * clicks do not stack devices on one spot. `centre` comes from the canvas; the
 * fallback is only for a canvas that has not reported one yet.
 */
export function randomPosition(centre?: { x: number; y: number }): { x: number; y: number } {
  const origin = centre ?? { x: 300, y: 300 };
  return {
    x: Math.round(origin.x - 100 + Math.random() * 200),
    y: Math.round(origin.y - 100 + Math.random() * 200),
  };
}
