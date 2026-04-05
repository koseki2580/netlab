import type { NetlabNode } from '../../types/topology';

// ─── ID & MAC helpers ──────────────────────────────────────────────────────

function generateNodeId(role: string): string {
  return `${role}-${Date.now().toString(36)}`;
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
export function randomPosition(): { x: number; y: number } {
  return {
    x: 200 + Math.random() * 200,
    y: 200 + Math.random() * 200,
  };
}
