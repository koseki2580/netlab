import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NetworkSession } from '../../types/session';
import type { NetworkTopology } from '../../types/topology';
import { SessionList } from './SessionList';

const netlabMock = vi.hoisted(() => ({
  topology: {
    nodes: [],
    edges: [],
    areas: [],
    routeTables: new Map(),
  } as NetworkTopology,
}));

const sessionMock = vi.hoisted(() => ({
  sessions: [] as NetworkSession[],
  selectedSessionId: null as string | null,
  selectSession: vi.fn(),
}));

vi.mock('../NetlabContext', () => ({
  useNetlabContext: () => ({
    topology: netlabMock.topology,
    routeTable: netlabMock.topology.routeTables,
    areas: netlabMock.topology.areas,
    hookEngine: {} as never,
  }),
}));

vi.mock('../../simulation/SessionContext', () => ({
  useSession: () => sessionMock,
}));

function makeTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7' },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 0, y: 0 },
        data: { label: 'Server', role: 'server', layerId: 'l7' },
      },
    ],
    edges: [],
    areas: [],
    routeTables: new Map(),
  };
}

function makeSession(overrides: Partial<NetworkSession> = {}): NetworkSession {
  return {
    sessionId: 'sess-001',
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    protocol: 'HTTP',
    requestType: 'GET /',
    status: 'success',
    createdAt: 100,
    events: [],
    ...overrides,
  };
}

function renderList() {
  return renderToStaticMarkup(<SessionList />);
}

beforeEach(() => {
  netlabMock.topology = makeTopology();
  sessionMock.sessions = [];
  sessionMock.selectedSessionId = null;
  sessionMock.selectSession.mockClear();
});

describe('SessionList — HTTP mode', () => {
  it('renders Method column for HTTP sessions', () => {
    sessionMock.sessions = [
      makeSession({
        httpMeta: { method: 'GET', path: '/users', statusCode: 200 },
      }),
    ];

    const html = renderList();

    expect(html).toContain('GET');
  });

  it('renders Path column for HTTP sessions', () => {
    sessionMock.sessions = [
      makeSession({
        httpMeta: { method: 'POST', path: '/api/data', statusCode: 201 },
      }),
    ];

    const html = renderList();

    expect(html).toContain('/api/data');
  });

  it('renders Status column for HTTP sessions', () => {
    sessionMock.sessions = [
      makeSession({
        httpMeta: { method: 'GET', path: '/', statusCode: 404 },
      }),
    ];

    const html = renderList();

    expect(html).toContain('404');
  });

  it('hides HTTP columns on legacy sessions', () => {
    sessionMock.sessions = [makeSession()];

    const html = renderList();

    // No HTTP-specific data-testid attributes should appear
    expect(html).not.toContain('data-testid="http-method"');
    expect(html).not.toContain('data-testid="http-path"');
    expect(html).not.toContain('data-testid="http-status"');
  });
});
