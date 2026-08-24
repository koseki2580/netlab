/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NETLAB_LIGHT_THEME } from '../theme';
import type { NetlabEdge, NetlabNode, NetworkTopology, TopologySnapshot } from '../types/topology';
import type { GraphConnection, GraphEdgeChange, GraphNodeChange } from '../types/graph';
import { assertDefined } from '../utils';
import { useNetlabContext } from './NetlabContext';
import { NetlabCanvas } from './NetlabCanvas';
import { NetlabProvider } from './NetlabProvider';
import { NetlabThemeScope } from './NetlabThemeScope';
import { FailureContext, type FailureContextValue } from '../simulation/FailureContext';
import { SimulationContext, type SimulationContextValue } from '../simulation/SimulationContext';
import { EMPTY_FAILURE_STATE } from '../types/failure';

// The graph types are netlab's own now, so the tests use them directly rather
// than a parallel set of stand-in shapes that can drift from the real thing.
type MockNode = NetlabNode;
type MockEdge = NetlabEdge;
type MockNodeChange = GraphNodeChange<NetlabNode>;
type MockEdgeChange = GraphEdgeChange<NetlabEdge>;
type MockConnection = GraphConnection;

interface MockEngineProps {
  nodes: MockNode[];
  edges: MockEdge[];
  colorMode?: 'light' | 'dark';
  className?: string;
  fitViewPadding?: number;
  profile?: Record<string, unknown>;
  onNodesChange?: (changes: MockNodeChange[]) => void;
  onEdgesChange?: (changes: MockEdgeChange[]) => void;
  onConnect?: (connection: MockConnection) => void;
  onNodeDragStop?: (node: MockNode, nodes: MockNode[]) => void;
  handleNodeClick?: (node: MockNode) => void;
  selectNode?: (id: string | null) => void;
  selectEdge?: (id: string | null) => void;
  isValidConnection?: (connection: MockConnection) => boolean;
}

const engineState = vi.hoisted(() => ({
  latestProps: null as MockEngineProps | null,
}));

