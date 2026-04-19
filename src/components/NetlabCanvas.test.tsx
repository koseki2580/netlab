/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NETLAB_LIGHT_THEME } from '../theme';
import type { NetworkTopology, TopologySnapshot } from '../types/topology';
import { assertDefined } from '../utils';
import { useNetlabContext } from './NetlabContext';
import { NetlabCanvas } from './NetlabCanvas';
import { NetlabProvider } from './NetlabProvider';
import { NetlabThemeScope } from './NetlabThemeScope';
import { FailureContext, type FailureContextValue } from '../simulation/FailureContext';
import { SimulationContext, type SimulationContextValue } from '../simulation/SimulationContext';
import { EMPTY_FAILURE_STATE } from '../types/failure';

interface MockNode {
  id: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  selected?: boolean;
  [key: string]: unknown;
}

interface MockEdge {
  id: string;
  source: string;
  target: string;
  selected?: boolean;
  [key: string]: unknown;
}

type MockNodeChange =
  | { type: 'remove'; id: string }
  | { type: 'position'; id: string; position: { x: number; y: number } }
  | { type: 'select'; id: string; selected: boolean };

type MockEdgeChange =
  | { type: 'remove'; id: string }
  | { type: 'select'; id: string; selected: boolean };

interface MockConnection {
  source?: string | null;
  target?: string | null;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
}

interface MockReactFlowProps {
  nodes: MockNode[];
  edges: MockEdge[];
  colorMode?: 'light' | 'dark';
  onNodesChange?: (changes: MockNodeChange[]) => void;
  onEdgesChange?: (changes: MockEdgeChange[]) => void;
  onConnect?: (connection: MockConnection) => void;
  onNodeDragStop?: (event: unknown, node: MockNode, nodes: MockNode[]) => void;
  isValidConnection?: (connection: MockConnection) => boolean;
}

const reactFlowState = vi.hoisted(() => ({
  latestProps: null as MockReactFlowProps | null,
}));

vi.mock('@xyflow/react', async () => {
  const React = await import('react');

  function applyNodeChanges(changes: MockNodeChange[], nodes: MockNode[]): MockNode[] {
    return changes.reduce<MockNode[]>((currentNodes, change) => {
      if (change.type === 'remove') {
        return currentNodes.filter((node) => node.id !== change.id);
      }

      if (change.type === 'position') {
        return currentNodes.map((node) =>
          node.id === change.id ? { ...node, position: change.position } : node,
        );
      }

      if (change.type === 'select') {
        return currentNodes.map((node) =>
          node.id === change.id ? { ...node, selected: change.selected } : node,
        );
      }

      return currentNodes;
    }, nodes);
  }

  function applyEdgeChanges(changes: MockEdgeChange[], edges: MockEdge[]): MockEdge[] {
    return changes.reduce<MockEdge[]>((currentEdges, change) => {
      if (change.type === 'remove') {
        return currentEdges.filter((edge) => edge.id !== change.id);
      }

      if (change.type === 'select') {
        return currentEdges.map((edge) =>
          edge.id === change.id ? { ...edge, selected: change.selected } : edge,
        );
      }

      return currentEdges;
    }, edges);
  }

  function addEdge(connection: MockConnection, edges: MockEdge[]): MockEdge[] {
    const source = connection.source ?? '';
    const target = connection.target ?? '';

    return [
      ...edges,
      {
        id: `e-${source}-${target}-${edges.length}`,
        source,
        target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: connection.type,
      },
    ];
  }

  function useNodesState(initialNodes: MockNode[]) {
    const [nodes, setNodes] = React.useState(initialNodes);
    const onNodesChange = React.useCallback((changes: MockNodeChange[]) => {
      setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
    }, []);

    return [nodes, setNodes, onNodesChange] as const;
  }

  function useEdgesState(initialEdges: MockEdge[]) {
    const [edges, setEdges] = React.useState(initialEdges);
    const onEdgesChange = React.useCallback((changes: MockEdgeChange[]) => {
      setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges));
    }, []);

    return [edges, setEdges, onEdgesChange] as const;
  }

  function ReactFlow(props: MockReactFlowProps) {
    reactFlowState.latestProps = props;
    return React.createElement('div', { 'data-testid': 'react-flow' });
  }

  return {
    ReactFlow,
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
    ConnectionMode: { Loose: 'Loose' },
    useNodesState,
    useEdgesState,
    addEdge,
    BaseEdge: () => null,
    EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    getSmoothStepPath: () => ['M0 0', 0, 0],
    applyNodeChanges,
    applyEdgeChanges,
  };
});

