/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PacketEditForm } from './PacketEditForm';
import type { InFlightPacket, TcpFlags } from '../../types/packets';
import type { PacketTrace, SimulationState } from '../../types/simulation';

const pushEdit = vi.fn();
const setDiffFilter = vi.fn();

vi.mock('../../sandbox/useSandbox', () => ({
  useSandbox: () => ({
    setDiffFilter,
    pushEdit,
    engine: {
      whatIf: {
        getState: () => makeState(),
      },
    },
  }),
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const tcpFlags: TcpFlags = {
  syn: true,
  ack: false,
  fin: false,
  rst: false,
  psh: false,
  urg: false,
};

function makePacket(flags: TcpFlags = tcpFlags): InFlightPacket {
  return {
    id: 'packet-1',
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    currentDeviceId: 'client-1',
    ingressPortId: '',
    path: [],
    timestamp: 0,
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: '10.0.1.10',
        dstIp: '10.0.2.10',
        ttl: 64,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort: 12345,
          dstPort: 80,
          seq: 1,
          ack: 0,
          flags,
          payload: { layer: 'raw', data: '' },
        },
      },
    },
  };
}

function makeTrace(): PacketTrace {
  return {
    packetId: 'trace-1',
    label: 'TCP SYN',
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    status: 'in-flight',
    hops: [
      {
        step: 0,
        nodeId: 'client-1',
        nodeLabel: 'Client',
        srcIp: '10.0.1.10',
        dstIp: '10.0.2.10',
        ttl: 64,
        protocol: 'TCP',
        event: 'create',
        timestamp: 0,
      },
    ],
  };
}

function makeState(): SimulationState {
  return {
    status: 'paused',
    traces: [makeTrace()],
    currentTraceId: 'trace-1',
    currentStep: 0,
    activeEdgeIds: [],
    activePathEdgeIds: [],
    highlightMode: 'path',
    traceColors: {},
    selectedHop: makeTrace().hops[0]!,
    selectedPacket: makePacket(),
    nodeArpTables: {},
    natTables: [],
    connTrackTables: [],
  };
}

function render(ui: React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(ui);
  });
}

describe('PacketEditForm', () => {
  beforeEach(() => {
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    pushEdit.mockReset();
    setDiffFilter.mockReset();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
    container?.remove();
    container = null;
  });

  it('can flip TCP SYN off and RST on through the existing packet flag edit', () => {
    render(<PacketEditForm />);

    act(() => {
      container?.querySelector<HTMLInputElement>('input[aria-label="TCP SYN flag"]')?.click();
      container?.querySelector<HTMLInputElement>('input[aria-label="TCP RST flag"]')?.click();
      Array.from(container?.querySelectorAll('button') ?? [])
        .find((button) => button.textContent === 'Apply TCP flags')
        ?.click();
    });

    expect(setDiffFilter).toHaveBeenCalledWith('packet');
    expect(pushEdit).toHaveBeenCalledWith({
      kind: 'packet.flags.tcp',
      target: { kind: 'packet', traceId: 'trace-1', hopIndex: 0 },
      before: tcpFlags,
      after: { syn: false, ack: false, fin: false, rst: true, psh: false, urg: false },
    });
  });
});