// A stand-in engine, not a mocked graph library. NetlabCanvas's job is to
// decide what to draw and what a change means; the engine is the boundary it
// hands the result to, so that is what these tests drive.
vi.mock('./engine/SimulatorMaxGraph', async () => {
  const React = await import('react');
  return {
    SimulatorMaxGraph: (props: MockEngineProps) => {
      engineState.latestProps = props;
      return React.createElement('div', { 'data-testid': 'netlab-graph-engine' });
    },
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

function currentEngineProps(): MockEngineProps {
  if (!engineState.latestProps) {
    throw new Error('the engine was never handed any props');
  }

  return engineState.latestProps;
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

function makeSimulationContextValue(
  overrides: Partial<SimulationContextValue['state']> = {},
): SimulationContextValue {
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
      activeEdgeIds: [],
      activePathEdgeIds: [],
      highlightMode: 'path',
      traceColors: {},
      selectedHop: null,
      selectedPacket: null,
      nodeArpTables: {},
      natTables: [],
      connTrackTables: [],
      ...overrides,
    },
  };
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  engineState.latestProps = null;
  capturedTopology = null;
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  engineState.latestProps = null;
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

    const props = currentEngineProps();
    expect(props.nodes).toHaveLength(2);
    expect(props.edges).toHaveLength(1);
  });

  it('defaults React Flow to dark color mode', () => {
    render(
      <NetlabProvider topology={makeTopology()}>
        <NetlabCanvas />
      </NetlabProvider>,
    );

    expect(currentEngineProps().colorMode).toBe('dark');
  });

  it('forwards the requested React Flow color mode', () => {
    render(
      <NetlabProvider topology={makeTopology()}>
        <NetlabCanvas colorMode="light" />
      </NetlabProvider>,
    );

    expect(currentEngineProps().colorMode).toBe('light');
  });

  it('inherits React Flow color mode from NetlabThemeScope when the prop is omitted', () => {
    render(
      <NetlabThemeScope theme={NETLAB_LIGHT_THEME}>
        <NetlabProvider topology={makeTopology()}>
          <NetlabCanvas />
        </NetlabProvider>
      </NetlabThemeScope>,
    );

    expect(currentEngineProps().colorMode).toBe('light');
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
      currentEngineProps().onConnect?.({ source: 'n1', target: 'n2' });
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
      currentEngineProps().onEdgesChange?.([{ id: 'e1', type: 'remove' }]);
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
      currentEngineProps().onNodeDragStop?.(movedNode, movedNodes);
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
      currentEngineProps().onConnect?.({ source: 'n1', target: 'n2' });
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
      currentEngineProps().onNodeDragStop?.(movedNode, movedNodes);
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

    expect(currentEngineProps().nodes[0]?.position).toEqual({ x: 50, y: 80 });

    view.rerender(
      <NetlabProvider topology={updated}>
        <NetlabCanvas onTopologyChange={vi.fn()} />
      </NetlabProvider>,
    );

    expect(currentEngineProps().nodes[0]?.position).toEqual({ x: 320, y: 200 });
  });

  it('re-syncs from the topology prop when followTopology is set, even without callbacks', () => {
    const initial = makeTopology();
    const updated = makeTopology({
      nodes: [
        { ...topologyNodeAt(initial, 0), position: { x: 320, y: 200 } },
        topologyNodeAt(initial, 1),
      ],
      // The learning reveal: the edge lights up green and animates.
      edges: [
        {
          id: 'e1',
          source: 'n1',
          target: 'n2',
          type: 'smoothstep',
          animated: true,
          style: { stroke: 'var(--netlab-accent-green)', strokeWidth: 2.5 },
        },
      ],
    });

    const view = render(
      <NetlabProvider topology={initial}>
        <NetlabCanvas followTopology />
      </NetlabProvider>,
    );

    expect(currentEngineProps().nodes[0]?.position).toEqual({ x: 50, y: 80 });
    expect(currentEngineProps().edges[0]?.animated ?? false).toBe(false);

    view.rerender(
      <NetlabProvider topology={updated}>
        <NetlabCanvas followTopology />
      </NetlabProvider>,
    );

    // Display follows the prop: the node moves and the revealed edge now animates
    // with the styling carried on the synced topology edge (strokeWidth 2.5).
    expect(currentEngineProps().nodes[0]?.position).toEqual({ x: 320, y: 200 });
    expect(currentEngineProps().edges[0]?.animated).toBe(true);
    expect(currentEngineProps().edges[0]?.style).toEqual(
      expect.objectContaining({ strokeWidth: 2.5 }),
    );
  });

  it('forwards fitViewPadding to React Flow fitViewOptions (small learning canvases)', () => {
    render(
      <NetlabProvider topology={makeTopology()}>
        <NetlabCanvas fitViewPadding={0.3} />
      </NetlabProvider>,
    );

    expect(currentEngineProps().fitViewPadding).toBe(0.3);
  });

  it('makes the graph non-focusable & non-draggable when interactiveGraph is false', () => {
    render(
      <NetlabProvider topology={makeTopology()}>
        <NetlabCanvas interactiveGraph={false} />
      </NetlabProvider>,
    );
    const profile = currentEngineProps().profile;
    expect(profile?.nodesFocusable).toBe(false);
    expect(profile?.nodesDraggable).toBe(false);
    // Static & scroll-transparent: it must not hijack page scroll / zoom.
    expect(profile?.zoomOnScroll).toBe(false);
    expect(profile?.preventPageScroll).toBe(false);
    expect(profile?.panOnDrag).toBe(false);
    // Lower zoom floor so fitting a wide topology works on a narrow phone.
    expect(profile?.minZoom).toBe(0.2);
  });

  it('keeps the graph keyboard-interactive by default', () => {
    render(
      <NetlabProvider topology={makeTopology()}>
        <NetlabCanvas />
      </NetlabProvider>,
    );
    const profile = currentEngineProps().profile;
    expect(profile?.nodesFocusable).toBe(true);
    expect(profile?.minZoom).toBe(0.5);
  });

  it('stops edge animation under prefers-reduced-motion, including topology reveals', () => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({
      matches: q.includes('reduce'),
      media: q,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    try {
      render(
        <NetlabProvider
          topology={makeTopology({
            // A learning-reveal edge sets `animated` directly on the topology.
            edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'smoothstep', animated: true }],
          })}
        >
          <NetlabCanvas />
        </NetlabProvider>,
      );
      expect(currentEngineProps().edges[0]?.animated).toBe(false);
    } finally {
      window.matchMedia = original;
    }
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

    expect(currentEngineProps().nodes[0]?.position).toEqual({ x: 50, y: 80 });

    view.rerender(
      <NetlabProvider topology={updated}>
        <NetlabCanvas />
      </NetlabProvider>,
    );

    expect(currentEngineProps().nodes[0]?.position).toEqual({ x: 50, y: 80 });
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

    expect(currentEngineProps().edges[0]).toMatchObject({
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
        <SimulationContext.Provider value={makeSimulationContextValue({ activeEdgeIds: ['e1'] })}>
          <NetlabCanvas />
        </SimulationContext.Provider>
      </NetlabProvider>,
    );

    expect(currentEngineProps().edges[0]).toMatchObject({
      animated: true,
      style: expect.objectContaining({
        stroke: 'var(--netlab-accent-cyan)',
        strokeWidth: 2,
      }),
    });
  });

  it('renders the selected trace path with the trace color and emphasizes the current hop', () => {
    render(
      <NetlabProvider
        topology={makeTopology({
          nodes: [
            {
              id: 'n1',
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
              id: 'n2',
              type: 'router',
              position: { x: 240, y: 80 },
              data: {
                label: 'R2',
                role: 'router',
                layerId: 'l3',
                interfaces: [
                  {
                    id: 'eth0',
                    name: 'eth0',
                    ipAddress: '10.0.0.2',
                    prefixLength: 24,
                    macAddress: '00:00:00:00:00:02',
                  },
                  {
                    id: 'eth1',
                    name: 'eth1',
                    ipAddress: '10.0.1.1',
                    prefixLength: 24,
                    macAddress: '00:00:00:00:00:03',
                  },
                ],
              },
            },
            {
              id: 'n3',
              type: 'router',
              position: { x: 430, y: 80 },
              data: {
                label: 'R3',
                role: 'router',
                layerId: 'l3',
                interfaces: [
                  {
                    id: 'eth0',
                    name: 'eth0',
                    ipAddress: '10.0.1.2',
                    prefixLength: 24,
                    macAddress: '00:00:00:00:00:04',
                  },
                ],
              },
            },
          ],
          edges: [
            {
              id: 'e1',
              source: 'n1',
              target: 'n2',
              sourceHandle: 'eth0',
              targetHandle: 'eth0',
              type: 'smoothstep',
            },
            {
              id: 'e2',
              source: 'n2',
              target: 'n3',
              sourceHandle: 'eth1',
              targetHandle: 'eth0',
              type: 'smoothstep',
            },
          ],
        })}
      >
        <SimulationContext.Provider
          value={makeSimulationContextValue({
            currentTraceId: 'trace-1',
            activeEdgeIds: ['e2'],
            activePathEdgeIds: ['e1', 'e2'],
            highlightMode: 'path',
            traceColors: { 'trace-1': 'var(--netlab-accent-orange)' },
          })}
        >
          <NetlabCanvas />
        </SimulationContext.Provider>
      </NetlabProvider>,
    );

    expect(currentEngineProps().edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'e1',
          animated: true,
          style: expect.objectContaining({
            stroke: 'var(--netlab-accent-orange)',
            opacity: 0.45,
            strokeWidth: 2,
          }),
        }),
        expect.objectContaining({
          id: 'e2',
          animated: true,
          style: expect.objectContaining({
            stroke: 'var(--netlab-accent-orange)',
            opacity: 1,
            strokeWidth: 3,
          }),
        }),
      ]),
    );
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

    expect(currentEngineProps().edges[0]).toMatchObject({
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

    expect(currentEngineProps().edges[0]).toMatchObject({
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
      currentEngineProps().isValidConnection?.({
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

    expect(currentEngineProps().edges[0]).toMatchObject({
      style: expect.objectContaining({
        stroke: 'var(--netlab-accent-red)',
      }),
    });
  });
});

describe('NetlabCanvas selection choreography (N2)', () => {
  it('decorates the selected node, 1-hop neighbors, and connecting edge with selection classes', () => {
    render(
      <NetlabProvider
        topology={makeTopology({
          nodes: [
            {
              id: 'r1',
              type: 'router',
              position: { x: 0, y: 0 },
              data: { label: 'R1', role: 'router', layerId: 'l3' },
            },
            {
              id: 'r2',
              type: 'router',
              position: { x: 200, y: 0 },
              data: { label: 'R2', role: 'router', layerId: 'l3' },
            },
            {
              id: 'r3',
              type: 'router',
              position: { x: 400, y: 0 },
              data: { label: 'R3', role: 'router', layerId: 'l3' },
            },
          ],
          edges: [{ id: 'e12', source: 'r1', target: 'r2', type: 'smoothstep' }],
        })}
      >
        <NetlabCanvas />
      </NetlabProvider>,
    );

    // No selection initially — no node gets the selection or neighbor class.
    const initial = currentEngineProps();
    expect(initial.nodes.find((n) => n.id === 'r1')?.className ?? '').not.toContain(
      'netlab-node-selected',
    );
    expect(initial.nodes.find((n) => n.id === 'r2')?.className ?? '').not.toContain(
      'netlab-node-neighbor',
    );

    // Simulate selecting r1.
    const r1Node = initial.nodes.find((n) => n.id === 'r1');
    if (!r1Node) throw new Error('r1 node missing');
    act(() => {
      initial.handleNodeClick?.(r1Node);
    });

    const after = currentEngineProps();
    expect(after.nodes.find((n) => n.id === 'r1')?.className).toContain('netlab-node-selected');
    expect(after.nodes.find((n) => n.id === 'r2')?.className).toContain('netlab-node-neighbor');
    expect(after.nodes.find((n) => n.id === 'r3')?.className ?? '').not.toMatch(/netlab-node-/);
    expect(after.edges.find((e) => e.id === 'e12')?.className).toContain('netlab-edge-neighbor');

    // Clearing the selection (pane click) drops the classes.
    act(() => {
      // Clicking empty canvas: the engine clears both selections.
      after.selectNode?.(null);
      after.selectEdge?.(null);
    });
    const cleared = currentEngineProps();
    expect(cleared.nodes.find((n) => n.id === 'r1')?.className ?? '').not.toContain(
      'netlab-node-selected',
    );
    expect(cleared.edges.find((e) => e.id === 'e12')?.className ?? '').not.toContain(
      'netlab-edge-neighbor',
    );
  });

  it('notifies onNodeSelect on node click and on pane-click clearing', () => {
    const selections: (string | null)[] = [];
    render(
      <NetlabProvider
        topology={makeTopology({
          nodes: [
            {
              id: 'r1',
              type: 'router',
              position: { x: 0, y: 0 },
              data: { label: 'R1', role: 'router', layerId: 'l3' },
            },
            {
              id: 'r2',
              type: 'router',
              position: { x: 200, y: 0 },
              data: { label: 'R2', role: 'router', layerId: 'l3' },
            },
          ],
          edges: [{ id: 'e12', source: 'r1', target: 'r2', type: 'smoothstep' }],
        })}
      >
        <NetlabCanvas onNodeSelect={(id) => selections.push(id)} />
      </NetlabProvider>,
    );

    const initial = currentEngineProps();
    const r2Node = initial.nodes.find((n) => n.id === 'r2');
    if (!r2Node) throw new Error('r2 node missing');
    act(() => {
      initial.handleNodeClick?.(r2Node);
    });
    expect(selections).toEqual(['r2']);

    act(() => {
      const props = currentEngineProps();
      props.selectNode?.(null);
      props.selectEdge?.(null);
    });
    expect(selections).toEqual(['r2', null]);
  });
});