function makeTopology(overrides: Partial<NetworkTopology> = {}): NetworkTopology {
  return {
    nodes: [
      {
        id: 'n1',
        type: 'router',
        position: { x: 50, y: 80 },
        data: { label: 'R1', role: 'router', layerId: 'l3' },
      },
      {
        id: 'n2',
        type: 'router',
        position: { x: 240, y: 80 },
        data: { label: 'R2', role: 'router', layerId: 'l3' },
      },
    ],
    edges: [
      {
        id: 'e1',
        source: 'n1',
        target: 'n2',
        type: 'smoothstep',
      },
    ],
    areas: [],
    routeTables: new Map(),
    ...overrides,
  };
}

function toSnapshot(topology: NetworkTopology): TopologySnapshot {
  return {
    nodes: topology.nodes,
    edges: topology.edges,
    areas: topology.areas,
  };
}

function topologyNodeAt(topology: NetworkTopology, index: number) {
  const node = topology.nodes[index];
  assertDefined(node, `expected topology node at index ${index}`);
  return node;
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let capturedTopology: NetworkTopology | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function CaptureTopology() {
  capturedTopology = useNetlabContext().topology;
  return null;
}

function render(ui: React.ReactElement) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

  act(() => {
    root?.render(ui);
  });

  return {
    rerender(nextUi: React.ReactElement) {
      act(() => {
        root?.render(nextUi);
      });
    },
  };
}

function currentReactFlowProps(): MockReactFlowProps {
  if (!reactFlowState.latestProps) {
    throw new Error('ReactFlow props were not captured');
  }

  return reactFlowState.latestProps;
}

function makeFailureContextValue(
  overrides: Partial<FailureContextValue> = {},
): FailureContextValue {
  return {
    failureState: EMPTY_FAILURE_STATE,
    toggleNode: vi.fn(),
    toggleEdge: vi.fn(),
    toggleInterface: vi.fn(),
    resetFailures: vi.fn(),
    isNodeDown: () => false,
    isEdgeDown: () => false,
    isInterfaceDown: () => false,
    ...overrides,
  };
}

function makeSimulationContextValue(activeEdgeIds: string[]): SimulationContextValue {
  return {
    engine: {} as never,
    sendPacket: vi.fn(async () => undefined),
    simulateDhcp: vi.fn(async () => false),
    simulateDns: vi.fn(async () => null),
    getDhcpLeaseState: vi.fn(() => null),
    getDnsCache: vi.fn(() => null),
    exportPcap: vi.fn(() => new Uint8Array()),
    animationSpeed: 500,
    setAnimationSpeed: vi.fn(),
    isRecomputing: false,
    state: {
      status: 'idle',
      traces: [],
      currentTraceId: null,
      currentStep: -1,
      activeEdgeIds,
      selectedHop: null,
      selectedPacket: null,
      nodeArpTables: {},
      natTables: [],
      connTrackTables: [],
    },
  };
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  reactFlowState.latestProps = null;
  capturedTopology = null;
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  reactFlowState.latestProps = null;
  capturedTopology = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;

  if (container) {
    container.remove();
    container = null;
  }
});

describe('NetlabProvider controlled/uncontrolled inputs', () => {
  it('captures defaultTopology once when topology is omitted', () => {
    const initial = makeTopology();
    const next = makeTopology({
      nodes: [
        { ...topologyNodeAt(initial, 0), position: { x: 400, y: 120 } },
        topologyNodeAt(initial, 1),
      ],
    });

    const view = render(
      <NetlabProvider defaultTopology={toSnapshot(initial)}>
        <CaptureTopology />
      </NetlabProvider>,
    );

    expect(capturedTopology?.nodes[0]?.position).toEqual({ x: 50, y: 80 });

    view.rerender(
      <NetlabProvider defaultTopology={toSnapshot(next)}>
        <CaptureTopology />
      </NetlabProvider>,
    );

    expect(capturedTopology?.nodes[0]?.position).toEqual({ x: 50, y: 80 });
  });
});

describe('NetlabCanvas controlled topology API', () => {
  it('renders without callbacks in legacy uncontrolled mode', () => {
    render(
      <NetlabProvider topology={makeTopology()}>
        <NetlabCanvas />
      </NetlabProvider>,
    );

    const props = currentReactFlowProps();
    expect(props.nodes).toHaveLength(2);
    expect(props.edges).toHaveLength(1);
  });

  it('defaults React Flow to dark color mode', () => {
    render(
      <NetlabProvider topology={makeTopology()}>
        <NetlabCanvas />
      </NetlabProvider>,
    );

    expect(currentReactFlowProps().colorMode).toBe('dark');
  });

  it('forwards the requested React Flow color mode', () => {
    render(
      <NetlabProvider topology={makeTopology()}>
        <NetlabCanvas colorMode="light" />
      </NetlabProvider>,
    );

    expect(currentReactFlowProps().colorMode).toBe('light');
  });

  it('inherits React Flow color mode from NetlabThemeScope when the prop is omitted', () => {
    render(
      <NetlabThemeScope theme={NETLAB_LIGHT_THEME}>
        <NetlabProvider topology={makeTopology()}>
          <NetlabCanvas />
        </NetlabProvider>
      </NetlabThemeScope>,
    );

    expect(currentReactFlowProps().colorMode).toBe('light');
  });

  it('fires onTopologyChange when a new edge is connected', () => {
    const topology = makeTopology({ edges: [] });
    const onTopologyChange = vi.fn();

    render(
      <NetlabProvider topology={topology}>
        <NetlabCanvas onTopologyChange={onTopologyChange} />
      </NetlabProvider>,
    );

    act(() => {
      currentReactFlowProps().onConnect?.({ source: 'n1', target: 'n2' });
    });

    expect(onTopologyChange).toHaveBeenCalledTimes(1);
    expect(onTopologyChange).toHaveBeenLastCalledWith({
      nodes: topology.nodes,
      edges: [
        {
          id: 'e-n1-n2-0',
          source: 'n1',
          target: 'n2',
          sourceHandle: undefined,
          targetHandle: undefined,
          type: 'smoothstep',
        },
      ],
      areas: [],
    });
  });

  it('fires onTopologyChange when an edge is removed', () => {
    const onTopologyChange = vi.fn();

    render(
      <NetlabProvider topology={makeTopology()}>
        <NetlabCanvas onTopologyChange={onTopologyChange} />
      </NetlabProvider>,
    );

    act(() => {
      currentReactFlowProps().onEdgesChange?.([{ id: 'e1', type: 'remove' }]);
    });

    expect(onTopologyChange).toHaveBeenCalledTimes(1);
    expect(onTopologyChange).toHaveBeenLastCalledWith({
      nodes: expect.any(Array),
      edges: [],
      areas: [],
    });
  });

  it('fires onTopologyChange on node drag stop with the updated positions', () => {
    const topology = makeTopology();
    const onTopologyChange = vi.fn();

    render(
      <NetlabProvider topology={topology}>
        <NetlabCanvas onTopologyChange={onTopologyChange} />
      </NetlabProvider>,
    );

    const movedNodes: MockNode[] = [
      { ...topologyNodeAt(topology, 0), position: { x: 180, y: 140 } },
      topologyNodeAt(topology, 1) as MockNode,
    ];
    const movedNode = movedNodes[0];
    assertDefined(movedNode, 'expected moved node');

    act(() => {
      currentReactFlowProps().onNodeDragStop?.({}, movedNode, movedNodes);
    });

    expect(onTopologyChange).toHaveBeenCalledTimes(1);
    expect(onTopologyChange).toHaveBeenLastCalledWith({
      nodes: movedNodes,
      edges: topology.edges,
      areas: [],
    });
  });

  it('fires granular node and edge callbacks independently alongside onTopologyChange', () => {
    const topology = makeTopology({ edges: [] });
    const onNodesChange = vi.fn();
    const onEdgesChange = vi.fn();
    const onTopologyChange = vi.fn();

    render(
      <NetlabProvider topology={topology}>
        <NetlabCanvas
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onTopologyChange={onTopologyChange}
        />
      </NetlabProvider>,
    );

    act(() => {
      currentReactFlowProps().onConnect?.({ source: 'n1', target: 'n2' });
    });

    expect(onEdgesChange).toHaveBeenCalledTimes(1);
    expect(onNodesChange).not.toHaveBeenCalled();

    const movedNodes: MockNode[] = [
      { ...topologyNodeAt(topology, 0), position: { x: 120, y: 160 } },
      topologyNodeAt(topology, 1) as MockNode,
    ];
    const movedNode = movedNodes[0];
    assertDefined(movedNode, 'expected moved node');

    act(() => {
      currentReactFlowProps().onNodeDragStop?.({}, movedNode, movedNodes);
    });

    expect(onNodesChange).toHaveBeenCalledTimes(1);
    expect(onEdgesChange).toHaveBeenCalledTimes(1);
    expect(onTopologyChange).toHaveBeenCalledTimes(2);
  });

  it('re-syncs local React Flow state when topology changes in controlled mode', () => {
    const initial = makeTopology();
    const updated = makeTopology({
      nodes: [
        { ...topologyNodeAt(initial, 0), position: { x: 320, y: 200 } },
        topologyNodeAt(initial, 1),
      ],
    });

    const view = render(
      <NetlabProvider topology={initial}>
        <NetlabCanvas onTopologyChange={vi.fn()} />
      </NetlabProvider>,
    );

    expect(currentReactFlowProps().nodes[0]?.position).toEqual({ x: 50, y: 80 });

    view.rerender(
      <NetlabProvider topology={updated}>
        <NetlabCanvas onTopologyChange={vi.fn()} />
      </NetlabProvider>,
    );

    expect(currentReactFlowProps().nodes[0]?.position).toEqual({ x: 320, y: 200 });
  });

  it('does not re-sync local React Flow state when callbacks are absent', () => {
    const initial = makeTopology();
    const updated = makeTopology({
      nodes: [
        { ...topologyNodeAt(initial, 0), position: { x: 320, y: 200 } },
        topologyNodeAt(initial, 1),
      ],
    });

    const view = render(
      <NetlabProvider topology={initial}>
        <NetlabCanvas />
      </NetlabProvider>,
    );

    expect(currentReactFlowProps().nodes[0]?.position).toEqual({ x: 50, y: 80 });

    view.rerender(
      <NetlabProvider topology={updated}>
        <NetlabCanvas />
      </NetlabProvider>,
    );

    expect(currentReactFlowProps().nodes[0]?.position).toEqual({ x: 50, y: 80 });
  });

  it('uses theme CSS variables for failed edges', () => {
    render(
      <NetlabProvider topology={makeTopology()}>
        <FailureContext.Provider
          value={makeFailureContextValue({ isEdgeDown: (edgeId) => edgeId === 'e1' })}
        >
          <NetlabCanvas />
        </FailureContext.Provider>
      </NetlabProvider>,
    );

    expect(currentReactFlowProps().edges[0]).toMatchObject({
      animated: false,
      style: expect.objectContaining({
        stroke: 'var(--netlab-accent-red)',
        strokeDasharray: '6 3',
        strokeWidth: 2,
      }),
    });
  });

  it('uses theme CSS variables for active edges', () => {
    render(
      <NetlabProvider topology={makeTopology()}>
        <SimulationContext.Provider value={makeSimulationContextValue(['e1'])}>
          <NetlabCanvas />
        </SimulationContext.Provider>
      </NetlabProvider>,
    );

    expect(currentReactFlowProps().edges[0]).toMatchObject({
      animated: true,
      style: expect.objectContaining({
        stroke: 'var(--netlab-accent-cyan)',
        strokeWidth: 2,
      }),
    });
  });

  it('uses theme CSS variables for invalid edges', () => {
    render(
      <NetlabProvider
        topology={makeTopology({
          nodes: [
            {
              id: 'client-1',
              type: 'client',
              position: { x: 50, y: 80 },
              data: { label: 'PC1', role: 'client', layerId: 'l7', ip: '10.0.0.10' },
            },
            {
              id: 'server-1',
              type: 'server',
              position: { x: 240, y: 80 },
              data: { label: 'SRV1', role: 'server', layerId: 'l7', ip: '10.0.0.20' },
            },
          ],
          edges: [
            {
              id: 'e-invalid',
              source: 'client-1',
              target: 'server-1',
              type: 'smoothstep',
            },
          ],
        })}
      >
        <NetlabCanvas />
      </NetlabProvider>,
    );

    expect(currentReactFlowProps().edges[0]).toMatchObject({
      style: expect.objectContaining({
        stroke: 'var(--netlab-accent-red)',
      }),
      data: {
        validationResult: {
          valid: false,
          errors: [
            {
              code: 'endpoint-to-endpoint',
              message: 'Endpoint-to-endpoint connections are not allowed',
            },
          ],
          warnings: [],
        },
      },
    });
  });

  it('uses orange styling for warning-only edges and attaches the validation result', () => {
    render(
      <NetlabProvider
        topology={makeTopology({
          nodes: [
            {
              id: 'router-1',
              type: 'router',
              position: { x: 50, y: 80 },
              data: {
                label: 'R1',
                role: 'router',
                layerId: 'l3',
                interfaces: [
                  {
                    id: 'eth0',
                    name: 'eth0',
                    ipAddress: '10.0.0.1',
                    prefixLength: 24,
                    macAddress: '00:00:00:00:00:01',
                  },
                ],
              },
            },
            {
              id: 'router-2',
              type: 'router',
              position: { x: 240, y: 80 },
              data: {
                label: 'R2',
                role: 'router',
                layerId: 'l3',
                interfaces: [
                  {
                    id: 'eth1',
                    name: 'eth1',
                    ipAddress: '10.0.1.2',
                    prefixLength: 24,
                    macAddress: '00:00:00:00:00:02',
                  },
                ],
              },
            },
          ],
          edges: [
            {
              id: 'e-warning',
              source: 'router-1',
              target: 'router-2',
              sourceHandle: 'eth0',
              targetHandle: 'eth1',
              type: 'smoothstep',
            },
          ],
        })}
      >
        <NetlabCanvas />
      </NetlabProvider>,
    );

    expect(currentReactFlowProps().edges[0]).toMatchObject({
      style: expect.objectContaining({
        stroke: 'var(--netlab-accent-orange, orange)',
      }),
      data: {
        validationResult: {
          valid: true,
          errors: [],
          warnings: [
            {
              code: 'subnet-mismatch',
              message: 'Subnet mismatch: 10.0.0.1/24 and 10.0.1.2/24 are in different subnets',
            },
          ],
        },
      },
    });
  });

  it('blocks duplicate edges during connection drag validation', () => {
    render(
      <NetlabProvider topology={makeTopology()}>
        <NetlabCanvas />
      </NetlabProvider>,
    );

    expect(
      currentReactFlowProps().isValidConnection?.({
        source: 'n2',
        target: 'n1',
      }),
    ).toBe(false);
  });

  it('styles loaded self-loop edges as invalid', () => {
    render(
      <NetlabProvider
        topology={makeTopology({
          edges: [
            {
              id: 'e-self',
              source: 'n1',
              target: 'n1',
              type: 'smoothstep',
            },
          ],
        })}
      >
        <NetlabCanvas />
      </NetlabProvider>,
    );

    expect(currentReactFlowProps().edges[0]).toMatchObject({
      style: expect.objectContaining({
        stroke: 'var(--netlab-accent-red)',
      }),
    });
  });
});
